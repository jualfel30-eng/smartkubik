const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function testProductCampaign() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB\n');

    const db = client.db();
    const affinityCollection = db.collection('productaffinities');
    const campaignCollection = db.collection('productcampaigns');

    // Step 1: Find a product with good customer data
    console.log('📊 Finding products with customer data...\n');

    const topProducts = await affinityCollection
      .find({})
      .sort({ totalUniqueCustomers: -1 })
      .limit(3)
      .toArray();

    console.log('Top 3 Products by Customer Count:\n');
    topProducts.forEach((product, i) => {
      console.log(`${i + 1}. ${product.productName}`);
      console.log(`   - Product ID: ${product.productId}`);
      console.log(`   - Unique customers: ${product.totalUniqueCustomers}`);
      console.log(`   - Total transactions: ${product.totalTransactions}`);
      console.log(`   - Revenue: $${product.totalRevenue.toFixed(2)}\n`);
    });

    // Step 2: Create a test campaign targeting the top product
    const targetProduct = topProducts[0];

    console.log(`\n🎯 Creating campaign targeting "${targetProduct.productName}"...\n`);

    // Get tenant ID from the product
    const tenantId = targetProduct.tenantId;

    // Simulate target customers (we already know them from affinity matrix)
    const targetCustomerIds = targetProduct.customerIds;

    const testCampaign = {
      name: `Test Campaign - ${targetProduct.productName} Promotion`,
      description: `Promotional campaign for customers who have purchased ${targetProduct.productName}`,
      productTargeting: [
        {
          productId: targetProduct.productId,
          productName: targetProduct.productName,
          productCode: targetProduct.productCode,
          minPurchaseCount: 1, // At least 1 purchase
          includeInactiveCustomers: true
        }
      ],
      targetingLogic: 'ANY',
      targetCustomerIds: targetCustomerIds,
      estimatedReach: targetCustomerIds.length,
      segmentGeneratedAt: new Date(),
      channel: 'email',
      subject: `Exclusive Offer: 20% Off ${targetProduct.productName}!`,
      message: `Hi there! We noticed you love our ${targetProduct.productName}. Get 20% off your next order!`,
      htmlContent: `<h2>Exclusive Offer</h2><p>Get 20% off ${targetProduct.productName}!</p>`,
      emailConfig: {
        fromEmail: 'promotions@example.com',
        fromName: 'SmartKubik Promotions',
        trackOpens: true,
        trackClicks: true
      },
      offer: {
        type: 'percentage',
        value: 20,
        applicableProducts: [targetProduct.productId],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        couponCode: `${targetProduct.productName.toUpperCase().replace(/\s/g, '')}_20`
      },
      status: 'draft',
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalOrders: 0,
      totalRevenue: 0,
      cost: 0,
      roi: 0,
      productPerformance: [],
      tenantId: tenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await campaignCollection.insertOne(testCampaign);

    console.log('✅ Campaign created successfully!\n');
    console.log(`Campaign Details:`);
    console.log(`  ID: ${result.insertedId}`);
    console.log(`  Name: ${testCampaign.name}`);
    console.log(`  Target Product: ${targetProduct.productName}`);
    console.log(`  Target Customers: ${testCampaign.estimatedReach}`);
    console.log(`  Channel: ${testCampaign.channel}`);
    console.log(`  Offer: ${testCampaign.offer.value}% off`);
    console.log(`  Coupon Code: ${testCampaign.offer.couponCode}`);
    console.log(`  Status: ${testCampaign.status}\n`);

    // Step 3: Verify customer details from affinity matrix
    console.log('👥 Target Customer Breakdown:\n');

    const customerDetails = targetProduct.customerPurchaseMatrix
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    customerDetails.forEach((customer, i) => {
      console.log(`${i + 1}. Customer ${customer.customerId}`);
      console.log(`   - Purchase count: ${customer.totalPurchaseCount}`);
      console.log(`   - Total spent: $${customer.totalSpent.toFixed(2)}`);
      console.log(`   - Avg order value: $${customer.averageOrderValue.toFixed(2)}`);
      console.log(`   - Last purchase: ${customer.lastPurchaseDate.toISOString().split('T')[0]}\n`);
    });

    // Step 4: Show what a "launched" campaign would look like
    console.log('\n📧 Campaign Preview (what customers would receive):\n');
    console.log('─'.repeat(60));
    console.log(`From: ${testCampaign.emailConfig.fromName} <${testCampaign.emailConfig.fromEmail}>`);
    console.log(`Subject: ${testCampaign.subject}`);
    console.log('─'.repeat(60));
    console.log(testCampaign.message);
    console.log(`\nUse code: ${testCampaign.offer.couponCode}`);
    console.log(`Valid until: ${testCampaign.offer.expiresAt.toISOString().split('T')[0]}`);
    console.log('─'.repeat(60));

    // Step 5: Test different targeting scenarios
    console.log('\n\n🧪 Testing Different Targeting Scenarios:\n');

    // Scenario 1: High-value customers only
    const highValueCustomers = targetProduct.customerPurchaseMatrix.filter(
      c => c.totalSpent >= 100
    );

    console.log(`Scenario 1: High-Value Customers (spent $100+)`);
    console.log(`  Result: ${highValueCustomers.length} customers\n`);

    // Scenario 2: Frequent buyers
    const frequentBuyers = targetProduct.customerPurchaseMatrix.filter(
      c => c.totalPurchaseCount >= 3
    );

    console.log(`Scenario 2: Frequent Buyers (3+ purchases)`);
    console.log(`  Result: ${frequentBuyers.length} customers\n`);

    // Scenario 3: Recent purchasers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBuyers = targetProduct.customerPurchaseMatrix.filter(
      c => new Date(c.lastPurchaseDate) >= thirtyDaysAgo
    );

    console.log(`Scenario 3: Recent Buyers (last 30 days)`);
    console.log(`  Result: ${recentBuyers.length} customers\n`);

    // Step 6: Show campaign count
    const totalCampaigns = await campaignCollection.countDocuments();
    console.log(`\n📊 Total Product Campaigns in Database: ${totalCampaigns}\n`);

    console.log('✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

testProductCampaign();
