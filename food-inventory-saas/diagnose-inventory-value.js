require('dotenv').config();
const mongoose = require('mongoose');

async function diagnose() {
  try {
    const uri = process.env.MONGODB_URI;
    console.log('Connecting to:', uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@'));
    
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // 1. Check inventory count
    const inventoryCount = await db.collection('inventories').countDocuments();
    console.log(`Total inventory documents: ${inventoryCount}`);
    
    const activeInventory = await db.collection('inventories').countDocuments({ isActive: true });
    console.log(`Active inventory: ${activeInventory}`);
    
    const withQuantity = await db.collection('inventories').countDocuments({ 
      isActive: true, 
      totalQuantity: { $gt: 0 } 
    });
    console.log(`Active inventory with quantity > 0: ${withQuantity}\n`);
    
    // 2. Sample inventory document
    console.log('=== SAMPLE INVENTORY DOCUMENT ===');
    const sampleInv = await db.collection('inventories').findOne({ 
      isActive: true,
      totalQuantity: { $gt: 0 }
    });
    
    if (sampleInv) {
      console.log({
        productName: sampleInv.productName,
        totalQuantity: sampleInv.totalQuantity,
        averageCostPrice: sampleInv.averageCostPrice,
        productId: sampleInv.productId,
        variantId: sampleInv.variantId,
        tenantId: sampleInv.tenantId
      });
      
      // 3. Get corresponding product
      if (sampleInv.productId) {
        console.log('\n=== CORRESPONDING PRODUCT ===');
        const product = await db.collection('products').findOne({ _id: sampleInv.productId });
        if (product) {
          console.log({
            name: product.name,
            sku: product.sku,
            hasVariants: Array.isArray(product.variants) && product.variants.length > 0,
            variantsCount: product.variants?.length || 0,
            firstVariant: product.variants?.[0] ? {
              name: product.variants[0].name,
              sku: product.variants[0].sku,
              costPrice: product.variants[0].costPrice,
              basePrice: product.variants[0].basePrice,
              _id: product.variants[0]._id
            } : null
          });
        } else {
          console.log('⚠️  Product not found!');
        }
      }
      
      // 4. Test the aggregation with this tenant
      console.log('\n=== TESTING AGGREGATION ===');
      const tenantId = sampleInv.tenantId;
      console.log('Using tenantId:', tenantId);
      
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
            averageCostPrice: 1,
            variantId: 1,
            hasProductInfo: { $cond: [{ $eq: ["$productInfo", null] }, false, true] },
            productVariantsCount: { $size: { $ifNull: ["$productInfo.variants", []] } },
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
      
      // 5. Full aggregation for totals
      console.log('\n=== FULL AGGREGATION FOR TOTALS ===');
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
      
      console.log('Totals:');
      console.log(JSON.stringify(totals, null, 2));
      
    } else {
      console.log('⚠️  No inventory documents found with quantity > 0');
    }
    
    await mongoose.connection.close();
    console.log('\n✓ Done');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

diagnose();
