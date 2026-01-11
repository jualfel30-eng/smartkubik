const mongoose = require('mongoose');

async function testAggregation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/food-inventory-saas');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // First, let's see a sample inventory document
    console.log('\n=== SAMPLE INVENTORY DOCUMENT ===');
    const sampleInventory = await db.collection('inventories').findOne({ totalQuantity: { $gt: 0 } });
    console.log(JSON.stringify(sampleInventory, null, 2));
    
    // Now let's see the corresponding product
    if (sampleInventory && sampleInventory.productId) {
      console.log('\n=== CORRESPONDING PRODUCT ===');
      const product = await db.collection('products').findOne({ _id: sampleInventory.productId });
      console.log(JSON.stringify(product, null, 2));
    }
    
    // Now let's test the aggregation
    console.log('\n=== TESTING AGGREGATION ===');
    const result = await db.collection('inventories').aggregate([
      { $match: { totalQuantity: { $gt: 0 }, isActive: true } },
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
      {
        $addFields: {
          matchedVariant: {
            $cond: {
              if: { $and: [
                { $ne: ["$variantId", null] },
                { $isArray: "$productInfo.variants" }
              ]},
              then: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$productInfo.variants",
                      as: "variant",
                      cond: { $eq: ["$$variant._id", "$variantId"] }
                    }
                  },
                  0
                ]
              },
              else: {
                $arrayElemAt: ["$productInfo.variants", 0]
              }
            }
          }
        }
      },
      {
        $addFields: {
          costPrice: {
            $ifNull: ["$matchedVariant.costPrice", "$averageCostPrice", 0],
          },
          basePrice: {
            $ifNull: ["$matchedVariant.basePrice", 0],
          },
        },
      },
      {
        $project: {
          productName: 1,
          totalQuantity: 1,
          variantId: 1,
          averageCostPrice: 1,
          "productInfo.variants": 1,
          matchedVariant: 1,
          costPrice: 1,
          basePrice: 1,
          costValue: { $multiply: ["$totalQuantity", "$costPrice"] },
          retailValue: { $multiply: ["$totalQuantity", "$basePrice"] },
        },
      },
    ]).toArray();
    
    console.log('Aggregation result:');
    console.log(JSON.stringify(result, null, 2));
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAggregation();
