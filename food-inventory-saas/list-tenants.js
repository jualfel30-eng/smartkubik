const { MongoClient } = require('mongodb');

async function listTenants() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();

    const tenants = await db.collection('tenants').find({}).toArray();

    console.log(`\n🏢 Total tenants in database: ${tenants.length}\n`);

    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name}`);
      console.log(`   ID: ${tenant._id}`);
      console.log(`   Vertical: ${tenant.vertical || 'N/A'}`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Marketing enabled: ${tenant.enabledModules && tenant.enabledModules.marketing ? 'YES' : 'NO'}`);
      console.log(`   Chat enabled: ${tenant.enabledModules && tenant.enabledModules.chat ? 'YES' : 'NO'}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

listTenants();
