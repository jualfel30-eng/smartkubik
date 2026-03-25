/**
 * Enable MULTI_WAREHOUSE feature for E2E tenant
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb+srv://admin_user:Admin123@smartkubik.nkogv.mongodb.net/test?retryWrites=true&w=majority';
const DB_NAME = 'test';
const E2E_TENANT_ID = '69c35984ffb749a6ea39fcc7';

async function run() {
  const client = await MongoClient.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  try {
    const db = client.db(DB_NAME);
    const tenantsCollection = db.collection('tenants');

    // Enable MULTI_WAREHOUSE feature
    const result = await tenantsCollection.updateOne(
      { _id: new ObjectId(E2E_TENANT_ID) },
      {
        $set: {
          'features.MULTI_WAREHOUSE': true,
        },
      }
    );

    console.log(`✓ Enabled MULTI_WAREHOUSE feature: ${result.modifiedCount} tenant modified`);

    // Verify
    const tenant = await tenantsCollection.findOne(
      { _id: new ObjectId(E2E_TENANT_ID) },
      { projection: { features: 1, name: 1 } }
    );

    console.log(`\n✓ Tenant: ${tenant.name}`);
    console.log(`✓ Features:`, JSON.stringify(tenant.features, null, 2));

    console.log('\n✅ MULTI_WAREHOUSE enabled successfully for E2E tenant!');
  } finally {
    await client.close();
    console.log('✓ Disconnected from MongoDB');
  }
}

run().catch(console.error);
