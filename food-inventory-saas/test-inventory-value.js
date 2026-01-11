const { MongoClient } = require('mongodb');

async function testAggregation() {
  const client = await MongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory');
  const db = client.db();

  // Get a sample tenant
  const inventory = await db.collection('inventories').findOne({ totalQuantity: { $gt: 0 } });

  if (!inventory) {
    console.log('No inventory found');
    return;
  }

  console.log('Sample Inventory:', JSON.stringify(inventory, null, 2));

  const tenantId = inventory.tenantId;
  console.log('\nTenant ID:', tenantId);

  // Test the aggregation
  const result = await db.collection('inventories').aggregate([
    {
      $match: {
        tenantId: tenantId,
        isActive: true,
        totalQuantity: { $gt: 0 },
      },
    },
    { $limit: 1 },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    {
      $unwind: {
        path: "$productInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]).toArray();

  console.log('\nAggregation Result (after lookup):', JSON.stringify(result, null, 2));

  await client.close();
}

testAggregation().catch(console.error);
