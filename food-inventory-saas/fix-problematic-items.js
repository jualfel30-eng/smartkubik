require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

async function fixProblematicItems() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('=== FIXING PROBLEMATIC INVENTORY ITEMS ===\n');

    const tenantId = new ObjectId("68d371dffdb57e5c800f2fcd");

    // ============================================
    // 1. QUESO BLANCO - Recreate missing product
    // ============================================
    console.log('1. Fixing Queso Blanco Test Multi-Unit...\n');

    const quesoInventory = await db.collection('inventories').findOne({
      _id: new ObjectId("68dc8536010f1723f6eceb14")
    });

    if (quesoInventory) {
      console.log('   Inventory found:');
      console.log(`   - Product Name: ${quesoInventory.productName}`);
      console.log(`   - Quantity: ${quesoInventory.totalQuantity}`);
      console.log(`   - Cost Price: $${quesoInventory.averageCostPrice}`);
      console.log(`   - productId: ${quesoInventory.productId} (${typeof quesoInventory.productId})`);

      const quesoProductId = typeof quesoInventory.productId === 'string'
        ? new ObjectId(quesoInventory.productId)
        : quesoInventory.productId;

      // Check if product exists
      const existingProduct = await db.collection('products').findOne({ _id: quesoProductId });

      if (!existingProduct) {
        console.log('\n   Product does NOT exist. Creating new product...\n');

        // Create a basic product with proper variant
        const newProduct = {
          _id: quesoProductId,
          sku: 'QUESO-BLANCO-001',
          productType: 'simple',
          name: 'Queso Blanco Test Multi-Unit',
          category: ['Lácteos'],
          subcategory: ['Quesos'],
          brand: 'Test',
          unitOfMeasure: 'unidad',
          isSoldByWeight: false,
          hasMultipleSellingUnits: false,
          sellingUnits: [],
          description: 'Producto creado automáticamente para corregir inventario huérfano',
          tags: ['test', 'queso'],
          variants: [
            {
              _id: new ObjectId(),
              name: 'Estándar',
              sku: 'QUESO-BLANCO-001-VAR1',
              barcode: '',
              unit: 'unidad',
              unitSize: 1,
              basePrice: 15,  // Set a reasonable retail price
              costPrice: 12,  // Use the cost from inventory
              isActive: true,
              description: 'Variante estándar',
              images: [],
              attributes: {}
            }
          ],
          suppliers: [],
          isPerishable: true,
          shelfLifeDays: 30,
          attributes: {},
          pricingRules: {
            cashDiscount: 0,
            cardSurcharge: 0,
            minimumMargin: 10,
            maximumDiscount: 5
          },
          inventoryConfig: {
            trackLots: false,
            trackExpiration: true,
            minimumStock: 10,
            maximumStock: 1000,
            reorderPoint: 50,
            reorderQuantity: 100,
            fefoEnabled: true
          },
          ivaApplicable: true,
          igtfExempt: false,
          hasActivePromotion: false,
          taxCategory: 'general',
          isActive: true,
          tenantId: tenantId,
          createdBy: tenantId, // Use tenant as creator
          updatedBy: tenantId
        };

        await db.collection('products').insertOne(newProduct);
        console.log('   ✓ Product created successfully');
        console.log(`   - SKU: ${newProduct.sku}`);
        console.log(`   - Variant SKU: ${newProduct.variants[0].sku}`);
        console.log(`   - Cost Price: $${newProduct.variants[0].costPrice}`);
        console.log(`   - Base Price: $${newProduct.variants[0].basePrice}`);

        // Update inventory to use ObjectId and set correct variant
        await db.collection('inventories').updateOne(
          { _id: quesoInventory._id },
          {
            $set: {
              productId: quesoProductId,
              variantSku: newProduct.variants[0].sku
            }
          }
        );
        console.log('   ✓ Inventory updated with ObjectId productId and variantSku\n');
      } else {
        console.log('   Product exists. Just converting productId to ObjectId...\n');
        await db.collection('inventories').updateOne(
          { _id: quesoInventory._id },
          { $set: { productId: quesoProductId } }
        );
        console.log('   ✓ Inventory productId converted to ObjectId\n');
      }
    } else {
      console.log('   ⚠ Queso Blanco inventory not found\n');
    }

    // ============================================
    // 2. GELATINA - Fix SKU mismatch
    // ============================================
    console.log('2. Fixing Gelatina SKU mismatch...\n');

    const gelatinaInventory = await db.collection('inventories').findOne({
      _id: new ObjectId("68f689e6641afb77da15c552")
    });

    if (gelatinaInventory) {
      console.log('   Inventory found:');
      console.log(`   - Current SKU: ${gelatinaInventory.variantSku}`);
      console.log(`   - Product ID: ${gelatinaInventory.productId}`);

      const gelatinaProduct = await db.collection('products').findOne({
        _id: gelatinaInventory.productId
      });

      if (gelatinaProduct && gelatinaProduct.variants) {
        console.log(`   - Product variants: ${gelatinaProduct.variants.map(v => v.sku).join(', ')}`);

        // Option 1: Update inventory to use correct SKU
        const correctSku = gelatinaProduct.variants[0].sku; // Use first variant SKU
        console.log(`\n   Updating inventory SKU from "${gelatinaInventory.variantSku}" to "${correctSku}"...\n`);

        await db.collection('inventories').updateOne(
          { _id: gelatinaInventory._id },
          { $set: { variantSku: correctSku } }
        );
        console.log('   ✓ Inventory variantSku updated\n');
      } else {
        console.log('   ⚠ Product not found or has no variants\n');
      }
    } else {
      console.log('   ⚠ Gelatina inventory not found\n');
    }

    // ============================================
    // 3. MANTEQUILLA DE CABRA - Assign variant
    // ============================================
    console.log('3. Fixing Mantequilla de cabra (missing variant)...\n');

    const mantequillaInventory = await db.collection('inventories').findOne({
      _id: new ObjectId("68f69e4f4ef6c44c2fccf6c8")
    });

    if (mantequillaInventory) {
      console.log('   Inventory found:');
      console.log(`   - Current variantSku: ${mantequillaInventory.variantSku || 'NULL'}`);
      console.log(`   - Product ID: ${mantequillaInventory.productId}`);

      const mantequillaProduct = await db.collection('products').findOne({
        _id: mantequillaInventory.productId
      });

      if (mantequillaProduct && mantequillaProduct.variants && mantequillaProduct.variants.length > 0) {
        const firstVariant = mantequillaProduct.variants[0];
        console.log(`   - Product has ${mantequillaProduct.variants.length} variants`);
        console.log(`   - First variant: ${firstVariant.sku}, Cost: $${firstVariant.costPrice}, Base: $${firstVariant.basePrice}`);

        console.log(`\n   Assigning variant "${firstVariant.sku}" to inventory...\n`);

        await db.collection('inventories').updateOne(
          { _id: mantequillaInventory._id },
          { $set: { variantSku: firstVariant.sku } }
        );
        console.log('   ✓ Inventory variantSku assigned\n');
      } else {
        console.log('   ⚠ Product not found or has no variants\n');
      }
    } else {
      console.log('   ⚠ Mantequilla inventory not found\n');
    }

    // ============================================
    // 4. Verify fixes
    // ============================================
    console.log('=== VERIFYING FIXES ===\n');

    const verification = await db.collection('inventories').aggregate([
      {
        $match: {
          _id: {
            $in: [
              new ObjectId("68dc8536010f1723f6eceb14"), // Queso
              new ObjectId("68f689e6641afb77da15c552"), // Gelatina
              new ObjectId("68f69e4f4ef6c44c2fccf6c8")  // Mantequilla
            ]
          }
        }
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
        $project: {
          productName: 1,
          variantSku: 1,
          totalQuantity: 1,
          productExists: { $cond: [{ $ne: ["$productInfo", null] }, true, false] },
          matchedVariantSku: "$matchedVariant.sku",
          costPrice: { $ifNull: ["$matchedVariant.costPrice", "$averageCostPrice", 0] },
          basePrice: { $ifNull: ["$matchedVariant.basePrice", 0] },
          costValue: {
            $multiply: [
              "$totalQuantity",
              { $ifNull: ["$matchedVariant.costPrice", "$averageCostPrice", 0] }
            ]
          },
          retailValue: {
            $multiply: [
              "$totalQuantity",
              { $ifNull: ["$matchedVariant.basePrice", 0] }
            ]
          }
        }
      }
    ]).toArray();

    verification.forEach(item => {
      console.log(`${item.productName}:`);
      console.log(`  Product exists: ${item.productExists ? 'YES' : 'NO'}`);
      console.log(`  Variant SKU: ${item.variantSku || 'N/A'}`);
      console.log(`  Matched SKU: ${item.matchedVariantSku || 'NONE'}`);
      console.log(`  Cost/unit: $${item.costPrice}, Base/unit: $${item.basePrice}`);
      console.log(`  Total Cost: $${item.costValue.toFixed(2)}`);
      console.log(`  Total Retail: $${item.retailValue.toFixed(2)}`);
      console.log(`  ${item.retailValue > 0 ? '✓ HAS RETAIL VALUE' : '⚠️  STILL ZERO RETAIL'}`);
      console.log('');
    });

    console.log('=== FIX COMPLETE ===\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixProblematicItems();
