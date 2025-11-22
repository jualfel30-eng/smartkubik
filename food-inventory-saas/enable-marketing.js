const { MongoClient, ObjectId } = require('mongodb');

async function enableMarketing() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();

    // 1. Buscar el tenant Early Adopter Inc.
    console.log('🔍 Searching for Early Adopter Inc. tenant...');
    const tenant = await db.collection('tenants').findOne({
      name: 'Early Adopter Inc.'
    });

    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.name} (${tenant._id})\n`);

    // 2. Habilitar módulo de marketing
    console.log('🔄 Enabling marketing module...');
    await db.collection('tenants').updateOne(
      { _id: tenant._id },
      { $set: { 'enabledModules.marketing': true } }
    );
    console.log('✅ Marketing module enabled\n');

    // 3. Buscar permisos de marketing
    console.log('🔍 Getting marketing permissions...');
    const marketingRead = await db.collection('permissions').findOne({
      name: 'marketing_read'
    });
    const marketingWrite = await db.collection('permissions').findOne({
      name: 'marketing_write'
    });

    if (!marketingRead || !marketingWrite) {
      console.log('❌ Marketing permissions not found in database');
      return;
    }

    console.log(`✅ Found marketing_read: ${marketingRead._id}`);
    console.log(`✅ Found marketing_write: ${marketingWrite._id}\n`);

    // 4. Buscar rol Admin del tenant
    console.log('🔍 Searching for Admin role...');
    const adminRole = await db.collection('roles').findOne({
      tenantId: tenant._id,
      name: 'Admin'
    });

    if (!adminRole) {
      console.log('❌ Admin role not found for this tenant');
      return;
    }

    console.log(`✅ Found Admin role: ${adminRole._id}\n`);

    // 5. Verificar si ya tiene los permisos
    const currentPermissions = adminRole.permissions || [];
    const hasMarketingRead = currentPermissions.some(p =>
      p.toString() === marketingRead._id.toString()
    );
    const hasMarketingWrite = currentPermissions.some(p =>
      p.toString() === marketingWrite._id.toString()
    );

    if (hasMarketingRead && hasMarketingWrite) {
      console.log('ℹ️  Admin role already has marketing permissions\n');
    } else {
      // 6. Agregar permisos al rol Admin
      console.log('🔄 Adding marketing permissions to Admin role...');

      const newPermissions = [...currentPermissions];
      if (!hasMarketingRead) {
        newPermissions.push(marketingRead._id);
      }
      if (!hasMarketingWrite) {
        newPermissions.push(marketingWrite._id);
      }

      await db.collection('roles').updateOne(
        { _id: adminRole._id },
        { $set: { permissions: newPermissions } }
      );

      console.log('✅ Marketing permissions added to Admin role\n');
    }

    // 7. Verificar el resultado final
    console.log('📊 Final Status:');
    const updatedTenant = await db.collection('tenants').findOne({ _id: tenant._id });
    const updatedRole = await db.collection('roles').findOne({ _id: adminRole._id });

    console.log(`   Tenant: ${updatedTenant.name}`);
    console.log(`   Marketing enabled: ${updatedTenant.enabledModules.marketing ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Admin role permissions: ${updatedRole.permissions.length} total`);
    console.log(`   Has marketing_read: ${updatedRole.permissions.some(p => p.toString() === marketingRead._id.toString()) ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Has marketing_write: ${updatedRole.permissions.some(p => p.toString() === marketingWrite._id.toString()) ? 'YES ✅' : 'NO ❌'}\n`);

    console.log('🎉 Setup completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Log out from the app');
    console.log('2. Log back in as a user from "Early Adopter Inc." tenant');
    console.log('3. You should now see "Marketing" in the sidebar menu');
    console.log('4. Click on it to access /marketing\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

enableMarketing();
