// Script to clean all test data for E2E tenant
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
const E2E_TENANT_ID = '69c35984ffb749a6ea39fcc7';

async function cleanTestData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db('test');

    // Reset usage counters
    const tenantsCollection = db.collection('tenants');
    const resetResult = await tenantsCollection.updateOne(
      { _id: new ObjectId(E2E_TENANT_ID) },
      {
        $set: {
          'usage.currentProducts': 0,
          'usage.currentOrders': 0,
          'usage.currentStorage': 0,
        }
      }
    );
    console.log(`✓ Reset tenant usage counters: ${resetResult.modifiedCount} modified`);

    // Collections to clean (in order, respecting dependencies)
    const collectionsToClean = [
      'wastealerts',
      'transferorders',
      'purchaseorders',
      'inventorymovements',
      'inventories',
      'products',
      'suppliers',
      'warehouses',
      'waste',
      'alertrules',
      'consumableconfigs',
      'suppliesconfigs',
    ];

    let totalDeleted = 0;

    for (const collectionName of collectionsToClean) {
      try {
        const collection = db.collection(collectionName);

        // Try both string and ObjectId formats for tenantId
        const result1 = await collection.deleteMany({ tenantId: E2E_TENANT_ID });
        const result2 = await collection.deleteMany({ tenantId: new ObjectId(E2E_TENANT_ID) });

        const count = result1.deletedCount + result2.deletedCount;
        console.log(`✓ Deleted ${count} documents from ${collectionName}`);
        totalDeleted += count;
      } catch (error) {
        console.log(`⚠ Collection ${collectionName} not found or error: ${error.message}`);
      }
    }

    console.log(`\n✅ Total documents deleted: ${totalDeleted}`);
    console.log('✅ E2E test data cleaned successfully!');

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.close();
    console.log('✓ Disconnected from MongoDB');
  }
}

cleanTestData();
