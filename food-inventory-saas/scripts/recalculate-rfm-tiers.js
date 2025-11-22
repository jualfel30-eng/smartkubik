const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

/**
 * RECALCULATE RFM TIERS FOR ALL CUSTOMERS
 *
 * This script implements the exact same RFM tier calculation as
 * customers.service.ts:calculateCustomerTiers() but persists results to DB.
 *
 * RFM Algorithm:
 * - Recency (R): 100 / (daysSinceLastPurchase + 1)
 * - Frequency (F): Number of orders
 * - Monetary (M): Weighted total spend (recent orders count more)
 * - Loyalty Score: 0.5*R + 0.3*F + 0.2*M
 *
 * Tier Assignment (Pareto 80/20):
 * - Top 5% = Diamante
 * - Top 20% = Oro
 * - Top 50% = Plata
 * - Rest = Bronce
 */

async function recalculateRFMTiers() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('test');
    const customersCollection = db.collection('customers');
    const ordersCollection = db.collection('orders');

    // Get all tenants
    const tenants = await customersCollection.distinct('tenantId');
    console.log(`\n📊 Found ${tenants.length} tenant(s)`);

    for (const tenantId of tenants) {
      console.log(`\n🏢 Processing tenant: ${tenantId}`);

      // Get customers for this tenant (exclude suppliers)
      const customers = await customersCollection.find({
        tenantId: tenantId,
        customerType: { $in: ['business', 'individual'] }
      }).toArray();

      console.log(`  Found ${customers.length} customers`);

      if (customers.length === 0) {
        console.log('  ⏭️  Skipping (no customers)');
        continue;
      }

      // Get all relevant orders for this tenant (handle string/ObjectId mismatch)
      const tenantIdString = tenantId.toString();
      const tenantObjectId = ObjectId.isValid(tenantIdString) ? new ObjectId(tenantIdString) : tenantIdString;

      const allOrders = await ordersCollection.find({
        $or: [
          { tenantId: tenantObjectId },
          { tenantId: tenantIdString }
        ],
        status: { $in: ['delivered', 'paid', 'confirmed', 'processing', 'pending'] }
      }).toArray();

      console.log(`  Found ${allOrders.length} orders`);

      // Group orders by customer (handle ObjectId/string mismatch)
      const ordersByCustomer = new Map();
      allOrders.forEach(order => {
        if (!order.customerId) return;
        const customerId = order.customerId.toString();
        if (!ordersByCustomer.has(customerId)) {
          ordersByCustomer.set(customerId, []);
        }
        ordersByCustomer.get(customerId).push(order);
      });

      // Calculate RFM scores for each customer
      const customerScores = [];
      const today = new Date();

      for (const customer of customers) {
        const customerId = customer._id.toString();
        const customerOrders = ordersByCustomer.get(customerId) || [];

        if (customerOrders.length === 0) {
          customerScores.push({
            customerId,
            loyaltyScore: 0,
            rScore: 0,
            fScore: 0,
            mScore: 0,
            orderCount: 0
          });
          continue;
        }

        // Calculate Recency (R): Days since last purchase
        const lastOrderDate = customerOrders.reduce(
          (max, order) => (order.createdAt > max ? order.createdAt : max),
          customerOrders[0].createdAt
        );
        const daysSinceLastPurchase = Math.floor(
          (today.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 3600 * 24)
        );
        const rScore = 100 / (daysSinceLastPurchase + 1);

        // Calculate Frequency (F): Number of orders
        const fScore = customerOrders.length;

        // Calculate Monetary (M): Weighted total spend (recent orders count more)
        const mScore = customerOrders.reduce((sum, order) => {
          const daysAgo = Math.floor(
            (today.getTime() - new Date(order.createdAt).getTime()) / (1000 * 3600 * 24)
          );
          const weight = Math.pow(0.99, daysAgo); // 1% decay per day
          return sum + (order.totalAmount || 0) * weight;
        }, 0);

        customerScores.push({
          customerId,
          rScore,
          fScore,
          mScore,
          orderCount: customerOrders.length,
          lastOrderDate
        });
      }

      // Normalize scores to 0-100 scale
      const maxR = Math.max(...customerScores.map(s => s.rScore || 0));
      const maxF = Math.max(...customerScores.map(s => s.fScore || 0));
      const maxM = Math.max(...customerScores.map(s => s.mScore || 0));

      const scoreMap = new Map();
      customerScores.forEach(score => {
        const normR = maxR > 0 ? ((score.rScore || 0) / maxR) * 100 : 0;
        const normF = maxF > 0 ? ((score.fScore || 0) / maxF) * 100 : 0;
        const normM = maxM > 0 ? ((score.mScore || 0) / maxM) * 100 : 0;

        // Final loyalty score: weighted combination
        score.loyaltyScore = 0.5 * normR + 0.3 * normF + 0.2 * normM;
        scoreMap.set(score.customerId, score.loyaltyScore);
      });

      // Sort by loyalty score (highest first)
      customerScores.sort((a, b) => (b.loyaltyScore || 0) - (a.loyaltyScore || 0));

      // Assign tiers based on percentiles
      const tierMap = new Map();
      const scoredCustomers = customerScores.filter(s => (s.loyaltyScore || 0) > 0);
      const totalScoredCustomers = scoredCustomers.length;

      // Use RANGES instead of cumulative cutoffs to avoid overlap
      // Top 5% = diamante, next 15% (5-20%) = oro, next 30% (20-50%) = plata, rest = bronce
      const diamanteEnd = Math.max(1, Math.floor(totalScoredCustomers * 0.05));
      const oroEnd = Math.max(diamanteEnd + 1, Math.floor(totalScoredCustomers * 0.20));
      const plataEnd = Math.max(oroEnd + 1, Math.floor(totalScoredCustomers * 0.50));

      let diamanteCount = 0, oroCount = 0, plataCount = 0, bronceCount = 0;

      scoredCustomers.forEach((score, index) => {
        const rank = index + 1;
        let tier;
        if (rank <= diamanteEnd) {
          tier = 'diamante';
          diamanteCount++;
        } else if (rank <= oroEnd) {
          tier = 'oro';
          oroCount++;
        } else if (rank <= plataEnd) {
          tier = 'plata';
          plataCount++;
        } else {
          tier = 'bronce';
          bronceCount++;
        }
        tierMap.set(score.customerId, tier);
      });

      console.log(`  📊 Tier distribution:`);
      console.log(`     💎 Diamante: ${diamanteCount} (rank 1-${diamanteEnd})`);
      console.log(`     🥇 Oro: ${oroCount} (rank ${diamanteEnd + 1}-${oroEnd})`);
      console.log(`     🥈 Plata: ${plataCount} (rank ${oroEnd + 1}-${plataEnd})`);
      console.log(`     🥉 Bronce: ${bronceCount} (rank ${plataEnd + 1}+)`);

      // Update all customers with their new tiers
      console.log(`  🔄 Updating ${customers.length} customers...`);

      const updatePromises = customers.map(customer => {
        const customerId = customer._id.toString();
        const tier = tierMap.get(customerId) || 'bronce';
        const loyaltyScore = scoreMap.get(customerId) || 0;

        return customersCollection.updateOne(
          { _id: customer._id },
          {
            $set: {
              tier,                   // Root field (used by marketing)
              loyaltyScore,
              'loyalty.tier': tier,   // Subdocument (for consistency)
              'loyalty.lastUpgradeAt': new Date()
            }
          }
        );
      });

      const results = await Promise.all(updatePromises);
      const modifiedCount = results.reduce((sum, result) => sum + result.modifiedCount, 0);

      console.log(`  ✅ Updated ${modifiedCount} customers`);

      // Show top 5 customers
      const top5 = scoredCustomers.slice(0, 5);
      if (top5.length > 0) {
        console.log(`  �� Top 5 customers:`);
        top5.forEach((score, index) => {
          const customer = customers.find(c => c._id.toString() === score.customerId);
          const tier = tierMap.get(score.customerId);
          console.log(`     ${index + 1}. ${customer.name} - ${tier} (score: ${score.loyaltyScore.toFixed(1)}, ${score.orderCount} orders)`);
        });
      }
    }

    console.log('\n✅ RFM calculation completed for all tenants!');

    // Final verification
    console.log('\n🔍 Final tier distribution across all tenants:');
    const finalTierCounts = await customersCollection.aggregate([
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    finalTierCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id || '(null/undefined)'}: ${count} customers`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

// Run the script
recalculateRFMTiers()
  .then(() => {
    console.log('\n🎉 All done! Tier-based marketing filters should now work correctly.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
