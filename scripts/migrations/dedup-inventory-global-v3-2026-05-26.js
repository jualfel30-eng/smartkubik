#!/usr/bin/env node
/**
 * Global inventory dedup v3 — classifies conflicts using inventorymovements.
 *
 * Per duplicate group (tenantId + warehouseId + productId):
 *
 * 1) NO_CONFLICT (<=1 doc with qty>0):
 *      Keeper = the doc with qty>0, or oldest if all are 0.
 *      Others soft-deleted.
 *
 * 2) CONFLICT (>1 doc with qty>0). Classified by movement_IN_total vs:
 *      - keeperAlone (qty of oldest doc with stock)
 *      - sumAll (sum of all duplicate doc qtys)
 *
 *    a) CONSERVE_ONE: keeperAlone ≈ IN total (or IN total = 0 → ghost dups).
 *       Keeper = oldest doc with qty>0. Others soft-deleted, NO sum.
 *    b) SUM: sumAll ≈ IN total. Real purchases scattered across duplicates.
 *       Keeper = oldest doc with qty>0. Quantities consolidated (summed).
 *    c) REVIEW: neither matches. Group SKIPPED — needs manual decision.
 *
 * Usage:
 *   node dedup-inventory-global-v3-2026-05-26.js --dry-run
 *   node dedup-inventory-global-v3-2026-05-26.js --apply
 */
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const APPLY = process.argv.includes('--apply');
const MIGRATION_TAG = 'dedup-inventory-global-v3-2026-05-26';

const num = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);

async function getMovementInTotal(db, tenantId, warehouseId, productId) {
  const tFilter = { $or: [{ tenantId: new ObjectId(tenantId) }, { tenantId }] };
  const pFilter = { $or: [{ productId: new ObjectId(productId) }, { productId }] };
  const filter = {
    ...tFilter,
    $and: [
      pFilter,
      ...(warehouseId && warehouseId !== 'null' && warehouseId !== 'undefined'
        ? [{ $or: [{ warehouseId: new ObjectId(warehouseId) }, { warehouseId }] }]
        : []),
      { $or: [{ movementType: { $in: ['IN', 'in'] } }, { type: { $in: ['IN', 'in'] } }] },
    ],
  };
  const moves = await db.collection('inventorymovements').find(filter).toArray();
  return moves.reduce((s, m) => s + num(m.quantity), 0);
}

function classifyConflict(keeperAlone, sumAll, inTotal) {
  const diffAlone = Math.abs(inTotal - keeperAlone);
  const diffSum = Math.abs(inTotal - sumAll);
  const tolAlone = Math.max(1, keeperAlone * 0.05);
  const tolSum = Math.max(1, sumAll * 0.05);
  if (inTotal === 0) return 'CONSERVE_ONE';                           // no movements = ghost dups
  if (diffAlone <= tolAlone && diffSum > diffAlone) return 'CONSERVE_ONE';
  if (diffSum <= tolSum && diffAlone > diffSum) return 'SUM';
  return 'REVIEW';
}

