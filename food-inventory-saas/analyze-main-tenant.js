require('dotenv').config();
const mongoose = require('mongoose');

async function analyze() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const tenantId = new mongoose.Types.ObjectId("68d371dffdb57e5c800f2fcd");
    
    console.log('Analyzing tenant with 34 items...\n');
    
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
          totalQuantity: 1,
          variantSku: 1,
          hasProduct: { $cond: [{ $ne: ["$productInfo", null] }, true, false] },
          hasVariant: { $cond: [{ $ne: ["$matchedVariant", null] }, true, false] },
          costPrice: 1,
          basePrice: 1,
          costValue: { $multiply: ["$totalQuantity", "$costPrice"] },
          retailValue: { $multiply: ["$totalQuantity", "$basePrice"] },
        },
      },
      { $sort: { costValue: -1 } }
    ]).toArray();

    let zeroRetail = 0;
    let validRetail = 0;
    
    console.log('Top 20 items by cost value:\n');
    results.slice(0, 20).forEach(r => {
      const hasZero = r.basePrice === 0;
      if (hasZero) zeroRetail++;
      else validRetail++;
      
      console.log(r.productName + ':');
      console.log('  Qty: ' + r.totalQuantity + ', Cost: $' + r.costPrice + ', Retail: $' + r.basePrice);
      console.log('  Has Product: ' + r.hasProduct + ', Has Variant: ' + r.hasVariant);
      console.log('  Total Cost: $' + r.costValue.toFixed(2) + ', Total Retail: $' + r.retailValue.toFixed(2));
      if (hasZero) console.log('  ⚠️  ZERO RETAIL PRICE');
      console.log('');
    });
    
    console.log('Summary for top 20:');
    console.log('  Items with zero retail: ' + zeroRetail);
    console.log('  Items with valid retail: ' + validRetail);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyze();
