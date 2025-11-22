const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function rebuildAffinityMatrix() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB Atlas\n');
    console.log('🔄 Starting product affinity matrix rebuild...\n');

    const db = client.db();
    const transactionsCollection = db.collection('customertransactionhistories');
    const affinityCollection = db.collection('productaffinities');

    // Clear existing affinity data
    console.log('🗑️  Clearing existing product affinity data...');
    const deleteResult = await affinityCollection.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} old records\n`);

    // Get all transactions
    const transactions = await transactionsCollection.find({}).toArray();
    console.log(`📊 Found ${transactions.length} transactions to process\n`);

    let processedCount = 0;
    let errorCount = 0;

    // Process each transaction
    for (const transaction of transactions) {
      try {
        // Process each product in the transaction
        for (const item of transaction.items) {
          const productId = item.productId;

          // Find or create ProductAffinity record
          let affinity = await affinityCollection.findOne({
            productId: productId,
            tenantId: transaction.tenantId
          });

          if (!affinity) {
            // Create new affinity record
            affinity = {
              productId: productId,
              productName: item.productName,
              productCode: item.productCode,
              productCategories: item.category ? [item.category] : [],
              customerPurchaseMatrix: [],
              coPurchasePatterns: [],
              totalUniqueCustomers: 0,
              totalTransactions: 0,
              totalQuantitySold: 0,
              totalRevenue: 0,
              customerIds: [],
              tenantId: transaction.tenantId,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          }

          // Find customer in matrix
          const customerIndex = affinity.customerPurchaseMatrix.findIndex(
            c => c.customerId.toString() === transaction.customerId.toString()
          );

          if (customerIndex >= 0) {
            // Update existing customer
            const customer = affinity.customerPurchaseMatrix[customerIndex];
            customer.totalPurchaseCount += 1;
            customer.totalQuantityPurchased += item.quantity;
            customer.totalSpent += item.totalPrice;
            customer.lastPurchaseDate = transaction.orderDate;
            customer.averageOrderValue = customer.totalSpent / customer.totalPurchaseCount;

            // Calculate frequency
            if (customer.firstPurchaseDate) {
              const daysDiff = (transaction.orderDate.getTime() - customer.firstPurchaseDate.getTime()) / (1000 * 60 * 60 * 24);
              customer.purchaseFrequencyDays = daysDiff / customer.totalPurchaseCount;
            }
          } else {
            // Add new customer
            affinity.customerPurchaseMatrix.push({
              customerId: transaction.customerId,
              customerName: 'Customer',
              totalPurchaseCount: 1,
              totalQuantityPurchased: item.quantity,
              totalSpent: item.totalPrice,
              firstPurchaseDate: transaction.orderDate,
              lastPurchaseDate: transaction.orderDate,
              averageOrderValue: item.totalPrice,
              purchaseFrequencyDays: 0
            });

            if (!affinity.customerIds.some(id => id.toString() === transaction.customerId.toString())) {
              affinity.customerIds.push(transaction.customerId);
              affinity.totalUniqueCustomers += 1;
            }
          }

          // Update aggregate metrics
          affinity.totalTransactions += 1;
          affinity.totalQuantitySold += item.quantity;
          affinity.totalRevenue += item.totalPrice;

          if (!affinity.firstSaleDate || transaction.orderDate < affinity.firstSaleDate) {
            affinity.firstSaleDate = transaction.orderDate;
          }
          if (!affinity.lastSaleDate || transaction.orderDate > affinity.lastSaleDate) {
            affinity.lastSaleDate = transaction.orderDate;
          }
          affinity.lastUpdated = new Date();

          // Update or insert
          await affinityCollection.updateOne(
            { productId: productId, tenantId: transaction.tenantId },
            { $set: affinity },
            { upsert: true }
          );
        }

        // Update co-purchase patterns for multi-item orders
        if (transaction.items.length > 1) {
          for (let i = 0; i < transaction.items.length; i++) {
            const productId = transaction.items[i].productId;
            const otherProducts = transaction.items.filter((_, idx) => idx !== i);

            const affinity = await affinityCollection.findOne({
              productId: productId,
              tenantId: transaction.tenantId
            });

            if (affinity) {
              for (const otherItem of otherProducts) {
                const patternIndex = affinity.coPurchasePatterns.findIndex(
                  p => p.productId.toString() === otherItem.productId.toString()
                );

                if (patternIndex >= 0) {
                  // Update existing pattern
                  affinity.coPurchasePatterns[patternIndex].coPurchaseCount += 1;
                  affinity.coPurchasePatterns[patternIndex].lastCoPurchaseDate = new Date();

                  // Add customer if not already in list
                  if (!affinity.coPurchasePatterns[patternIndex].customerIds.some(
                    id => id.toString() === transaction.customerId.toString()
                  )) {
                    affinity.coPurchasePatterns[patternIndex].customerIds.push(transaction.customerId);
                  }

                  // Recalculate affinity score
                  affinity.coPurchasePatterns[patternIndex].affinityScore = Math.min(
                    100,
                    (affinity.coPurchasePatterns[patternIndex].coPurchaseCount / affinity.totalTransactions) * 100
                  );
                } else {
                  // Add new pattern
                  affinity.coPurchasePatterns.push({
                    productId: otherItem.productId,
                    productName: otherItem.productName,
                    productCode: otherItem.productCode,
                    coPurchaseCount: 1,
                    affinityScore: (1 / affinity.totalTransactions) * 100,
                    lastCoPurchaseDate: new Date(),
                    customerIds: [transaction.customerId]
                  });
                }
              }

              await affinityCollection.updateOne(
                { productId: productId, tenantId: transaction.tenantId },
                { $set: { coPurchasePatterns: affinity.coPurchasePatterns } }
              );
            }
          }
        }

        processedCount++;
        if (processedCount % 10 === 0) {
          console.log(`✅ Processed ${processedCount}/${transactions.length} transactions...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing transaction ${transaction.orderNumber}: ${error.message}`);
      }
    }

    // Get final statistics
    const affinityCount = await affinityCollection.countDocuments();
    const topAffinity = await affinityCollection
      .findOne({}, { sort: { totalUniqueCustomers: -1 } });

    console.log(`\n✅ Product affinity matrix rebuild completed!`);
    console.log(`   Transactions processed: ${processedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Product affinity records: ${affinityCount}\n`);

    if (topAffinity) {
      console.log(`📊 Most popular product:`);
      console.log(`   Name: ${topAffinity.productName}`);
      console.log(`   Unique customers: ${topAffinity.totalUniqueCustomers}`);
      console.log(`   Total transactions: ${topAffinity.totalTransactions}`);
      console.log(`   Total revenue: $${topAffinity.totalRevenue.toFixed(2)}`);
      console.log(`   Co-purchase patterns: ${topAffinity.coPurchasePatterns.length}\n`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await client.close();
  }
}

rebuildAffinityMatrix();
