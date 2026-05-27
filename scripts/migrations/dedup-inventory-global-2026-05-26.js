#!/usr/bin/env node
/**
 * Global inventory dedup migration.
 *
 * Per group (tenantId + warehouseId + productId), with at least 2 visible docs:
 *
 * - No-conflict (<=1 doc with qty>0):
 *     Keeper = doc with qty>0, or oldest if all are 0.
 *     Others soft-deleted.
 *
 * - Conflict (>1 doc with qty>0):
 *     Keeper = OLDEST doc with qty>0 (preserves earliest history).
 *     Keeper.totalQuantity     = SUM of totalQuantity of all docs in group.
 *     Keeper.availableQuantity = SUM of availableQuantity of all docs in group.
 *     Keeper.reservedQuantity  = SUM of reservedQuantity of all docs in group.
 *     Keeper.committedQuantity = SUM of committedQuantity of all docs in group.
 *     Keeper.lots              = concatenation of all lots (preserves traceability).
 *     Keeper.averageCostPrice  = weighted average of costs.
 *     Others soft-deleted with consolidatedInto = keeper._id.
 *
 * Soft-deletes carry deletedReason and deletedByMigration markers so they
 * can be reverted by inverting the flag.
 *
 * Usage:
 *   node dedup-inventory-global-2026-05-26.js --dry-run
 *   node dedup-inventory-global-2026-05-26.js --apply
 */
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const APPLY = process.argv.includes('--apply');
const MIGRATION_TAG = 'dedup-inventory-global-2026-05-26';

function num(v) { return typeof v === 'number' && !isNaN(v) ? v : 0; }

function pickKeeperAndSum(docs) {
  const withStock = docs.filter((d) => num(d.totalQuantity) > 0);
  let keeper;
  let isConflict = false;
  if (withStock.length === 0) {
    keeper = docs.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
  } else if (withStock.length === 1) {
    keeper = withStock[0];
  } else {
    isConflict = true;
    keeper = withStock.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
  }

  const sumTotal = docs.reduce((s, d) => s + num(d.totalQuantity), 0);
  const sumAvail = docs.reduce((s, d) => s + num(d.availableQuantity), 0);
  const sumReserved = docs.reduce((s, d) => s + num(d.reservedQuantity), 0);
  const sumCommitted = docs.reduce((s, d) => s + num(d.committedQuantity), 0);
  const allLots = docs.flatMap((d) => Array.isArray(d.lots) ? d.lots : []);

  // Weighted average cost: sum(qty*avgCost)/sum(qty), fallback to keeper's cost
  let avgCost = num(keeper.averageCostPrice);
  if (sumTotal > 0) {
    const weighted = docs.reduce((s, d) => s + num(d.totalQuantity) * num(d.averageCostPrice), 0);
    avgCost = weighted / sumTotal;
  }
  const lastCost = docs.reduce((latest, d) => {
    if (!d.updatedAt) return latest;
    if (!latest || new Date(d.updatedAt) > new Date(latest.updatedAt)) return d;
    return latest;
  }, null);

  return {
    keeper,
    isConflict,
    consolidated: {
      totalQuantity: sumTotal,
      availableQuantity: sumAvail,
      reservedQuantity: sumReserved,
      committedQuantity: sumCommitted,
      averageCostPrice: avgCost,
      lastCostPrice: lastCost ? num(lastCost.lastCostPrice) : num(keeper.lastCostPrice),
      lots: allLots,
    },
  };
}

