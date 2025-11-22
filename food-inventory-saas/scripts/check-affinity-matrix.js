const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkAffinityMatrix() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB\n');

    const db = client.db();
    const affinityCollection = db.collection('productaffinities');

    // Total records
    const totalCount = await affinityCollection.countDocuments();
    console.log(`📊 Total Product Affinity Records: ${totalCount}\n`);

    // Top 5 products by unique customers
    console.log('🏆 Top 5 Products by Unique Customers:\n');
    const topByCustomers = await affinityCollection
      .find({})
      .sort({ totalUniqueCustomers: -1 })
      .limit(5)
      .toArray();

    topByCustomers.forEach((product, index) => {
      console.log(`${index + 1}. ${product.productName}`);
      console.log(`   - Unique customers: ${product.totalUniqueCustomers}`);
      console.log(`   - Transactions: ${product.totalTransactions}`);
      console.log(`   - Revenue: $${product.totalRevenue.toFixed(2)}`);
      console.log(`   - Customers in matrix: ${product.customerPurchaseMatrix.length}`);
      console.log(`   - Co-purchase patterns: ${product.coPurchasePatterns.length}\n`);
    });

    // Top 5 products by revenue
    console.log('💰 Top 5 Products by Revenue:\n');
    const topByRevenue = await affinityCollection
      .find({})
      .sort({ totalRevenue: -1 })
      .limit(5)
      .toArray();

    topByRevenue.forEach((product, index) => {
      console.log(`${index + 1}. ${product.productName}`);
      console.log(`   - Revenue: $${product.totalRevenue.toFixed(2)}`);
      console.log(`   - Transactions: ${product.totalTransactions}`);
      console.log(`   - Unique customers: ${product.totalUniqueCustomers}\n`);
    });

    // Example: Customer Purchase Matrix for most popular product
    const mostPopular = await affinityCollection
      .findOne({}, { sort: { totalUniqueCustomers: -1 } });

    if (mostPopular) {
      console.log(`\n👥 Customer Purchase Matrix for "${mostPopular.productName}":\n`);

      // Sort customers by total spent
      const topCustomers = mostPopular.customerPurchaseMatrix
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      topCustomers.forEach((customer, index) => {
        console.log(`${index + 1}. Customer ID: ${customer.customerId}`);
        console.log(`   - Purchase count: ${customer.totalPurchaseCount}`);
        console.log(`   - Total quantity: ${customer.totalQuantityPurchased}`);
        console.log(`   - Total spent: $${customer.totalSpent.toFixed(2)}`);
        console.log(`   - Average order value: $${customer.averageOrderValue.toFixed(2)}`);
        console.log(`   - First purchase: ${customer.firstPurchaseDate.toISOString().split('T')[0]}`);
        console.log(`   - Last purchase: ${customer.lastPurchaseDate.toISOString().split('T')[0]}`);
        if (customer.purchaseFrequencyDays > 0) {
          console.log(`   - Purchase frequency: Every ${Math.round(customer.purchaseFrequencyDays)} days`);
        }
        console.log('');
      });
    }

    // Example: Co-purchase patterns
    const productWithPatterns = await affinityCollection
      .findOne({ 'coPurchasePatterns.0': { $exists: true } }, { sort: { 'coPurchasePatterns': -1 } });

    if (productWithPatterns) {
      console.log(`\n🔗 Co-Purchase Patterns for "${productWithPatterns.productName}":\n`);

      const topPatterns = productWithPatterns.coPurchasePatterns
        .sort((a, b) => b.affinityScore - a.affinityScore)
        .slice(0, 5);

      topPatterns.forEach((pattern, index) => {
        console.log(`${index + 1}. ${pattern.productName}`);
        console.log(`   - Bought together: ${pattern.coPurchaseCount} times`);
        console.log(`   - Affinity score: ${pattern.affinityScore.toFixed(1)}%`);
        console.log(`   - Customers who buy both: ${pattern.customerIds.length}`);
        console.log(`   - Last co-purchase: ${pattern.lastCoPurchaseDate.toISOString().split('T')[0]}\n`);
      });
    }

    // Summary statistics
    const stats = await affinityCollection.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalCustomers: { $sum: '$totalUniqueCustomers' },
          totalTransactions: { $sum: '$totalTransactions' },
          totalRevenue: { $sum: '$totalRevenue' },
          avgCustomersPerProduct: { $avg: '$totalUniqueCustomers' },
          avgTransactionsPerProduct: { $avg: '$totalTransactions' },
          avgRevenuePerProduct: { $avg: '$totalRevenue' }
        }
      }
    ]).toArray();

    if (stats[0]) {
      console.log(`\n📈 Overall Statistics:\n`);
      console.log(`Total products tracked: ${stats[0].totalProducts}`);
      console.log(`Total unique customer relationships: ${stats[0].totalCustomers}`);
      console.log(`Total transactions tracked: ${stats[0].totalTransactions}`);
      console.log(`Total revenue tracked: $${stats[0].totalRevenue.toFixed(2)}`);
      console.log(`Avg customers per product: ${stats[0].avgCustomersPerProduct.toFixed(1)}`);
      console.log(`Avg transactions per product: ${stats[0].avgTransactionsPerProduct.toFixed(1)}`);
      console.log(`Avg revenue per product: $${stats[0].avgRevenuePerProduct.toFixed(2)}\n`);
    }

    console.log('✅ Verification completed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkAffinityMatrix();
