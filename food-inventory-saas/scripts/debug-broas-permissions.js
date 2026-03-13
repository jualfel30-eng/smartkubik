const { MongoClient, ObjectId } = require('mongodb');

async function debug() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');

    // 1. Check if the new permissions exist
    const newPerms = ['locations_read', 'locations_write', 'transfer_orders_read', 'transfer_orders_write', 'transfer_orders_approve'];
    const perms = await db.collection('permissions').find({ name: { $in: newPerms } }).toArray();
    console.log('\n=== NEW PERMISSIONS IN DB ===');
    perms.forEach(p => console.log(`  ${p.name} (${p._id}) | module: ${p.module}`));
    const missingPerms = newPerms.filter(n => !perms.find(p => p.name === n));
    if (missingPerms.length > 0) {
      console.log(`  ⚠️ MISSING: ${missingPerms.join(', ')}`);
    }

    // 2. Check user's membership and role for the main Broas tenant
    const user = await db.collection('users').findOne({ email: 'broas.admon@gmail.com' });
    const mainTenantId = new ObjectId('69b187062339e815ceba7487'); // Tiendas Broas, C.A.
    const membership = await db.collection('usertenantmemberships').findOne({
      userId: user._id,
      tenantId: mainTenantId
    });
    console.log(`\n=== MEMBERSHIP FOR MAIN BROAS TENANT ===`);
    console.log(`  RoleId: ${membership.roleId}`);

    // 3. Check the role
    const role = await db.collection('roles').findOne({ _id: membership.roleId });
    console.log(`\n=== ROLE: ${role.name} (${role._id}) ===`);
    console.log(`  TenantId: ${role.tenantId}`);
    console.log(`  Total permissions: ${role.permissions?.length || 0}`);

    // 4. Check if this role has the new permissions
    const permIds = perms.map(p => p._id.toString());
    const rolePermIds = (role.permissions || []).map(id => id.toString());

    console.log('\n=== PERMISSION CHECK ===');
    for (const perm of perms) {
      const has = rolePermIds.includes(perm._id.toString());
      console.log(`  ${has ? '✅' : '❌'} ${perm.name}: ${has ? 'YES' : 'NO'}`);
    }

    // 5. Also check all admin/super_admin roles across ALL tenants
    console.log('\n=== ALL ADMIN ROLES WITH NEW PERMS ===');
    const adminRoles = await db.collection('roles').find({ name: { $in: ['admin', 'super_admin'] } }).toArray();
    for (const r of adminRoles) {
      const rPermIds = (r.permissions || []).map(id => id.toString());
      const hasLocRead = rPermIds.includes(perms.find(p => p.name === 'locations_read')?._id?.toString());
      const hasTransRead = rPermIds.includes(perms.find(p => p.name === 'transfer_orders_read')?._id?.toString());
      console.log(`  ${r.name} (tenant: ${r.tenantId}) | locations_read: ${hasLocRead ? '✅' : '❌'} | transfer_orders_read: ${hasTransRead ? '✅' : '❌'}`);
    }

    // 6. Check if the Broas role is admin or has a different name
    console.log(`\n=== BROAS ROLE DETAILS ===`);
    console.log(`  Name: "${role.name}"`);
    console.log(`  Is it named "admin" or "super_admin"? ${['admin', 'super_admin'].includes(role.name) ? 'YES' : 'NO'}`);

  } finally {
    await client.close();
  }
}

debug().catch(console.error);
