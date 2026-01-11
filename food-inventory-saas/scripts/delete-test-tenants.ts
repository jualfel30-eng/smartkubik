import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || '';

async function deleteTestTenants() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to database');

    const db = client.db('test');

    // Delete tenants created in the last hour (test tenants)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await db.collection('tenants').deleteMany({
      createdAt: { $gte: oneHourAgo }
    });

    console.log(`Deleted ${result.deletedCount} test tenants created in the last hour`);

    // Also delete associated users
    const userResult = await db.collection('users').deleteMany({
      createdAt: { $gte: oneHourAgo }
    });

    console.log(`Deleted ${userResult.deletedCount} test users created in the last hour`);

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

deleteTestTenants();
