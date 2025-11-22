const { MongoClient } = require('mongodb');

async function verify() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();

    // Verificar todos los permisos
    const allPermissions = await db.collection('permissions').find({}).toArray();
    console.log(`\n📊 Total permissions in database: ${allPermissions.length}\n`);

    // Verificar permisos de marketing
    const marketingPerms = await db.collection('permissions').find({
      name: { $in: ['marketing_read', 'marketing_write'] }
    }).toArray();

    console.log('🎯 Marketing Permissions:');
    marketingPerms.forEach(p => {
      console.log(`   ✅ ${p.name}`);
      console.log(`      ID: ${p._id}`);
      console.log(`      Category: ${p.category}`);
      console.log(`      Description: ${p.description}\n`);
    });

    // Verificar tenant earlyadopter
    const tenant = await db.collection('tenants').findOne({
      name: /earlyadopter/i
    });

    if (tenant) {
      console.log('🏢 Tenant "earlyadopter" found:');
      console.log(`   ID: ${tenant._id}`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   Marketing enabled: ${tenant.enabledModules && tenant.enabledModules.marketing ? 'true' : 'false'}`);
      console.log(`   Chat enabled: ${tenant.enabledModules && tenant.enabledModules.chat ? 'true' : 'false'}\n`);
    } else {
      console.log('⚠️  Tenant "earlyadopter" not found\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

verify();
