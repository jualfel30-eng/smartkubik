#!/usr/bin/env node
/**
 * Orphan inventory cleanup.
 *
 * Soft-deletes visible inventory records that:
 *   - point to a productId that no longer exists in `products`, AND
 *   - have totalQuantity = 0.
 *
 * Inventories with stock > 0 are LEFT UNTOUCHED — those are real value
 * trapped on deleted products and need a manual recovery decision.
 *
 * Usage:
 *   node orphan-inventory-cleanup-2026-05-27.js --dry-run
 *   node orphan-inventory-cleanup-2026-05-27.js --apply
 */
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const APPLY = process.argv.includes('--apply');
const MIGRATION_TAG = 'orphan-inventory-cleanup-2026-05-27';

const toObjectIdMaybe = (v) => { try { return new ObjectId(String(v)); } catch { return v; } };

async function run() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db('test');

  console.log('Loading visible inventories...');
  const allVisible = await db.collection('inventories').find(
    { isDeleted: { $ne: true } },
    { projection: { _id: 1, productId: 1, productSku: 1, productName: 1, tenantId: 1, totalQuantity: 1, warehouseId: 1, variantId: 1, variantSku: 1, createdAt: 1 } },
  ).toArray();

  const distinctProductIds = [...new Set(allVisible.map((i) => String(i.productId)))];
  const products = await db.collection('products').find(
    { _id: { $in: distinctProductIds.map(toObjectIdMaybe) } },
    { projection: { _id: 1, isDeleted: 1 } },
  ).toArray();
  const existing = new Map(products.map((p) => [String(p._id), p]));

  const orphans = allVisible.filter((i) => {
    const p = existing.get(String(i.productId));
    return !p || p.isDeleted === true;
  });

  const orphansZero = orphans.filter((i) => Number(i.totalQuantity || 0) === 0);
  const orphansWithStock = orphans.filter((i) => Number(i.totalQuantity || 0) > 0);

  console.log('Visible inventories total:', allVisible.length);
  console.log('Orphan inventories (product missing or deleted):', orphans.length);
  console.log('  - with stock=0 (will be soft-deleted):', orphansZero.length);
  console.log('  - with stock>0 (UNTOUCHED, manual review):', orphansWithStock.length);

  // Per tenant
  const byTenant = {};
  for (const i of orphansZero) {
    const t = String(i.tenantId);
    byTenant[t] = (byTenant[t] || 0) + 1;
  }
  console.log('\nOrphan-zero per tenant:');
  for (const [t, n] of Object.entries(byTenant).sort((a, b) => b[1] - a[1])) {
    const tenant = await db.collection('tenants').findOne({ $or: [{ _id: toObjectIdMaybe(t) }, { _id: t }] }).catch(() => null);
    console.log('  ' + (tenant?.name || t.slice(-8)) + ': ' + n);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, '_logs');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `orphan-cleanup-${APPLY ? 'apply' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY_RUN',
    timestamp: new Date().toISOString(),
    migrationTag: MIGRATION_TAG,
    summary: { visibleTotal: allVisible.length, orphans: orphans.length, orphansZero: orphansZero.length, orphansWithStock: orphansWithStock.length },
    orphansZero: orphansZero.map((i) => ({ _id: i._id, tenantId: i.tenantId, productId: i.productId, sku: i.productSku, name: i.productName, warehouseId: i.warehouseId, variantId: i.variantId })),
    orphansWithStock: orphansWithStock.map((i) => ({ _id: i._id, tenantId: i.tenantId, productId: i.productId, sku: i.productSku, name: i.productName, qty: i.totalQuantity, warehouseId: i.warehouseId, variantId: i.variantId, createdAt: i.createdAt })),
  }, null, 2));
  console.log('\nPlan written to:', out);

  if (!APPLY) {
    console.log('\n(DRY-RUN — no writes. Pass --apply to execute.)');
    await client.close();
    return;
  }

  console.log('\nApplying soft-deletes...');
  const ids = orphansZero.map((i) => i._id);
  if (ids.length === 0) {
    console.log('Nothing to apply.');
    await client.close();
    return;
  }
  const res = await db.collection('inventories').updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedReason: 'orphan-product-cleanup-2026-05-27',
        deletedByMigration: MIGRATION_TAG,
      },
    },
  );
  console.log('Matched:', res.matchedCount, '| Modified:', res.modifiedCount);

  // Rollback script
  const rollbackPath = path.join(outDir, `orphan-cleanup-rollback-${stamp}.js`);
  fs.writeFileSync(rollbackPath, `#!/usr/bin/env node
// Rollback for orphan inventory cleanup ${stamp}.
const { MongoClient } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI || '${MONGODB_URI}';
(async () => {
  const c = await MongoClient.connect(MONGODB_URI);
  const r = await c.db('test').collection('inventories').updateMany(
    { deletedByMigration: '${MIGRATION_TAG}' },
    { $set: { isDeleted: false }, $unset: { deletedAt: '', deletedReason: '', deletedByMigration: '' } },
  );
  console.log('Reverted:', r.modifiedCount);
  await c.close();
})();
`);
  console.log('Rollback script:', rollbackPath);

  await client.close();
}

run().catch((e) => { console.error('Error:', e.message); process.exit(1); });
