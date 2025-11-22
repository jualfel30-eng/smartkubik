const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

/**
 * ANALYZE TIER DISTRIBUTION
 *
 * This script analyzes why there are 0 "oro" tier customers
 * and shows the detailed RFM score distribution
 */

async function analyzeTierDistribution() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('test');
    const customersCollection = db.collection('customers');

    // Get all customers with their tiers and scores, sorted by loyaltyScore
    const customers = await customersCollection.find({
      loyaltyScore: { $exists: true, $gt: 0 },
      customerType: { $in: ['business', 'individual'] }
    })
    .sort({ loyaltyScore: -1 })
    .toArray();

    console.log(`📊 Total customers with RFM scores: ${customers.length}\n`);

    // Group by tier
    const tierGroups = {
      diamante: [],
      oro: [],
      plata: [],
      bronce: []
    };

    customers.forEach(customer => {
      const tier = customer.tier || 'bronce';
      if (tierGroups[tier]) {
        tierGroups[tier].push(customer);
      }
    });

    console.log('🎯 Distribution by tier:');
    console.log(`  💎 Diamante: ${tierGroups.diamante.length} customers`);
    console.log(`  🥇 Oro: ${tierGroups.oro.length} customers`);
    console.log(`  🥈 Plata: ${tierGroups.plata.length} customers`);
    console.log(`  🥉 Bronce: ${tierGroups.bronce.length} customers`);

    // Calculate what the distribution SHOULD be
    const totalScored = customers.length;
    const diamanteCutoff = Math.ceil(totalScored * 0.05);
    const oroCutoff = Math.ceil(totalScored * 0.20);
    const plataCutoff = Math.ceil(totalScored * 0.50);

    console.log(`\n📐 Cutoff calculations (total: ${totalScored} scored customers):`);
    console.log(`  Diamante cutoff: Math.ceil(${totalScored} * 0.05) = ${diamanteCutoff}`);
    console.log(`  Oro cutoff: Math.ceil(${totalScored} * 0.20) = ${oroCutoff}`);
    console.log(`  Plata cutoff: Math.ceil(${totalScored} * 0.50) = ${plataCutoff}`);

    console.log(`\n⚠️  PROBLEM DETECTED:`);
    if (diamanteCutoff === oroCutoff) {
      console.log(`  ❌ Diamante cutoff (${diamanteCutoff}) == Oro cutoff (${oroCutoff})`);
      console.log(`  This means rank 2+ will skip "oro" and go directly to "plata" or "bronce"`);
      console.log(`  This happens when the dataset is too small (< 20 customers with orders)`);
    }

    // Show the actual ranking
    console.log(`\n🏆 Customer ranking by RFM score:`);
    customers.forEach((customer, index) => {
      const rank = index + 1;
      let expectedTier;
      if (rank <= diamanteCutoff) {
        expectedTier = 'diamante';
      } else if (rank <= oroCutoff) {
        expectedTier = 'oro';
      } else if (rank <= plataCutoff) {
        expectedTier = 'plata';
      } else {
        expectedTier = 'bronce';
      }

      const actualTier = customer.tier || 'bronce';
      const match = expectedTier === actualTier ? '✅' : '❌';

      console.log(
        `  ${match} #${rank.toString().padStart(2)} - ${customer.name.padEnd(30)} - ` +
        `Score: ${customer.loyaltyScore.toFixed(1).padStart(5)} - ` +
        `Tier: ${actualTier.padEnd(8)} (expected: ${expectedTier})`
      );
    });

    // Suggest fix
    console.log(`\n💡 SOLUTION:`);
    console.log(`  The current algorithm uses Math.ceil() which causes overlap when datasets are small.`);
    console.log(`  With ${totalScored} customers:`);
    console.log(`    - Top 5% = ${Math.ceil(totalScored * 0.05)} customer (diamante)`);
    console.log(`    - Top 20% = ${Math.ceil(totalScored * 0.20)} customers (should include oro)`);
    console.log(`    - But since both are ${diamanteCutoff}, there's no room for "oro" tier!`);
    console.log(`\n  OPTIONS:`);
    console.log(`    1. Use Math.floor() instead of Math.ceil() for better distribution`);
    console.log(`    2. Ensure minimum 1 customer per tier when dataset is small`);
    console.log(`    3. Use actual percentile ranges instead of cumulative cutoffs`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

analyzeTierDistribution();
