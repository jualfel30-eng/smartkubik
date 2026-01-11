require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

async function migrateProductIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('=== DATABASE MIGRATION: String productId -> ObjectId ===\n');

    // Step 1: Find all inventories with String productId
    console.log('Step 1: Analyzing inventories collection...\n');

    const allInventories = await db.collection('inventories').find({}).toArray();
    console.log(`Total inventory items: ${allInventories.length}\n`);

    const stringProductIds = allInventories.filter(inv => typeof inv.productId === 'string');
    const objectIdProductIds = allInventories.filter(inv => inv.productId instanceof ObjectId);

    console.log(`Items with String productId: ${stringProductIds.length}`);
    console.log(`Items with ObjectId productId: ${objectIdProductIds.length}\n`);

    if (stringProductIds.length === 0) {
      console.log('✓ No String productIds found. Migration not needed.\n');
      await mongoose.connection.close();
      return;
    }

    // Step 2: Validate that all String productIds are valid ObjectIds
    console.log('Step 2: Validating String productIds...\n');

    const invalidProductIds = [];
    const validProductIds = [];

    for (const inv of stringProductIds) {
      try {
        // Check if the string is a valid ObjectId
        if (ObjectId.isValid(inv.productId)) {
          validProductIds.push(inv);
        } else {
          invalidProductIds.push({
            _id: inv._id,
            productId: inv.productId,
            productName: inv.productName,
            tenantId: inv.tenantId
          });
        }
      } catch (error) {
        invalidProductIds.push({
          _id: inv._id,
          productId: inv.productId,
          productName: inv.productName,
          tenantId: inv.tenantId,
          error: error.message
        });
      }
    }

    console.log(`Valid String productIds (can convert): ${validProductIds.length}`);
    console.log(`Invalid String productIds (cannot convert): ${invalidProductIds.length}\n`);

    if (invalidProductIds.length > 0) {
      console.log('⚠ WARNING: Found invalid productIds that cannot be converted:');
      invalidProductIds.forEach(inv => {
        console.log(`  - ${inv.productName} (${inv._id}): productId="${inv.productId}"`);
      });
      console.log('');
    }

    // Step 3: Check if products exist for each valid String productId
    console.log('Step 3: Checking if products exist...\n');

    const orphanedInventories = [];
    const validInventories = [];

    for (const inv of validProductIds) {
      const productId = new ObjectId(inv.productId);
      const product = await db.collection('products').findOne({ _id: productId });

      if (!product) {
        orphanedInventories.push({
          _id: inv._id,
          productId: inv.productId,
          productName: inv.productName,
          tenantId: inv.tenantId,
          totalQuantity: inv.totalQuantity,
          averageCostPrice: inv.averageCostPrice
        });
      } else {
        validInventories.push(inv);
      }
    }

    console.log(`Inventories with existing products: ${validInventories.length}`);
    console.log(`Orphaned inventories (product not found): ${orphanedInventories.length}\n`);

    if (orphanedInventories.length > 0) {
      console.log('⚠ WARNING: Found orphaned inventory items (product does not exist):');
      orphanedInventories.forEach(inv => {
        const costValue = (inv.totalQuantity || 0) * (inv.averageCostPrice || 0);
        console.log(`  - ${inv.productName} (${inv._id})`);
        console.log(`    productId: ${inv.productId}`);
        console.log(`    Quantity: ${inv.totalQuantity}, Cost: $${costValue.toFixed(2)}`);
        console.log(`    Tenant: ${inv.tenantId}`);
      });
      console.log('');
    }

    // Step 4: Check for SKU mismatches
    console.log('Step 4: Checking for variant SKU mismatches...\n');

    const skuMismatches = [];

    for (const inv of validInventories) {
      if (!inv.variantSku) continue;

      const productId = new ObjectId(inv.productId);
      const product = await db.collection('products').findOne({ _id: productId });

      if (!product || !product.variants || product.variants.length === 0) {
        skuMismatches.push({
          _id: inv._id,
          productName: inv.productName,
          inventoryVariantSku: inv.variantSku,
          issue: 'Product has no variants',
          tenantId: inv.tenantId
        });
        continue;
      }

      const matchedVariant = product.variants.find(v => v.sku === inv.variantSku);

      if (!matchedVariant) {
        skuMismatches.push({
          _id: inv._id,
          productName: inv.productName,
          inventoryVariantSku: inv.variantSku,
          productVariantSkus: product.variants.map(v => v.sku),
          issue: 'Inventory SKU not found in product variants',
          tenantId: inv.tenantId
        });
      }
    }

    console.log(`SKU mismatches found: ${skuMismatches.length}\n`);

    if (skuMismatches.length > 0) {
      console.log('⚠ WARNING: Found SKU mismatches:');
      skuMismatches.forEach(mismatch => {
        console.log(`  - ${mismatch.productName} (${mismatch._id})`);
        console.log(`    Inventory SKU: ${mismatch.inventoryVariantSku}`);
        console.log(`    Issue: ${mismatch.issue}`);
        if (mismatch.productVariantSkus) {
          console.log(`    Product SKUs: ${mismatch.productVariantSkus.join(', ')}`);
        }
        console.log(`    Tenant: ${mismatch.tenantId}`);
      });
      console.log('');
    }

    // Step 5: Show migration summary
    console.log('=== MIGRATION SUMMARY ===\n');
    console.log(`Total inventory items: ${allInventories.length}`);
    console.log(`Items to migrate (String -> ObjectId): ${validInventories.length}`);
    console.log(`Items already ObjectId: ${objectIdProductIds.length}`);
    console.log(`Invalid productIds (cannot convert): ${invalidProductIds.length}`);
    console.log(`Orphaned inventories (will be flagged): ${orphanedInventories.length}`);
    console.log(`SKU mismatches (needs manual review): ${skuMismatches.length}\n`);

    // Step 6: Perform the migration
    console.log('Step 6: Starting migration...\n');

    console.log('Converting productId from String to ObjectId:\n');

    let successCount = 0;
    let errorCount = 0;

    for (const inv of validInventories) {
      try {
        const productIdObjectId = new ObjectId(inv.productId);

        console.log(`Converting: ${inv.productName} (${inv._id})`);
        console.log(`  From: "${inv.productId}" (String)`);
        console.log(`  To: ObjectId("${productIdObjectId}")`);

        // Execute the migration
        await db.collection('inventories').updateOne(
          { _id: inv._id },
          { $set: { productId: productIdObjectId } }
        );

        console.log(`  ✓ SUCCESS\n`);
        successCount++;
      } catch (error) {
        console.log(`  ✗ ERROR: ${error.message}\n`);
        errorCount++;
      }
    }

    console.log(`\n=== MIGRATION COMPLETE ===`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}\n`);

    // Step 7: Generate actions report
    console.log('=== RECOMMENDED ACTIONS ===\n');

    if (orphanedInventories.length > 0) {
      console.log('1. ORPHANED INVENTORIES (product does not exist):');
      console.log('   Action: Delete these inventory items or create placeholder products');
      orphanedInventories.forEach(inv => {
        console.log(`   - DELETE inventory ${inv._id} (${inv.productName})`);
      });
      console.log('');
    }

    if (skuMismatches.length > 0) {
      console.log('2. SKU MISMATCHES:');
      console.log('   Action: Manual review required - update SKU or delete inventory');
      skuMismatches.forEach(mismatch => {
        console.log(`   - REVIEW inventory ${mismatch._id} (${mismatch.productName})`);
      });
      console.log('');
    }

    if (invalidProductIds.length > 0) {
      console.log('3. INVALID PRODUCT IDS:');
      console.log('   Action: Delete these inventories (productId is not a valid ObjectId)');
      invalidProductIds.forEach(inv => {
        console.log(`   - DELETE inventory ${inv._id} (${inv.productName})`);
      });
      console.log('');
    }

    console.log('=== NEXT STEPS ===\n');
    console.log('Migration completed successfully!\n');
    console.log(`${successCount} inventory items now have ObjectId productId instead of String.\n`);
    console.log('To clean orphaned data:');
    console.log('1. Run: node clean-orphaned-data.js\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateProductIds();
