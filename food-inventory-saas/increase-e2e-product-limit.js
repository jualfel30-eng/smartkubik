// Script to increase product limit for E2E test tenant
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
const E2E_TENANT_ID = '69c35984ffb749a6ea39fcc7';

async function increaseProductLimit() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db('test');
    const tenantsCollection = db.collection('tenants');

    // Find the E2E tenant
    const tenant = await tenantsCollection.findOne({ _id: new ObjectId(E2E_TENANT_ID) });

    if (!tenant) {
      console.error('✗ E2E tenant not found');
      return;
    }

    console.log('Current tenant limits:', tenant.limits);
    console.log('Current tenant usage:', tenant.usage);

    // Update limits to 10,000 products
    const result = await tenantsCollection.updateOne(
      { _id: new ObjectId(E2E_TENANT_ID) },
      {
        $set: {
          'limits.maxProducts': 10000,
          'limits.maxStorage': 10000000000, // 10 GB
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✓ Successfully increased product limit to 10,000');

      // Verify update
      const updatedTenant = await tenantsCollection.findOne({ _id: new ObjectId(E2E_TENANT_ID) });
      console.log('Updated tenant limits:', updatedTenant.limits);
    } else {
      console.log('⚠ No changes made');
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await client.close();
    console.log('✓ Disconnected from MongoDB');
  }
}

increaseProductLimit();
