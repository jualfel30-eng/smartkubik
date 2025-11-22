const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkOrders() {
  const uri = process.env.MONGODB_URI;
  console.log(`\n🔗 Connecting to: ${uri.split('@')[1]}\n`); // Show host without credentials

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = client.db();
    const ordersCollection = db.collection('orders');

    // Count total orders
    const totalOrders = await ordersCollection.countDocuments();
    console.log(`📦 Total orders: ${totalOrders}`);

    // Count completed orders
    const completedOrders = await ordersCollection.countDocuments({
      status: 'completed'
    });
    console.log(`✅ Completed orders: ${completedOrders}`);

    // Count completed orders WITH customer
    const completedWithCustomer = await ordersCollection.countDocuments({
      status: 'completed',
      customerId: { $exists: true, $ne: null }
    });
    console.log(`👤 Completed orders with customer: ${completedWithCustomer}`);

    // Show order statuses
    const statuses = await ordersCollection.distinct('status');
    console.log(`\n📊 Order statuses in DB: ${statuses.join(', ')}`);

    // Show sample order
    if (totalOrders > 0) {
      const sample = await ordersCollection.findOne({});
      console.log(`\n📝 Sample order:`);
      console.log(`  Order #: ${sample.orderNumber}`);
      console.log(`  Status: ${sample.status}`);
      console.log(`  Has Customer: ${sample.customerId ? 'Yes' : 'No'}`);
      console.log(`  Customer ID: ${sample.customerId || 'N/A'}`);
      console.log(`  Total: $${sample.totalAmount || 0}`);
    }

    console.log('\n✅ Check completed!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkOrders();
