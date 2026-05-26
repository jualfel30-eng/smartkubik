import { MongoClient, ObjectId } from 'mongodb';

const IDENTIFIER = process.argv[2];
if (!IDENTIFIER) {
  console.error('Usage: ts-node inspect.ts <email|_id|slug|name>');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const COLLECTIONS = ['products', 'inventory', 'orders', 'customers', 'suppliers', 'warehouses', 'users'];

async function run() {
  const sanitizedUri = MONGODB_URI!.replace(/:([^@]+)@/, ':***@');
  console.log(`Connecting to: ${sanitizedUri}`);

  const client = await MongoClient.connect(MONGODB_URI!);
  const db = client.db('test');

  let tenant: any = null;

  // Resolve identifier
  const isObjectId = /^[a-f0-9]{24}$/i.test(IDENTIFIER);
  const isEmail = IDENTIFIER.includes('@');

  if (isObjectId) {
    tenant = await db.collection('tenants').findOne({ _id: new ObjectId(IDENTIFIER) });
  } else if (isEmail) {
    const user = await db.collection('users').findOne({ email: IDENTIFIER.toLowerCase() });
    if (!user) {
      console.error(`No user found with email: ${IDENTIFIER}`);
      await client.close();
      process.exit(1);
    }
    const tenantId = user.tenantId;
    tenant = await db.collection('tenants').findOne({
      $or: [
        { _id: typeof tenantId === 'string' ? new ObjectId(tenantId) : tenantId },
        { _id: tenantId },
      ],
    });
  } else {
    // Try slug first, then name regex
    tenant = await db.collection('tenants').findOne({ slug: IDENTIFIER });
    if (!tenant) {
      const results = await db.collection('tenants').find({ name: { $regex: IDENTIFIER, $options: 'i' } }).toArray();
      if (results.length > 1) {
        console.warn(`Found ${results.length} tenants matching name "${IDENTIFIER}":`);
        results.forEach(t => console.log(`  - ${t.name} (${t._id})`));
        await client.close();
        process.exit(1);
      }
      tenant = results[0] || null;
    }
  }

  if (!tenant) {
    console.error(`Tenant not found for identifier: ${IDENTIFIER}`);
    await client.close();
    process.exit(1);
  }

  const tenantId = tenant._id;
  const tenantIdStr = tenantId.toString();

  // Build tenantId filter handling both ObjectId and string stored values
  const tenantFilter = { $or: [{ tenantId: tenantId }, { tenantId: tenantIdStr }] };

  // Count by collection
  const counts: Record<string, number> = {};
  for (const col of COLLECTIONS) {
    counts[col] = await db.collection(col).countDocuments(tenantFilter);
  }

  // Warehouses detail
  const warehouses = await db.collection('warehouses').find(tenantFilter).toArray();

  // Last admin login
  const adminUser = await db.collection('users').findOne(
    { ...tenantFilter, email: IDENTIFIER.includes('@') ? IDENTIFIER.toLowerCase() : { $exists: true } },
    { sort: { lastLoginAt: -1 } }
  );

  // Resolve parent tenant if subsidiary
  let parentTenant: any = null;
  if (tenant.parentTenantId) {
    parentTenant = await db.collection('tenants').findOne({
      $or: [
        { _id: typeof tenant.parentTenantId === 'string' ? new ObjectId(tenant.parentTenantId) : tenant.parentTenantId },
        { _id: tenant.parentTenantId },
      ],
    });
  }

  await client.close();

  // Output
  console.log(`\n## Tenant: ${tenant.name}`);
  console.log(`- _id: ${tenantId}`);
  console.log(`- slug: ${tenant.slug || '(none)'}`);
  console.log(`- plan: ${tenant.subscriptionPlan || '(none)'}`);
  console.log(`- created: ${tenant.createdAt ? new Date(tenant.createdAt).toISOString().split('T')[0] : '(unknown)'}`);
  console.log(`- status: ${tenant.status}`);
  console.log(`- isSubsidiary: ${tenant.isSubsidiary ?? false}`);
  console.log(`- parentTenantId: ${tenant.parentTenantId ?? '(none)'}`);
  if (parentTenant) {
    console.log(`- parentTenant name: ${parentTenant.name} (${parentTenant._id})`);
  }
  console.log(`- modules: ${(tenant.enabledModules || []).join(', ') || '(none)'}`);
  console.log(`- vertical: ${tenant.vertical ?? '(none)'}`);
  console.log(`- businessType: ${tenant.businessType ?? '(none)'}`);
  console.log(`- verticalProfile.key: ${tenant.verticalProfile?.key ?? '(none)'}`);
  if (tenant.verticalProfile?.overrides) {
    console.log(`- verticalProfile.overrides: ${JSON.stringify(tenant.verticalProfile.overrides)}`);
  }

  console.log(`\n### Counts (tenantId scoped)`);
  console.log('| Collection | Count |');
  console.log('|---|---|');
  for (const [col, count] of Object.entries(counts)) {
    console.log(`| ${col} | ${count.toLocaleString()} |`);
  }

  console.log(`\n### Warehouses`);
  if (warehouses.length === 0) {
    console.log('(none)');
  } else {
    for (const w of warehouses) {
      console.log(`- ${w.name}${w.isDefault ? ' (default)' : ''} — ${w._id}`);
    }
  }

  console.log(`\n### Last admin login`);
  if (adminUser?.lastLoginAt) {
    console.log(`- ${adminUser.email} — ${new Date(adminUser.lastLoginAt).toISOString().replace('T', ' ').slice(0, 16)} UTC`);
  } else {
    console.log('- (no login recorded)');
  }
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
