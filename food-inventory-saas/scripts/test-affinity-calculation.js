/**
 * Test Affinity Score Calculation
 * This script tests the customer-product affinity calculation manually
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const CUSTOMER_ID = '68daedf32d7497b382199deb';
const TENANT_ID = '68d371dffdb57e5c800f2fcd';

/**
 * Calculate affinity score (same algorithm as service)
 */
function calculateAffinityScore(metrics) {
  // Frequency score (0-40 points)
  let frequencyScore = 0;
  if (metrics.purchaseCount >= 20) frequencyScore = 40;
  else if (metrics.purchaseCount >= 10) frequencyScore = 35;
  else if (metrics.purchaseCount >= 5) frequencyScore = 25;
  else if (metrics.purchaseCount >= 3) frequencyScore = 15;
  else frequencyScore = 10;

  // Recency score (0-30 points)
  let recencyScore = 0;
  if (metrics.daysSinceLastPurchase <= 7) recencyScore = 30;
  else if (metrics.daysSinceLastPurchase <= 30) recencyScore = 25;
  else if (metrics.daysSinceLastPurchase <= 90) recencyScore = 15;
  else if (metrics.daysSinceLastPurchase <= 180) recencyScore = 10;
  else recencyScore = 5;

  // Quantity score (0-20 points)
  let quantityScore = 0;
  if (metrics.totalQuantityPurchased >= 100) quantityScore = 20;
  else if (metrics.totalQuantityPurchased >= 50) quantityScore = 15;
  else if (metrics.totalQuantityPurchased >= 20) quantityScore = 10;
  else quantityScore = 5;

  // Consistency score (0-10 points)
  let consistencyScore = 0;
  if (metrics.purchaseFrequencyDays > 0) {
    if (metrics.purchaseFrequencyDays <= 30) consistencyScore = 10;
    else if (metrics.purchaseFrequencyDays <= 60) consistencyScore = 7;
    else if (metrics.purchaseFrequencyDays <= 90) consistencyScore = 5;
    else consistencyScore = 3;
  }

  return Math.min(100, frequencyScore + recencyScore + quantityScore + consistencyScore);
}

