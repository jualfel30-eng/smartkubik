require('dotenv').config();
const mongoose = require('mongoose');

async function count() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const result = await db.collection('inventories').aggregate([
      {
        $match: {
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
          hasValidPrices: {
            $and: [
              { $gt: ["$matchedVariant.costPrice", 0] },
              { $gt: ["$matchedVariant.basePrice", 0] }
            ]
          }
        },
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          itemsWithValidPrices: { $sum: { $cond: ["$hasValidPrices", 1, 0] } },
          itemsWithoutValidPrices: { $sum: { $cond: ["$hasValidPrices", 0, 1] } },
          totalQuantityValid: { $sum: { $cond: ["$hasValidPrices", "$totalQuantity", 0] } },
          totalQuantityInvalid: { $sum: { $cond: ["$hasValidPrices", 0, "$totalQuantity"] } },
          totalCostValueValid: { $sum: { $cond: ["$hasValidPrices", { $multiply: ["$totalQuantity", "$costPrice"] }, 0] } },
          totalCostValueInvalid: { $sum: { $cond: ["$hasValidPrices", 0, { $multiply: ["$totalQuantity", "$costPrice"] }] } },
        },
      },
    ]).toArray();

    console.log('=== INVENTORY PRICING STATUS ===\n');
    const stats = result[0];
    console.log('Total inventory items:', stats.totalItems);
    console.log('Items WITH valid prices (cost + retail):', stats.itemsWithValidPrices);
    console.log('Items WITHOUT valid prices:', stats.itemsWithoutValidPrices);
    console.log('');
    console.log('Total units with valid prices:', stats.totalQuantityValid);
    console.log('Total units without valid prices:', stats.totalQuantityInvalid);
    console.log('');
    console.log('Cost value of items WITH valid prices: $' + stats.totalCostValueValid.toFixed(2));
    console.log('Cost value of items WITHOUT valid prices: $' + stats.totalCostValueInvalid.toFixed(2));

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

count();
