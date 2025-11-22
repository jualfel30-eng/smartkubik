const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function testCustomerTransactions() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB\n');

    const db = client.db();
    const customersCollection = db.collection('customers');
    const transactionsCollection = db.collection('customertransactionhistories');

    // Step 1: Find a customer with transactions
    console.log('👤 Finding customers with transaction history...\n');

    const customersWithTransactions = await transactionsCollection.aggregate([
      {
        $group: {
          _id: '$customerId',
          transactionCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          firstPurchase: { $min: '$orderDate' },
          lastPurchase: { $max: '$orderDate' }
        }
      },
      { $sort: { transactionCount: -1 } },
      { $limit: 5 }
    ]).toArray();

    console.log(`Found ${customersWithTransactions.length} customers with transactions:\n`);

    for (let i = 0; i < customersWithTransactions.length; i++) {
      const customerData = customersWithTransactions[i];
      const customer = await customersCollection.findOne({ _id: customerData._id });

      console.log(`${i + 1}. ${customer?.name || 'Unknown Customer'}`);
      console.log(`   - Customer ID: ${customerData._id}`);
      console.log(`   - Transactions: ${customerData.transactionCount}`);
      console.log(`   - Total Spent: $${customerData.totalSpent.toFixed(2)}`);
      console.log(`   - First Purchase: ${customerData.firstPurchase.toISOString().split('T')[0]}`);
      console.log(`   - Last Purchase: ${customerData.lastPurchase.toISOString().split('T')[0]}\n`);
    }

    // Step 2: Get detailed transaction history for top customer
    const topCustomer = customersWithTransactions[0];
    const topCustomerDetails = await customersCollection.findOne({ _id: topCustomer._id });

    console.log(`\n📋 Detailed Transaction History for "${topCustomerDetails?.name || 'Customer'}"\n`);
    console.log('─'.repeat(80));

    const transactions = await transactionsCollection
      .find({ customerId: topCustomer._id })
      .sort({ orderDate: -1 })
      .toArray();

    transactions.forEach((transaction, i) => {
      console.log(`\nTransaction ${i + 1}:`);
      console.log(`  Date: ${transaction.orderDate.toISOString().split('T')[0]}`);
      console.log(`  Order #: ${transaction.orderNumber}`);
      console.log(`  Status: ${transaction.status}`);
      console.log(`  Total: $${transaction.totalAmount.toFixed(2)}`);
      console.log(`  Payment: ${transaction.paymentMethod || 'N/A'}`);
      console.log(`  Items: ${transaction.items.length} products`);

      transaction.items.forEach((item, j) => {
        console.log(`    ${j + 1}. ${item.productName} - ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${item.totalPrice.toFixed(2)}`);
      });
    });

    console.log('\n' + '─'.repeat(80));

    // Step 3: Calculate statistics
    console.log('\n\n📊 Customer Transaction Statistics:\n');

    const avgOrderValue = topCustomer.totalSpent / topCustomer.transactionCount;
    const daysBetweenPurchases = Math.floor(
      (topCustomer.lastPurchase - topCustomer.firstPurchase) / (1000 * 60 * 60 * 24)
    );
    const purchaseFrequency = topCustomer.transactionCount > 1
      ? daysBetweenPurchases / (topCustomer.transactionCount - 1)
      : 0;

    console.log(`Total Transactions: ${topCustomer.transactionCount}`);
    console.log(`Total Spent: $${topCustomer.totalSpent.toFixed(2)}`);
    console.log(`Average Order Value: $${avgOrderValue.toFixed(2)}`);
    console.log(`Purchase Frequency: Every ${Math.round(purchaseFrequency)} days`);
    console.log(`Customer Lifetime: ${daysBetweenPurchases} days\n`);

    // Step 4: Get top products for this customer
    console.log('🏆 Top Products Purchased:\n');

    const topProducts = await transactionsCollection.aggregate([
      { $match: { customerId: topCustomer._id } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          category: { $first: '$items.category' },
          purchaseCount: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' },
          totalSpent: { $sum: '$items.totalPrice' },
          avgUnitPrice: { $avg: '$items.unitPrice' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 }
    ]).toArray();

    topProducts.forEach((product, i) => {
      console.log(`${i + 1}. ${product.productName}`);
      console.log(`   - Category: ${product.category || 'N/A'}`);
      console.log(`   - Purchases: ${product.purchaseCount} orders`);
      console.log(`   - Total Quantity: ${product.totalQuantity} units`);
      console.log(`   - Total Spent: $${product.totalSpent.toFixed(2)}`);
      console.log(`   - Avg Unit Price: $${product.avgUnitPrice.toFixed(2)}\n`);
    });

    // Step 5: Show what endpoints would return
    console.log('\n📡 API Endpoint Responses:\n');
    console.log('─'.repeat(80));

    console.log('\n1. GET /customers/:id/transactions');
    console.log(`   Returns: ${transactions.length} transactions with full details\n`);

    console.log('2. GET /customers/:id/transaction-stats');
    console.log('   Returns:');
    console.log(`   - totalTransactions: ${topCustomer.transactionCount}`);
    console.log(`   - totalSpent: $${topCustomer.totalSpent.toFixed(2)}`);
    console.log(`   - averageOrderValue: $${avgOrderValue.toFixed(2)}`);
    console.log(`   - topProducts: [${topProducts.length} items]\n`);

    console.log('3. GET /customers/:id/product-history');
    console.log(`   Returns: Product summary (already exists)\n`);

    console.log('─'.repeat(80));
    console.log('\n✅ Customer transaction integration complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

testCustomerTransactions();
