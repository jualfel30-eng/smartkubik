require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // Get a sample inventory to find tenantId
    const sample = await db.collection('inventories').findOne({ 
      isActive: true,
      totalQuantity: { $gt: 0 }
    });
    
    const tenantId = sample.tenantId;
    
    // Run the NEW aggregation with productId conversion
    const totals = await db.collection('inventories').aggregate([
      {
        $match: {
          tenantId: tenantId,
          isActive: true,
          totalQuantity: { $gt: 0 },
        },
      },
      {
        $addFields: {
          productIdAsObjectId: {
            $cond: {
              if: { $eq: [{ $type: "$productId" }, "string"] },
              then: { $toObjectId: "$productId" },
              else: "$productId"
            }
          }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "productIdAsObjectId",
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

    console.log('=== FINAL AGGREGATION RESULTS ===\n');
    console.log('Total Cost Value: $' + totals[0].totalCostValue.toFixed(2));
    console.log('Total Retail Value: $' + totals[0].totalRetailValue.toFixed(2));
    console.log('Potential Profit: $' + (totals[0].totalRetailValue - totals[0].totalCostValue).toFixed(2));
    console.log('Total Items: ' + totals[0].totalItems);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