async function run() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db('test');

  console.log('Scanning duplicate groups...');
  const pipeline = [
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: {
          tenantId: { $toString: '$tenantId' },
          warehouseId: { $toString: '$warehouseId' },
          productId: { $toString: '$productId' },
        },
        count: { $sum: 1 },
        docs: {
          $push: {
            _id: '$_id',
            totalQuantity: '$totalQuantity',
            availableQuantity: '$availableQuantity',
            reservedQuantity: '$reservedQuantity',
            committedQuantity: '$committedQuantity',
            averageCostPrice: '$averageCostPrice',
            lastCostPrice: '$lastCostPrice',
            lots: '$lots',
            productSku: '$productSku',
            variantId: '$variantId',
            variantSku: '$variantSku',
            createdAt: '$createdAt',
            updatedAt: '$updatedAt',
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ];

  const groups = await db.collection('inventories').aggregate(pipeline).toArray();
  console.log('Duplicate groups:', groups.length);

  const plan = [];
  const counts = { NO_CONFLICT: 0, CONSERVE_ONE: 0, SUM: 0, REVIEW: 0 };
  let softDeletes = 0;
  let keeperUpdates = 0;

  for (const g of groups) {
    const docs = g.docs.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const withStock = docs.filter((d) => num(d.totalQuantity) > 0);

    let action, keeper, newKeeperValues = null;

    if (withStock.length <= 1) {
      action = 'NO_CONFLICT';
      keeper = withStock[0] || docs[0];
    } else {
      const keeperCandidate = withStock[0];
      const keeperAlone = num(keeperCandidate.totalQuantity);
      const sumAll = docs.reduce((s, d) => s + num(d.totalQuantity), 0);
      const inTotal = await getMovementInTotal(db, g._id.tenantId, g._id.warehouseId, g._id.productId);
      action = classifyConflict(keeperAlone, sumAll, inTotal);

      if (action === 'REVIEW') {
        plan.push({
          group: g._id,
          action,
          reason: 'Movement IN total (' + inTotal + ') matches neither keeperAlone (' + keeperAlone + ') nor sumAll (' + sumAll + ')',
          docs: docs.map(d => ({ _id: d._id, qty: num(d.totalQuantity), sku: d.productSku, createdAt: d.createdAt })),
        });
        counts.REVIEW++;
        continue;
      }

      keeper = keeperCandidate;

      if (action === 'SUM') {
        const sumAvail = docs.reduce((s, d) => s + num(d.availableQuantity), 0);
        const sumReserved = docs.reduce((s, d) => s + num(d.reservedQuantity), 0);
        const sumCommitted = docs.reduce((s, d) => s + num(d.committedQuantity), 0);
        const allLots = docs.flatMap((d) => (Array.isArray(d.lots) ? d.lots : []));
        const totalQ = sumAll;
        const weighted = docs.reduce((s, d) => s + num(d.totalQuantity) * num(d.averageCostPrice), 0);
        const avgCost = totalQ > 0 ? weighted / totalQ : num(keeper.averageCostPrice);
        const lastByUpdate = docs.slice().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
        newKeeperValues = {
          totalQuantity: totalQ,
          availableQuantity: sumAvail,
          reservedQuantity: sumReserved,
          committedQuantity: sumCommitted,
          averageCostPrice: avgCost,
          lastCostPrice: num(lastByUpdate.lastCostPrice),
          lots: allLots,
        };
      }
    }

    const toDelete = docs.filter((d) => String(d._id) !== String(keeper._id));
    softDeletes += toDelete.length;
    if (newKeeperValues) keeperUpdates++;
    counts[action]++;

    plan.push({
      group: g._id,
      action,
      keeper: {
        _id: keeper._id,
        sku: keeper.productSku,
        variantId: keeper.variantId,
        prevQty: num(keeper.totalQuantity),
        createdAt: keeper.createdAt,
      },
      newKeeperValues,
      delete: toDelete.map((d) => ({ _id: d._id, qty: num(d.totalQuantity), sku: d.productSku, createdAt: d.createdAt })),
    });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, '_logs');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `dedup-v3-${APPLY ? 'apply' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(
    out,
    JSON.stringify(
      { mode: APPLY ? 'APPLY' : 'DRY_RUN', timestamp: new Date().toISOString(), migrationTag: MIGRATION_TAG, summary: { groups: groups.length, ...counts, softDeletes, keeperUpdates }, plan },
      null,
      2,
    ),
  );

  console.log('\n=== SUMMARY ===');
  console.log('Total groups:', groups.length);
  console.log('  NO_CONFLICT:', counts.NO_CONFLICT);
  console.log('  CONSERVE_ONE (descartar duplicados):', counts.CONSERVE_ONE);
  console.log('  SUM (consolidar suma):', counts.SUM);
  console.log('  REVIEW (NO TOCAR):', counts.REVIEW);
  console.log('Soft-deletes total:', softDeletes);
  console.log('Keeper consolidations (SUM groups):', keeperUpdates);
  console.log('Plan written to:', out);

  if (!APPLY) {
    console.log('\n(DRY-RUN — no writes. Pass --apply to execute.)');
    await client.close();
    return;
  }

  console.log('\nApplying...');
  let applied = 0;
  for (const p of plan) {
    if (p.action === 'REVIEW') continue;
    if (p.action === 'SUM' && p.newKeeperValues) {
      await db.collection('inventories').updateOne(
        { _id: new ObjectId(String(p.keeper._id)) },
        {
          $set: {
            totalQuantity: p.newKeeperValues.totalQuantity,
            availableQuantity: p.newKeeperValues.availableQuantity,
            reservedQuantity: p.newKeeperValues.reservedQuantity,
            committedQuantity: p.newKeeperValues.committedQuantity,
            averageCostPrice: p.newKeeperValues.averageCostPrice,
            lastCostPrice: p.newKeeperValues.lastCostPrice,
            lots: p.newKeeperValues.lots,
            consolidatedFromCount: p.delete.length,
            consolidatedByMigration: MIGRATION_TAG,
            consolidatedAt: new Date(),
          },
        },
      );
    }
    const ids = p.delete.map((d) => new ObjectId(String(d._id)));
    if (ids.length > 0) {
      const res = await db.collection('inventories').updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedReason: 'duplicate-cleanup-v3-2026-05-26',
            deletedByMigration: MIGRATION_TAG,
            deletedAction: p.action,
            ...(p.action === 'SUM' ? { consolidatedInto: new ObjectId(String(p.keeper._id)) } : {}),
          },
        },
      );
      applied += res.modifiedCount;
    }
  }
  console.log('Docs soft-deleted:', applied);
  console.log('REVIEW groups (untouched):', counts.REVIEW, '— check the plan JSON for details.');

  await client.close();
}

run().catch((e) => { console.error('Error:', e.message); process.exit(1); });