async function testAffinityCalculation() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB\n');
    console.log('🧪 Testing Customer-Product Affinity Calculation\n');
    console.log('=' .repeat(60));

    const db = client.db();
    const transactionsCollection = db.collection('customertransactionhistories');
    const affinityCollection = db.collection('customerproductaffinities');

    // Get all transactions for this customer
    const transactions = await transactionsCollection
      .find({
        customerId: new ObjectId(CUSTOMER_ID),
        tenantId: TENANT_ID,
        isPaid: true,
      })
      .sort({ orderDate: 1 })
      .toArray();

    console.log(`\n📊 Found ${transactions.length} paid transactions for customer`);

    // Get all unique products
    const productIds = new Set();
    transactions.forEach(tx => {
      tx.productIds.forEach(pid => productIds.add(pid.toString()));
    });

    console.log(`   Unique products purchased: ${productIds.size}\n`);

    // Calculate affinity for each product
    const affinities = [];

    for (const productId of productIds) {
      // Get all transactions for this product
      const productTransactions = transactions.filter(tx =>
        tx.productIds.some(pid => pid.toString() === productId)
      );

      // Calculate metrics
      let totalQuantity = 0;
      let totalSpent = 0;
      const purchaseDates = [];

      productTransactions.forEach(tx => {
        const item = tx.items.find(i => i.productId.toString() === productId);
        if (item) {
          totalQuantity += item.quantity;
          totalSpent += item.totalPrice;
          purchaseDates.push(tx.orderDate);
        }
      });

      const purchaseCount = productTransactions.length;
      const firstPurchaseDate = purchaseDates[0];
      const lastPurchaseDate = purchaseDates[purchaseDates.length - 1];

      // Calculate purchase frequency
      let purchaseFrequencyDays = 0;
      if (purchaseDates.length > 1) {
        let totalDays = 0;
        for (let i = 1; i < purchaseDates.length; i++) {
          const diff = (purchaseDates[i].getTime() - purchaseDates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
          totalDays += diff;
        }
        purchaseFrequencyDays = Math.round(totalDays / (purchaseDates.length - 1));
      }

      // Days since last purchase
      const now = new Date();
      const daysSinceLastPurchase = Math.floor(
        (now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate affinity score
      const affinityScore = calculateAffinityScore({
        purchaseCount,
        daysSinceLastPurchase,
        totalQuantityPurchased: totalQuantity,
        purchaseFrequencyDays,
        firstPurchaseDate,
      });

      // Get product name
      const firstTx = productTransactions[0];
      const productItem = firstTx.items.find(i => i.productId.toString() === productId);

      affinities.push({
        productId,
        productName: productItem?.productName || 'Unknown',
        affinityScore,
        purchaseCount,
        totalQuantity,
        totalSpent,
        daysSinceLastPurchase,
        purchaseFrequencyDays,
      });
    }

    // Sort by affinity score
    affinities.sort((a, b) => b.affinityScore - a.affinityScore);

    // Display results
    console.log('🎯 Affinity Scores (sorted by score):\n');
    console.log('Product Name'.padEnd(40), 'Score', 'Purchases', 'Total $', 'Days Since');
    console.log('-'.repeat(80));

    affinities.forEach(a => {
      console.log(
        a.productName.padEnd(40),
        String(a.affinityScore).padStart(5),
        String(a.purchaseCount).padStart(9),
        `$${a.totalSpent.toFixed(2)}`.padStart(8),
        String(a.daysSinceLastPurchase).padStart(10)
      );
    });

    // Test: Insert one affinity record into database
    console.log('\n\n🔧 Testing database insertion...\n');

    if (affinities.length > 0) {
      const topAffinity = affinities[0];

      const affinityRecord = {
        customerId: new ObjectId(CUSTOMER_ID),
        customerName: 'Test Customer',
        productId: new ObjectId(topAffinity.productId),
        productName: topAffinity.productName,
        affinityScore: topAffinity.affinityScore,
        purchaseCount: topAffinity.purchaseCount,
        totalQuantityPurchased: topAffinity.totalQuantity,
        totalSpent: topAffinity.totalSpent,
        averageQuantity: topAffinity.totalQuantity / topAffinity.purchaseCount,
        averageOrderValue: topAffinity.totalSpent / topAffinity.purchaseCount,
        firstPurchaseDate: transactions[0].orderDate,
        lastPurchaseDate: transactions[transactions.length - 1].orderDate,
        purchaseFrequencyDays: topAffinity.purchaseFrequencyDays,
        daysSinceLastPurchase: topAffinity.daysSinceLastPurchase,
        customerSegment: topAffinity.purchaseCount >= 20 ? 'champion' :
                         topAffinity.purchaseCount >= 10 ? 'frequent' :
                         topAffinity.purchaseCount >= 5 ? 'regular' : 'occasional',
        engagementLevel: topAffinity.daysSinceLastPurchase <= 7 ? 'very_high' :
                         topAffinity.daysSinceLastPurchase <= 30 ? 'high' :
                         topAffinity.daysSinceLastPurchase <= 90 ? 'medium' : 'low',
        tenantId: TENANT_ID,
        lastCalculated: new Date(),
      };

      const result = await affinityCollection.findOneAndUpdate(
        {
          customerId: new ObjectId(CUSTOMER_ID),
          productId: new ObjectId(topAffinity.productId),
          tenantId: TENANT_ID,
        },
        { $set: affinityRecord },
        { upsert: true, returnDocument: 'after' }
      );

      console.log('✅ Sample affinity record inserted/updated');
      console.log('   Product:', topAffinity.productName);
      console.log('   Score:', topAffinity.affinityScore);
      console.log('   Segment:', affinityRecord.customerSegment);
      console.log('   Engagement:', affinityRecord.engagementLevel);
    }

    // Check total affinity records
    const totalAffinities = await affinityCollection.countDocuments({ tenantId: TENANT_ID });
    console.log('\n📊 Total affinity records in database:', totalAffinities);

    console.log('\n✅ Test completed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

testAffinityCalculation();
