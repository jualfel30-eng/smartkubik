#!/usr/bin/env node
/**
 * Dedup duplicate inventory records for the 3 Tiendas Broas tenants.
 *
 * Rule per group (tenantId + warehouseId + productId):
 *   - Keep the record with totalQuantity > 0 (only one per group exists today).
 *   - If all records in the group have totalQuantity = 0, keep the oldest.
 *   - Soft-delete the rest with isDeleted=true, deletedReason, deletedAt, deletedByMigration.
 *
 * Usage:
 *   node dedup-broas-inventory-2026-05-26.js --dry-run
 *   node dedup-broas-inventory-2026-05-26.js --apply
 */
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const TENANT_IDS = [
  '69b187062339e815ceba7487', // PARENT
  '69b481c03d5ba33267c3ada0', // SUB1 El Parral
  '69b4a446b8ddae1e2283d188', // SUB2 Periférico
];

const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry-run') || !APPLY;

async function run() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db('test');

  const filter = {
    $or: [
      { tenantId: { $in: TENANT_IDS } },
      { tenantId: { $in: TENANT_IDS.map((id) => new ObjectId(id)) } },
    ],
  };

  const pipeline = [
    { $match: filter },
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
            qty: '$totalQuantity',
            sku: '$productSku',
            variantId: '$variantId',
            variantSku: '$variantSku',
            createdAt: '$createdAt',
            isDeleted: '$isDeleted',
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ];

  const groups = await db.collection('inventories').aggregate(pipeline).toArray();

  const plan = [];
  let toKeep = 0;
  let toSoftDelete = 0;
  let groupsWithConflict = 0;

  for (const g of groups) {
    const docs = g.docs.filter((d) => d.isDeleted !== true);
    if (docs.length <= 1) continue;

    const withStock = docs.filter((d) => Number(d.qty) > 0);
    let keeper;
    if (withStock.length === 1) {
      keeper = withStock[0];
    } else if (withStock.length === 0) {
      keeper = docs.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
    } else {
      groupsWithConflict++;
      plan.push({
        group: g._id,
        action: 'SKIP_CONFLICT',
        reason: `${withStock.length} docs with stock > 0 — manual review needed`,
        docs,
      });
      continue;
    }

    const toDelete = docs.filter((d) => String(d._id) !== String(keeper._id));
    toKeep++;
    toSoftDelete += toDelete.length;

    plan.push({
      group: g._id,
      action: APPLY ? 'SOFT_DELETE' : 'WOULD_SOFT_DELETE',
      keeper: { _id: keeper._id, qty: keeper.qty, sku: keeper.sku, variantId: keeper.variantId, createdAt: keeper.createdAt },
      delete: toDelete.map((d) => ({ _id: d._id, qty: d.qty, sku: d.sku, variantId: d.variantId, createdAt: d.createdAt })),
    });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, '_logs');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `dedup-${APPLY ? 'apply' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(
    out,
    JSON.stringify(
      { mode: APPLY ? 'APPLY' : 'DRY_RUN', timestamp: new Date().toISOString(), summary: { groups: groups.length, toKeep, toSoftDelete, groupsWithConflict }, plan },
      null,
      2,
    ),
  );

  console.log('=== ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' summary ===');
  console.log('Groups with duplicates:', groups.length);
  console.log('Keepers (one per group):', toKeep);
  console.log('Docs to soft-delete:', toSoftDelete);
  console.log('Groups with conflict (skipped):', groupsWithConflict);
  console.log('Plan written to:', out);

  // Per-tenant breakdown
  const byTenant = {};
  for (const p of plan) {
    if (p.action === 'SKIP_CONFLICT') continue;
    const t = p.group.tenantId === TENANT_IDS[0] ? 'PARENT' : p.group.tenantId === TENANT_IDS[1] ? 'SUB1' : 'SUB2';
    byTenant[t] = byTenant[t] || { groups: 0, deletes: 0 };
    byTenant[t].groups++;
    byTenant[t].deletes += p.delete.length;
  }
  console.log('\nPer tenant:');
  for (const [t, s] of Object.entries(byTenant)) {
    console.log('  ' + t + ': groups=' + s.groups + ', soft-delete=' + s.deletes);
  }

  if (APPLY) {
    console.log('\nApplying soft-deletes...');
    const ids = [];
    for (const p of plan) {
      if (p.action !== 'SOFT_DELETE') continue;
      for (const d of p.delete) ids.push(new ObjectId(String(d._id)));
    }
    if (ids.length === 0) {
      console.log('Nothing to apply.');
    } else {
      const res = await db.collection('inventories').updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedReason: 'duplicate-cleanup-2026-05-26',
            deletedByMigration: 'dedup-broas-inventory-2026-05-26',
          },
        },
      );
      console.log('Matched:', res.matchedCount, '| Modified:', res.modifiedCount);
    }
  } else {
    console.log('\n(DRY-RUN — no writes. Pass --apply to execute.)');
  }

  await client.close();
}

run().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
