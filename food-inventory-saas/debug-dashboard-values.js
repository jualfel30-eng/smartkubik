require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

async function debugDashboard() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const tenantId = new ObjectId("68d371dffdb57e5c800f2fcd");

    console.log('=== DEBUGGING DASHBOARD VALUES ===\n');
    console.log('Tenant:', tenantId, '\n');

    // Run the EXACT same aggregation as the dashboard
    const results = await db.collection('inventories').aggregate([
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
          productName: 1,
          productId: 1,
          productIdType: { $type: "$productId" },
          totalQuantity: 1,
          variantSku: 1,
          averageCostPrice: 1,
          hasProduct: { $cond: [{ $ne: ["$productInfo", null] }, true, false] },
          productExists: "$productInfo.name",
          matchedVariantSku: "$matchedVariant.sku",
          matchedCostPrice: "$matchedVariant.costPrice",
          matchedBasePrice: "$matchedVariant.basePrice",
          costPrice: 1,
          basePrice: 1,
          costValue: { $multiply: ["$totalQuantity", "$costPrice"] },
          retailValue: { $multiply: ["$totalQuantity", "$basePrice"] },
        },
      },
      {
        $sort: { costValue: -1 }
      }
    ]).toArray();

    console.log(`Total active inventory items with quantity > 0: ${results.length}\n`);

    let totalCost = 0;
    let totalRetail = 0;
    let itemsWithZeroRetail = 0;
    let itemsWithProduct = 0;
    let itemsWithoutProduct = 0;

    console.log('=== DETAILED BREAKDOWN ===\n');

    results.forEach((item, index) => {
      const costValue = item.costValue || 0;
      const retailValue = item.retailValue || 0;

      totalCost += costValue;
      totalRetail += retailValue;

      if (retailValue === 0) itemsWithZeroRetail++;
      if (item.hasProduct) itemsWithProduct++;
      else itemsWithoutProduct++;

      // Show top 15 most expensive items
      if (index < 15 || !item.hasProduct || retailValue === 0) {
        console.log(`${index + 1}. ${item.productName}`);
        console.log(`   ID: ${item._id}`);
        console.log(`   productId: ${item.productId} (${item.productIdType})`);
        console.log(`   Product exists: ${item.hasProduct ? 'YES' : 'NO'}`);
        if (item.productExists) {
          console.log(`   Product name: ${item.productExists}`);
        }
        console.log(`   Quantity: ${item.totalQuantity}`);
        console.log(`   Variant SKU: ${item.variantSku || 'N/A'}`);
        console.log(`   Matched SKU: ${item.matchedVariantSku || 'NONE'}`);
        console.log(`   Cost/unit: $${item.costPrice}, Base/unit: $${item.basePrice}`);
        console.log(`   TOTAL COST: $${costValue.toFixed(2)}`);
        console.log(`   TOTAL RETAIL: $${retailValue.toFixed(2)}`);
        if (retailValue === 0) {
          console.log(`   ⚠️  ZERO RETAIL VALUE!`);
        }
        console.log('');
      }
    });

    console.log('=== SUMMARY ===\n');
    console.log(`Items with product: ${itemsWithProduct}`);
    console.log(`Items without product: ${itemsWithoutProduct}`);
    console.log(`Items with zero retail value: ${itemsWithZeroRetail}`);
    console.log('');
    console.log(`TOTAL COST: $${totalCost.toFixed(2)}`);
    console.log(`TOTAL RETAIL: $${totalRetail.toFixed(2)}`);
    console.log(`PROFIT: $${(totalRetail - totalCost).toFixed(2)}`);
    console.log('');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugDashboard();
