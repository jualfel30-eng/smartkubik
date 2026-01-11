import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || '';

async function listAllTenants() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to database\n');

    const db = client.db('test');

    // Get all tenants sorted by creation date
    const tenants = await db.collection('tenants').find({}).sort({ createdAt: 1 }).toArray();

    console.log(`=== ALL TENANTS (${tenants.length} total) ===\n`);

    tenants.forEach((tenant: any, index: number) => {
      console.log(`${index + 1}. ${tenant.name || tenant.businessName || 'Unnamed'}`);
      console.log(`   ID: ${tenant._id}`);
      console.log(`   Email: ${tenant.contactInfo?.email || 'N/A'}`);
      console.log(`   Vertical: ${tenant.vertical}`);
      console.log(`   Created: ${tenant.createdAt}`);
      console.log(`   Status: ${tenant.status || 'N/A'}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

listAllTenants();
