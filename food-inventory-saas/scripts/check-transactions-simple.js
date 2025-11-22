const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkTransactions() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB\n');

    const db = client.db();
    const collection = db.collection('customertransactionhistories');

    const count = await collection.countDocuments();
    console.log(`📊 Total customer transactions: ${count}\n`);

    if (count > 0) {
      const sample = await collection.findOne();
      console.log('📝 Sample transaction:');
      console.log(`  Order: ${sample.orderNumber}`);
      console.log(`  Customer: ${sample.customerId}`);
      console.log(`  Date: ${sample.orderDate}`);
      console.log(`  Amount: $${sample.totalAmount}`);
      console.log(`  Items: ${sample.items?.length || 0} products`);
      console.log(`  Product IDs: ${sample.productIds?.length || 0} unique products\n`);
    }

    console.log('✅ Verification completed!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkTransactions();
