const { MongoClient, ObjectId } = require('mongodb');

async function checkRoles() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();

    const tenant = await db.collection('tenants').findOne({
      name: 'Early Adopter Inc.'
    });

    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }

    console.log(`\n🏢 Tenant: ${tenant.name}`);
    console.log(`   ID: ${tenant._id}\n`);

    const roles = await db.collection('roles').find({
      tenantId: tenant._id
    }).toArray();

    if (roles.length === 0) {
      console.log('⚠️  No roles found for this tenant\n');
      console.log('Creating a default Admin role...\n');

      // Get all permissions
      const allPermissions = await db.collection('permissions').find({}).toArray();
      const permissionIds = allPermissions.map(p => p._id);

      // Create Admin role
      const result = await db.collection('roles').insertOne({
        tenantId: tenant._id,
        name: 'Admin',
        description: 'Administrator role with full permissions',
        permissions: permissionIds,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`✅ Created Admin role: ${result.insertedId}`);
      console.log(`   Permissions: ${permissionIds.length} total\n`);

    } else {
      console.log(`📋 Roles for this tenant (${roles.length} total):\n`);

      for (const role of roles) {
        console.log(`   Role: ${role.name}`);
        console.log(`   ID: ${role._id}`);
        console.log(`   Description: ${role.description || 'N/A'}`);
        console.log(`   Permissions: ${role.permissions ? role.permissions.length : 0}`);
        console.log(`   System role: ${role.isSystem ? 'YES' : 'NO'}\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkRoles();
