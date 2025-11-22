const { MongoClient, ObjectId } = require('mongodb');

async function setupMarketing() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n🚀 Setting up marketing for Early Adopter Inc.\n');

    // 1. Get tenant
    const tenant = await db.collection('tenants').findOne({
      name: 'Early Adopter Inc.'
    });

    console.log(`✅ Tenant: ${tenant.name} (${tenant._id})`);
    console.log(`   Marketing currently: ${tenant.enabledModules && tenant.enabledModules.marketing ? 'ENABLED' : 'DISABLED'}\n`);

    // 2. Get marketing permissions
    const marketingRead = await db.collection('permissions').findOne({ name: 'marketing_read' });
    const marketingWrite = await db.collection('permissions').findOne({ name: 'marketing_write' });

    console.log(`✅ Marketing permissions found:`);
    console.log(`   marketing_read: ${marketingRead._id}`);
    console.log(`   marketing_write: ${marketingWrite._id}\n`);

    // 3. Get admin role (case insensitive)
    const adminRole = await db.collection('roles').findOne({
      tenantId: tenant._id,
      name: /^admin$/i
    });

    console.log(`✅ Admin role: ${adminRole.name} (${adminRole._id})`);
    console.log(`   Current permissions: ${adminRole.permissions.length}\n`);

    // 4. Check if permissions already added
    const currentPerms = adminRole.permissions.map(p => p.toString());
    const hasMarketingRead = currentPerms.includes(marketingRead._id.toString());
    const hasMarketingWrite = currentPerms.includes(marketingWrite._id.toString());

    console.log(`📊 Current status:`);
    console.log(`   Has marketing_read: ${hasMarketingRead ? 'YES' : 'NO'}`);
    console.log(`   Has marketing_write: ${hasMarketingWrite ? 'YES' : 'NO'}\n`);

    // 5. Add permissions if needed
    if (!hasMarketingRead || !hasMarketingWrite) {
      console.log('🔄 Adding marketing permissions to admin role...');

      const newPermissions = [...adminRole.permissions];
      if (!hasMarketingRead) newPermissions.push(marketingRead._id);
      if (!hasMarketingWrite) newPermissions.push(marketingWrite._id);

      await db.collection('roles').updateOne(
        { _id: adminRole._id },
        {
          $set: {
            permissions: newPermissions,
            updatedAt: new Date()
          }
        }
      );

      console.log(`✅ Added ${!hasMarketingRead && !hasMarketingWrite ? '2' : '1'} new permission(s)\n`);
    } else {
      console.log('ℹ️  Permissions already present\n');
    }

    // 6. Verify final state
    const updatedRole = await db.collection('roles').findOne({ _id: adminRole._id });

    console.log('🎉 SETUP COMPLETE!\n');
    console.log('📊 Final Status:');
    console.log(`   Tenant: ${tenant.name}`);
    console.log(`   Marketing module: ${tenant.enabledModules && tenant.enabledModules.marketing ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    console.log(`   Admin role permissions: ${updatedRole.permissions.length} total`);
    console.log(`   Has marketing_read: ${updatedRole.permissions.some(p => p.toString() === marketingRead._id.toString()) ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Has marketing_write: ${updatedRole.permissions.some(p => p.toString() === marketingWrite._id.toString()) ? 'YES ✅' : 'NO ❌'}\n`);

    console.log('📝 Next steps:');
    console.log('1. Refresh the super-admin page (you should see marketing permissions)');
    console.log('2. Log out from the tenant app');
    console.log('3. Log back in as a user from "Early Adopter Inc."');
    console.log('4. Check sidebar - "Marketing" should appear');
    console.log('5. Click Marketing → Access /marketing page\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

setupMarketing();
