require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // Get all unique tenantIds from inventory
    const tenants = await db.collection('inventories').distinct('tenantId');
    
    console.log('Found ' + tenants.length + ' unique tenant(s) in inventory\n');
    
    for (const tenantId of tenants) {
      const count = await db.collection('inventories').countDocuments({ 
        tenantId: tenantId,
        isActive: true,
        totalQuantity: { $gt: 0 }
      });
      
      console.log('Tenant ID:', tenantId);
      console.log('  Active inventory items:', count);
      
      // Run aggregation for this tenant
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
      
      if (totals.length > 0) {
        console.log('  Total Cost: $' + totals[0].totalCostValue.toFixed(2));
        console.log('  Total Retail: $' + totals[0].totalRetailValue.toFixed(2));
        console.log('  Profit: $' + (totals[0].totalRetailValue - totals[0].totalCostValue).toFixed(2));
      }
      console.log('');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
