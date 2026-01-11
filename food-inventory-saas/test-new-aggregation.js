require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    
    // Get sample inventory
    const sample = await db.collection('inventories').findOne({ 
      isActive: true,
      totalQuantity: { $gt: 0 }
    });
    
    console.log('Sample inventory:');
    console.log({
      productName: sample.productName,
      variantSku: sample.variantSku,
      totalQuantity: sample.totalQuantity,
      averageCostPrice: sample.averageCostPrice
    });
    
    // Test new aggregation
    const tenantId = sample.tenantId;
    const result = await db.collection('inventories').aggregate([
      { $match: { tenantId: tenantId, isActive: true, totalQuantity: { $gt: 0 } } },
      { $limit: 3 },
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
                { $ne: ["$variantSku", null] },
                { $isArray: "$productInfo.variants" }
              ]},
              then: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$productInfo.variants",
                      as: "variant",
                      cond: { $eq: ["$$variant.sku", "$variantSku"] }
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
          variantSku: 1,
          totalQuantity: 1,
          averageCostPrice: 1,
          "matchedVariant.sku": 1,
          "matchedVariant.costPrice": 1,
          "matchedVariant.basePrice": 1,
          costPrice: 1,
          basePrice: 1,
          costValue: { $multiply: ["$totalQuantity", "$costPrice"] },
          retailValue: { $multiply: ["$totalQuantity", "$basePrice"] },
        },
      },
    ]).toArray();
    
    console.log('\nAggregation results:');
    result.forEach(r => {
      console.log({
        productName: r.productName,
        variantSku: r.variantSku,
        totalQuantity: r.totalQuantity,
        matchedVariantSku: r.matchedVariant?.sku,
        costPrice: r.costPrice,
        basePrice: r.basePrice,
        costValue: r.costValue,
        retailValue: r.retailValue
      });
    });
    
    // Get totals
    console.log('\n=== TOTALS ===');
    const totals = await db.collection('inventories').aggregate([
      {
        $match: {
          tenantId: tenantId,
          isActive: true,
          totalQuantity: { $gt: 0 },
        },
      },
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
                { $ne: ["$variantSku", null] },
                { $isArray: "$productInfo.variants" }
              ]},
              then: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$productInfo.variants",
                      as: "variant",
                      cond: { $eq: ["$$variant.sku", "$variantSku"] }
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
          totalQuantity: 1,
          costPrice: 1,
          basePrice: 1,
          costValue: {
            $multiply: ["$totalQuantity", "$costPrice"],
          },
          retailValue: {
            $multiply: ["$totalQuantity", "$basePrice"],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCostValue: { $sum: "$costValue" },
          totalRetailValue: { $sum: "$retailValue" },
          totalItems: { $sum: "$totalQuantity" },
        },
      },
    ]).toArray();
    
    console.log(JSON.stringify(totals, null, 2));
    
    await mongoose.connection.close();
    console.log('\n✓ Done');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
