/**
 * Script to diagnose promotion issues
 * Run with: node scripts/diagnose-promotions.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';

async function diagnosePromotions() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const productsCollection = db.collection('products');

    const now = new Date();
    console.log(`🕐 Current time: ${now.toISOString()}\n`);

    // Find ALL products with promotion field (regardless of status)
    const productsWithPromotions = await productsCollection
      .find({
        promotion: { $exists: true }
      })
      .toArray();

    console.log(`📊 Total products with promotion field: ${productsWithPromotions.length}\n`);

    if (productsWithPromotions.length === 0) {
      console.log('❌ No products with promotions found at all!');
      console.log('💡 You need to add the promotion field to your products first.\n');
      return;
    }

    console.log('🔍 Analyzing each product:\n');
    console.log('='.repeat(80) + '\n');

    productsWithPromotions.forEach((product, index) => {
      console.log(`Product ${index + 1}: ${product.name} (${product.brand || 'No brand'})`);
      console.log(`  SKU: ${product.sku}`);
      console.log(`  TenantID: ${product.tenantId}`);
      console.log(`  ✓ hasActivePromotion: ${product.hasActivePromotion || false} (type: ${typeof product.hasActivePromotion})`);

      if (product.promotion) {
        console.log(`  ✓ promotion.isActive: ${product.promotion.isActive || false} (type: ${typeof product.promotion.isActive})`);
        console.log(`  ✓ promotion.discountPercentage: ${product.promotion.discountPercentage || 0}%`);
        console.log(`  ✓ promotion.reason: ${product.promotion.reason || 'N/A'}`);

        if (product.promotion.startDate) {
          const startDate = new Date(product.promotion.startDate);
          const startValid = startDate <= now;
          console.log(`  ${startValid ? '✅' : '❌'} promotion.startDate: ${startDate.toISOString()} ${startValid ? '(valid - already started)' : '(INVALID - starts in future)'}`);
          console.log(`       └─ Raw value: ${product.promotion.startDate} (type: ${typeof product.promotion.startDate})`);
          console.log(`       └─ Is Date object: ${product.promotion.startDate instanceof Date}`);
        } else {
          console.log(`  ❌ promotion.startDate: MISSING`);
        }

        if (product.promotion.endDate) {
          const endDate = new Date(product.promotion.endDate);
          const endValid = endDate >= now;
          console.log(`  ${endValid ? '✅' : '❌'} promotion.endDate: ${endDate.toISOString()} ${endValid ? '(valid - not expired)' : '(INVALID - already expired)'}`);
          console.log(`       └─ Raw value: ${product.promotion.endDate} (type: ${typeof product.promotion.endDate})`);
          console.log(`       └─ Is Date object: ${product.promotion.endDate instanceof Date}`);
        } else {
          console.log(`  ❌ promotion.endDate: MISSING`);
        }
      } else {
        console.log(`  ❌ promotion object: MISSING`);
      }

      // Check if this product would be found by the query
      const wouldBeFound =
        product.hasActivePromotion === true &&
        product.promotion?.isActive === true &&
        product.promotion?.startDate &&
        new Date(product.promotion.startDate) <= now &&
        product.promotion?.endDate &&
        new Date(product.promotion.endDate) >= now;

      console.log(`\n  ${wouldBeFound ? '✅ WILL BE FOUND' : '❌ WILL NOT BE FOUND'} by list_active_promotions query\n`);
      console.log('-'.repeat(80) + '\n');
    });

    // Now test the actual query that list_active_promotions uses (WITHOUT tenantId filter)
    const queryResultsNoTenant = await productsCollection
      .find({
        hasActivePromotion: true,
        "promotion.isActive": true,
        "promotion.startDate": { $lte: now },
        "promotion.endDate": { $gte: now },
      })
      .toArray();

    console.log('='.repeat(80));
    console.log(`\n🎯 QUERY RESULTS (without tenantId filter): ${queryResultsNoTenant.length} products found`);

    // Now test WITH tenantId filter
    if (productsWithPromotions.length > 0) {
      const sampleTenantId = productsWithPromotions[0].tenantId;
      console.log(`\n🔑 Testing with tenantId from first product: ${sampleTenantId}`);

      // Test with direct comparison
      const queryResultsWithTenant = await productsCollection
        .find({
          tenantId: sampleTenantId,
          hasActivePromotion: true,
          "promotion.isActive": true,
          "promotion.startDate": { $lte: now },
          "promotion.endDate": { $gte: now },
        })
        .toArray();

      console.log(`🎯 QUERY RESULTS (with tenantId filter): ${queryResultsWithTenant.length} products found\n`);
    }

    const queryResults = queryResultsNoTenant;

    if (queryResults.length > 0) {
      console.log('✅ These products WILL show up when asking for promotions:\n');
      queryResults.forEach(p => {
        console.log(`  • ${p.name} (${p.brand || 'No brand'}) - ${p.promotion.discountPercentage}% off`);
      });
    } else {
      console.log('❌ NO products will show up when asking for promotions!');
      console.log('\n💡 Check the issues above and fix the fields accordingly.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
diagnosePromotions().catch(console.error);
