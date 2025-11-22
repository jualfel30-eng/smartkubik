/**
 * Fix NaN totalAmount values in CustomerTransactionHistory
 *
 * This script:
 * 1. Finds all transactions with NaN or invalid totalAmount
 * 2. Recalculates totalAmount from items
 * 3. Updates the records
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';

// Schema definition
const customerTransactionSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderNumber: String,
  orderDate: Date,
  totalAmount: Number,
  currency: String,
  subtotal: Number,
  tax: Number,
  discount: Number,
  status: String,
  paymentMethod: String,
  isPaid: Boolean,
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    productName: String,
    productCode: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    category: String,
    brand: String,
    unit: String,
    discount: Number,
    tax: Number,
  }],
  productCategories: [String],
  productIds: [mongoose.Schema.Types.ObjectId],
  deliveryAddress: String,
  notes: String,
  tenantId: mongoose.Schema.Types.ObjectId,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

async function fixNaNTransactions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const CustomerTransaction = mongoose.model('CustomerTransactionHistory', customerTransactionSchema);

    // Find all transactions
    const allTransactions = await CustomerTransaction.find({}).lean();
    console.log(`📊 Total transactions in database: ${allTransactions.length}`);

    // Find transactions with invalid totalAmount
    const invalidTransactions = allTransactions.filter(t => {
      return isNaN(t.totalAmount) ||
             t.totalAmount === null ||
             t.totalAmount === undefined ||
             !isFinite(t.totalAmount);
    });

    console.log(`\n❌ Found ${invalidTransactions.length} transactions with invalid totalAmount`);

    if (invalidTransactions.length === 0) {
      console.log('✅ No transactions need fixing!');
      await mongoose.disconnect();
      return;
    }

    console.log('\n🔧 Fixing transactions...\n');

    let fixed = 0;
    let failed = 0;

    for (const transaction of invalidTransactions) {
      try {
        // Calculate totalAmount from items
        let calculatedTotal = 0;

        if (transaction.items && Array.isArray(transaction.items)) {
          calculatedTotal = transaction.items.reduce((sum, item) => {
            const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
            return sum + (isNaN(itemTotal) ? 0 : itemTotal);
          }, 0);
        }

        // If still 0 or invalid, try from subtotal
        if (calculatedTotal === 0 || isNaN(calculatedTotal)) {
          const subtotal = transaction.subtotal || 0;
          const tax = transaction.tax || 0;
          const discount = transaction.discount || 0;
          calculatedTotal = subtotal + tax - discount;
        }

        // Ensure it's a valid number
        if (isNaN(calculatedTotal) || !isFinite(calculatedTotal)) {
          calculatedTotal = 0;
        }

        // Update the transaction
        await CustomerTransaction.updateOne(
          { _id: transaction._id },
          {
            $set: {
              totalAmount: calculatedTotal,
              subtotal: transaction.subtotal || calculatedTotal,
            }
          }
        );

        console.log(`✅ Fixed transaction ${transaction.orderNumber}: NaN → $${calculatedTotal.toFixed(2)}`);
        console.log(`   Items count: ${transaction.items?.length || 0}`);
        console.log(`   Customer: ${transaction.customerId}`);

        fixed++;
      } catch (error) {
        console.error(`❌ Failed to fix transaction ${transaction._id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Results:`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Verify the fix
    console.log('🔍 Verifying fix...\n');
    const stillInvalid = await CustomerTransaction.find({}).lean();
    const stillBad = stillInvalid.filter(t => isNaN(t.totalAmount) || !isFinite(t.totalAmount));

    if (stillBad.length === 0) {
      console.log('✅ All transactions now have valid totalAmount!');
    } else {
      console.log(`⚠️  Still ${stillBad.length} invalid transactions remaining`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the fix
fixNaNTransactions();
