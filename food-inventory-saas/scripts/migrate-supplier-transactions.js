/**
 * Migrate existing PurchaseOrders to SupplierTransactionHistory
 * This script processes all received/completed purchase orders
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function migrateSupplierTransactions() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB\n');
    console.log('🔄 Starting supplier transaction history migration...\n');

    const db = client.db();
    const purchaseOrdersCollection = db.collection('purchaseorders');
    const transactionsCollection = db.collection('suppliertransactionhistories');
    const productsCollection = db.collection('products');

    // Find all received or completed purchase orders with supplier
    const completedPOs = await purchaseOrdersCollection
      .find({
        status: { $in: ['received', 'completed'] },
        supplierId: { $exists: true, $ne: null }
      })
      .toArray();

    console.log(`📊 Found ${completedPOs.length} purchase orders to process\n`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const po of completedPOs) {
      try {
        // Check if transaction already exists
        const existing = await transactionsCollection.findOne({
          purchaseOrderId: po._id
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
        // Need to populate product details for categories and brands
        const items = await Promise.all(
          po.items.map(async (item) => {
            let productData = null;
            try {
              productData = await productsCollection.findOne({ _id: item.productId });
            } catch (error) {
              console.warn(`   ⚠️  Could not populate product ${item.productId}`);
            }

            return {
              productId: item.productId,
              productName: item.productName,
              productCode: item.productSku,
              quantity: item.quantity,
              unitCost: item.costPrice,
              totalCost: item.totalCost,
              category: getCategoryString(productData?.category),
              brand: productData?.brand,
              unit: item.selectedUnit,
              discount: 0,
              tax: 0
            };
          })
        );

        // Extract unique categories
        const productCategories = [...new Set(items.map(i => i.category).filter(Boolean))];
        const productIds = items.map(i => i.productId);

        // Get primary payment method
        const paymentMethod =
          po.paymentTerms?.paymentMethods?.[0] || 'pending';

        // Determine if paid
        const isPaid = po.status === 'completed' || po.status === 'received';

        // Create transaction
        const transaction = {
          supplierId: po.supplierId,
          purchaseOrderId: po._id,
          purchaseOrderNumber: po.poNumber,
          orderDate: po.purchaseDate,
          deliveryDate: po.expectedDeliveryDate,
          totalAmount: po.totalAmount,
          currency: 'USD',
          subtotal: po.totalAmount,
          tax: 0,
          discount: 0,
          status: po.status,
          paymentMethod: paymentMethod,
          isPaid: isPaid,
          paymentDueDate: po.paymentTerms?.paymentDueDate,
          items,
          productCategories,
          productIds,
          notes: po.notes,
          tenantId: po.tenantId,
          metadata: {
            requestedBy: po.createdBy?.toString(),
            approvedBy: po.approvedBy?.toString()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await transactionsCollection.insertOne(transaction);
        successCount++;

        if (successCount % 10 === 0) {
          console.log(`✅ Processed ${successCount} purchase orders...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing PO ${po.poNumber}: ${error.message}`);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

migrateSupplierTransactions();
