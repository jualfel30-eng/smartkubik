const { MongoClient, ObjectId } = require('mongodb');

async function checkMarketingPermissions() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n🔍 Checking Marketing Permissions Setup\n');

    // 1. Get tenant
    const tenant = await db.collection('tenants').findOne({
      name: 'Early Adopter Inc.'
    });

    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }

    console.log(`✅ Tenant: ${tenant.name}`);
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Marketing enabled: ${tenant.enabledModules && tenant.enabledModules.marketing ? 'YES ✅' : 'NO ❌'}\n`);

    // 2. Get marketing permissions
    const marketingRead = await db.collection('permissions').findOne({ name: 'marketing_read' });
    const marketingWrite = await db.collection('permissions').findOne({ name: 'marketing_write' });

    console.log(`📋 Marketing Permissions:`);
    console.log(`   marketing_read: ${marketingRead ? marketingRead._id : 'NOT FOUND ❌'}`);
    console.log(`   marketing_write: ${marketingWrite ? marketingWrite._id : 'NOT FOUND ❌'}\n`);

    // 3. Get all roles for this tenant
    const roles = await db.collection('roles').find({
      tenantId: tenant._id
    }).toArray();

    console.log(`👥 Roles for this tenant (${roles.length} total):\n`);

    for (const role of roles) {
      console.log(`   Role: ${role.name}`);
      console.log(`   ID: ${role._id}`);
      console.log(`   Permissions count: ${role.permissions ? role.permissions.length : 0}`);

      if (marketingRead && marketingWrite) {
        const hasMarketingRead = role.permissions.some(p => p.toString() === marketingRead._id.toString());
        const hasMarketingWrite = role.permissions.some(p => p.toString() === marketingWrite._id.toString());

        console.log(`   Has marketing_read: ${hasMarketingRead ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   Has marketing_write: ${hasMarketingWrite ? 'YES ✅' : 'NO ❌'}`);
      }
      console.log('');
    }

    // 4. Get all permissions to see their names
    console.log('📊 All Permissions in Role:\n');
    const adminRole = roles.find(r => r.name.toLowerCase() === 'admin');
    if (adminRole && adminRole.permissions) {
      const permissionDetails = await db.collection('permissions').find({
        _id: { $in: adminRole.permissions }
      }).toArray();

      permissionDetails.forEach(p => {
        console.log(`   ✅ ${p.name} (${p.category})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

checkMarketingPermissions();
