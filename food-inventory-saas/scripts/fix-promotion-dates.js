/**
 * Script to fix promotion date types
 * Converts string dates to Date objects in MongoDB
 * Run with: node scripts/fix-promotion-dates.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';

async function fixPromotionDates() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const productsCollection = db.collection('products');

    // Find all products with promotion dates
    const productsWithPromotions = await productsCollection
      .find({
        promotion: { $exists: true },
        $or: [
          { 'promotion.startDate': { $type: 'string' } },
          { 'promotion.endDate': { $type: 'string' } }
        ]
      })
      .toArray();

    console.log(`📊 Found ${productsWithPromotions.length} products with string dates\n`);

    if (productsWithPromotions.length === 0) {
      console.log('✅ All promotion dates are already in correct format!\n');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const product of productsWithPromotions) {
      try {
        const updates = {};

        // Convert startDate if it's a string
        if (product.promotion?.startDate && typeof product.promotion.startDate === 'string') {
          updates['promotion.startDate'] = new Date(product.promotion.startDate);
        }

        // Convert endDate if it's a string
        if (product.promotion?.endDate && typeof product.promotion.endDate === 'string') {
          updates['promotion.endDate'] = new Date(product.promotion.endDate);
        }

        if (Object.keys(updates).length > 0) {
          const result = await productsCollection.updateOne(
            { _id: product._id },
            { $set: updates }
          );

          if (result.modifiedCount > 0) {
            console.log(`✅ Fixed dates for: ${product.name} (${product.brand || 'N/A'})`);
            console.log(`   └─ startDate: ${updates['promotion.startDate']?.toISOString() || 'not updated'}`);
            console.log(`   └─ endDate: ${updates['promotion.endDate']?.toISOString() || 'not updated'}\n`);
            successCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Error fixing ${product.name}: ${error.message}\n`);
        errorCount++;
      }
    }

    console.log('='.repeat(80));
    console.log(`\n🎉 Migration complete!`);
    console.log(`   ✅ Success: ${successCount} products`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount} products`);
    }
    console.log('\n💡 Now run: node scripts/diagnose-promotions.js to verify\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
fixPromotionDates().catch(console.error);