async function run() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db('test');

  console.log('Scanning all visible inventory docs for duplicate groups...');
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
  console.log('Duplicate groups found:', groups.length);

  // Build plan
  const plan = [];
  let totalSoftDelete = 0;
  let conflictGroups = 0;
  let consolidationGroups = 0;

  for (const g of groups) {
    const { keeper, isConflict, consolidated } = pickKeeperAndSum(g.docs);
    const toDelete = g.docs.filter((d) => String(d._id) !== String(keeper._id));
    totalSoftDelete += toDelete.length;
    if (isConflict) {
      conflictGroups++;
      consolidationGroups++;
    }

    // Resolve tenant name on the fly is too slow per row; skip.
    plan.push({
      group: g._id,
      isConflict,
      keeper: {
        _id: keeper._id,
        sku: keeper.productSku,
        variantId: keeper.variantId,
        prevQty: num(keeper.totalQuantity),
        prevAvail: num(keeper.availableQuantity),
        createdAt: keeper.createdAt,
      },
      newKeeperValues: isConflict ? consolidated : null,
      delete: toDelete.map((d) => ({
        _id: d._id,
        qty: num(d.totalQuantity),
        avail: num(d.availableQuantity),
        sku: d.productSku,
        variantId: d.variantId,
        createdAt: d.createdAt,
      })),
    });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, '_logs');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `dedup-global-${APPLY ? 'apply' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY_RUN',
    timestamp: new Date().toISOString(),
    migrationTag: MIGRATION_TAG,
    summary: {
      groups: groups.length,
      softDeletes: totalSoftDelete,
      conflictGroups,
      consolidationGroups,
    },
    plan,
  }, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log('Groups with duplicates:', groups.length);
  console.log('Docs to soft-delete:', totalSoftDelete);
  console.log('Conflict groups (will SUM quantities into keeper):', conflictGroups);
  console.log('Plan written to:', out);

  // Per-tenant breakdown
  const byTenant = {};
  for (const p of plan) {
    const t = p.group.tenantId;
    byTenant[t] = byTenant[t] || { groups: 0, deletes: 0, conflicts: 0 };
    byTenant[t].groups++;
    byTenant[t].deletes += p.delete.length;
    if (p.isConflict) byTenant[t].conflicts++;
  }
  console.log('\nPer tenant:');
  for (const [t, s] of Object.entries(byTenant)) {
    const tenant = await db.collection('tenants').findOne({
      $or: [{ _id: new ObjectId(t) }, { _id: t }],
    }).catch(() => null);
    console.log('  ' + (tenant?.name || t.slice(-8)) + ': groups=' + s.groups + ', deletes=' + s.deletes + ', conflicts=' + s.conflicts);
  }

  // Show first 5 conflict groups in detail
  console.log('\n=== CONFLICT GROUPS (first 10) ===');
  const conflicts = plan.filter((p) => p.isConflict).slice(0, 10);
  for (const c of conflicts) {
    console.log('\nTenant:', c.group.tenantId.slice(-8), '| wh:', c.group.warehouseId.slice(-8), '| product:', c.keeper.sku);
    console.log('  Keeper: _id=' + String(c.keeper._id).slice(-8) + ' prevQty=' + c.keeper.prevQty + ' -> newQty=' + c.newKeeperValues.totalQuantity);
    for (const d of c.delete) {
      console.log('    consolidates: _id=' + String(d._id).slice(-8) + ' qty=' + d.qty + ' (will be soft-deleted)');
    }
  }

  if (!APPLY) {
    console.log('\n(DRY-RUN — no writes. Pass --apply to execute.)');
    await client.close();
    return;
  }

  // APPLY
  console.log('\nApplying...');
  let updatedKeepers = 0;
  let softDeleted = 0;
  for (const p of plan) {
    // 1) Update keeper if conflict
    if (p.isConflict) {
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
      updatedKeepers++;
    }
    // 2) Soft-delete the rest
    const ids = p.delete.map((d) => new ObjectId(String(d._id)));
    if (ids.length > 0) {
      const res = await db.collection('inventories').updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedReason: 'duplicate-cleanup-2026-05-26',
            deletedByMigration: MIGRATION_TAG,
            ...(p.isConflict ? { consolidatedInto: new ObjectId(String(p.keeper._id)) } : {}),
          },
        },
      );
      softDeleted += res.modifiedCount;
    }
  }
  console.log('Keepers updated (conflict consolidations):', updatedKeepers);
  console.log('Docs soft-deleted:', softDeleted);

  await client.close();
}

run().catch((e) => { console.error('Error:', e.message); process.exit(1); });
