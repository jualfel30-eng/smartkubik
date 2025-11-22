const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugOrders() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('test');
    const ordersCollection = db.collection('orders');
    const customersCollection = db.collection('customers');

    // Count total orders
    const totalOrders = await ordersCollection.countDocuments();
    console.log(`\n📊 Total orders in database: ${totalOrders}`);

    // Group orders by tenantId
    const ordersByTenant = await ordersCollection.aggregate([
      {
        $group: {
          _id: '$tenantId',
          count: { $sum: 1 },
          statuses: { $addToSet: '$status' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log(`\n📈 Orders by tenant:`);
    ordersByTenant.forEach(({ _id, count, statuses }) => {
      console.log(`  Tenant ${_id}: ${count} orders (statuses: ${statuses.join(', ')})`);
    });

    // Check if we have customers with metrics.totalSpent > 0
    const customersWithSpending = await customersCollection.find({
      'metrics.totalSpent': { $gt: 0 }
    }).limit(10).toArray();

    console.log(`\n💰 Customers with spending (sample of ${customersWithSpending.length}):`);
    customersWithSpending.forEach(customer => {
      console.log(`  - ${customer.name} (${customer.tenantId}): $${customer.metrics.totalSpent} spent, ${customer.metrics.totalOrders} orders, tier: ${customer.tier}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

debugOrders();
