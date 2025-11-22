/**
 * Debug exact query matching
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';
const CUSTOMER_ID = '68f6b997f0fedc073262c403'; // Diana Moreira
const TENANT_ID = '68d371dffdb57e5c800f2fcd'; // From frontend logs

async function debugQuery() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('customertransactionhistories');

    // Test 1: Count all transactions for this customer (no filters)
    console.log('=== Test 1: Count all transactions for customer (no filters) ===');
    const count1 = await collection.countDocuments({
      customerId: new mongoose.Types.ObjectId(CUSTOMER_ID)
    });
    console.log(`Found: ${count1} transactions\n`);

    // Test 2: Count with tenantId as ObjectId
    console.log('=== Test 2: Count with tenantId as ObjectId ===');
    const count2 = await collection.countDocuments({
      customerId: new mongoose.Types.ObjectId(CUSTOMER_ID),
      tenantId: new mongoose.Types.ObjectId(TENANT_ID)
    });
    console.log(`Found: ${count2} transactions\n`);

    // Test 3: Check actual data structure
    console.log('=== Test 3: Check actual data structure ===');
    const sample = await collection.findOne({
      customerId: new mongoose.Types.ObjectId(CUSTOMER_ID)
    });

    if (sample) {
      console.log('Sample transaction:');
      console.log('  _id type:', typeof sample._id, '|', sample._id);
      console.log('  customerId type:', typeof sample.customerId, '|', sample.customerId);
      console.log('  tenantId type:', typeof sample.tenantId, '|', sample.tenantId);
      console.log('  customerId is ObjectId?', sample.customerId instanceof mongoose.Types.ObjectId);
      console.log('  tenantId is ObjectId?', sample.tenantId instanceof mongoose.Types.ObjectId);

      // Check if tenantId matches
      const tenantMatches = sample.tenantId.toString() === TENANT_ID;
      console.log(`\n  Tenant ID in DB: ${sample.tenantId}`);
      console.log(`  Tenant ID from frontend: ${TENANT_ID}`);
      console.log(`  Match? ${tenantMatches ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('No sample transaction found!');
    }

    console.log('\n=== Test 4: Try different query formats ===');

    // Format 1: Both as ObjectId
    const query1 = {
      customerId: new mongoose.Types.ObjectId(CUSTOMER_ID),
      tenantId: new mongoose.Types.ObjectId(TENANT_ID)
    };
    const result1 = await collection.countDocuments(query1);
    console.log(`Format 1 (both ObjectId): ${result1} found`);
    console.log(`Query: ${JSON.stringify(query1)}`);

    // Format 2: customerId as ObjectId, tenantId as string
    const query2 = {
      customerId: new mongoose.Types.ObjectId(CUSTOMER_ID),
      tenantId: TENANT_ID
    };
    const result2 = await collection.countDocuments(query2);
    console.log(`\nFormat 2 (customerId ObjectId, tenantId string): ${result2} found`);
    console.log(`Query: ${JSON.stringify(query2)}`);

    // Format 3: Both as strings
    const query3 = {
      customerId: CUSTOMER_ID,
      tenantId: TENANT_ID
    };
    const result3 = await collection.countDocuments(query3);
    console.log(`\nFormat 3 (both strings): ${result3} found`);
    console.log(`Query: ${JSON.stringify(query3)}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

debugQuery();
