const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function migrateTransactions() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB Atlas\n');
    console.log('🔄 Starting transaction history migration...\n');

    const db = client.db();
    const ordersCollection = db.collection('orders');
    const transactionsCollection = db.collection('customertransactionhistories');

    // Find all PAID orders with customer
    const paidOrders = await ordersCollection
      .find({
        paymentStatus: 'paid',
        customerId: { $exists: true, $ne: null }
      })
      .toArray();

    console.log(`📊 Found ${paidOrders.length} paid orders to process\n`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const order of paidOrders) {
      try {
        // Check if transaction already exists
        const existing = await transactionsCollection.findOne({
          orderId: order._id
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        // Helper: Convert category to string
        const getCategoryString = (category) => {
          if (!category) return undefined;
          if (Array.isArray(category)) {
            return category.length > 0 ? String(category[0]) : undefined;
          }
          return String(category);
        };

        // Extract items with proper category handling
        const items = order.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          category: getCategoryString(item.productId?.category),
          brand: item.productId?.brand,
          unit: item.selectedUnit,
          discount: item.discountAmount || 0,
          tax: 0
        }));

        // Extract unique categories
        const productCategories = [...new Set(items.map(i => i.category).filter(Boolean))];
        const productIds = items.map(i => i.productId);

        // Get primary payment method
        const primaryPaymentMethod =
          order.paymentRecords && order.paymentRecords.length > 0
            ? order.paymentRecords[0].method
            : 'pending';

        // Create transaction
        const transaction = {
          customerId: order.customerId,
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderDate: order.createdAt || new Date(),
          totalAmount: order.totalAmount,
          currency: 'USD',
          subtotal: order.subtotal || 0,
          tax: order.ivaTotal || 0,
          discount: order.discountAmount || 0,
          status: order.status,
          paymentMethod: primaryPaymentMethod,
          isPaid: order.paymentStatus === 'paid',
          items,
          productCategories,
          productIds,
          deliveryAddress: order.shipping?.address?.street,
          notes: order.shipping?.notes,
          tenantId: order.tenantId,
          metadata: {
            channel: order.channel,
            source: order.channel
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await transactionsCollection.insertOne(transaction);
        successCount++;

        if (successCount % 10 === 0) {
          console.log(`✅ Processed ${successCount} orders...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing order ${order.orderNumber}: ${error.message}`);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await client.close();
  }
}

migrateTransactions();
