require('dotenv').config();
const mongoose = require('mongoose');

async function analyze() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('Connected\n');

    const db = mongoose.connection.db;

    // Run the actual aggregation to see detailed results
    console.log('=== DETAILED AGGREGATION RESULTS ===\n');
    const samples = await db.collection('inventories').aggregate([
      {
        $match: {
          isActive: true,
          totalQuantity: { $gt: 0 },
        },
      },
      { $limit: 15 },
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
          totalQuantity: 1,
          variantSku: 1,
          averageCostPrice: 1,
          hasProduct: { $cond: [{ $ne: ["$productInfo", null] }, true, false] },
          variantsCount: { $size: { $ifNull: ["$productInfo.variants", []] } },
          matchedVariantSku: "$matchedVariant.sku",
          matchedCost: "$matchedVariant.costPrice",
          matchedBase: "$matchedVariant.basePrice",
          costPrice: 1,
          basePrice: 1,
          costValue: { $multiply: ["$totalQuantity", "$costPrice"] },
          retailValue: { $multiply: ["$totalQuantity", "$basePrice"] },
        },
      },
    ]).toArray();

    let zeroBasePriceCount = 0;
    let validPriceCount = 0;

    samples.forEach(s => {
      const hasZeroBase = s.basePrice === 0 || s.basePrice === null;
      if (hasZeroBase) zeroBasePriceCount++;
      else validPriceCount++;

      console.log(s.productName + ':');
      console.log('  Qty: ' + s.totalQuantity + ', Product exists: ' + s.hasProduct + ', Variants: ' + s.variantsCount);
      console.log('  Inv variantSKU: ' + s.variantSku);
      console.log('  Matched variantSKU: ' + (s.matchedVariantSku || 'NONE'));
      console.log('  Matched variant cost: ' + s.matchedCost + ', base: ' + s.matchedBase);
      console.log('  Final costPrice: ' + s.costPrice + ', Final basePrice: ' + s.basePrice);
      console.log('  Total: Cost=$' + s.costValue.toFixed(2) + ', Retail=$' + s.retailValue.toFixed(2));
      if (hasZeroBase) console.log('  WARNING: ZERO BASE PRICE!');
      console.log('');
    });

    console.log('\nSummary: ' + zeroBasePriceCount + ' items with zero base price, ' + validPriceCount + ' items with valid prices\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyze();
