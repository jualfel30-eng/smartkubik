/**
 * Check transactions for a specific customer
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';
const CUSTOMER_ID = '68f6b997f0fedc073262c403'; // Diana Moreira

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

async function checkCustomer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const CustomerTransaction = mongoose.model('CustomerTransactionHistory', customerTransactionSchema);

    // Get all transactions for the customer
    const transactions = await CustomerTransaction
      .find({ customerId: new mongoose.Types.ObjectId(CUSTOMER_ID) })
      .sort({ orderDate: -1 })
      .lean();

    console.log(`📊 Found ${transactions.length} transactions for customer ${CUSTOMER_ID}\n`);

    if (transactions.length === 0) {
      console.log('❌ No transactions found for this customer');
      await mongoose.disconnect();
      return;
    }

    // Check each transaction
    let invalidCount = 0;
    let validCount = 0;

    transactions.forEach((t, idx) => {
      const isInvalid = isNaN(t.totalAmount) ||
                        t.totalAmount === null ||
                        t.totalAmount === undefined ||
                        !isFinite(t.totalAmount) ||
                        typeof t.totalAmount !== 'number';

      if (isInvalid) {
        console.log(`❌ Transaction ${idx + 1}: ${t.orderNumber}`);
        console.log(`   totalAmount: ${t.totalAmount} (type: ${typeof t.totalAmount})`);
        console.log(`   isNaN: ${isNaN(t.totalAmount)}`);
        console.log(`   isFinite: ${isFinite(t.totalAmount)}`);
        console.log(`   Raw value: ${JSON.stringify(t.totalAmount)}`);
        console.log(`   Items: ${t.items?.length || 0}`);

        if (t.items && t.items.length > 0) {
          const itemsTotal = t.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
          console.log(`   Calculated from items: $${itemsTotal.toFixed(2)}`);
        }
        console.log();
        invalidCount++;
      } else {
        validCount++;
      }
    });

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Summary:`);
    console.log(`   ✅ Valid transactions: ${validCount}`);
    console.log(`   ❌ Invalid transactions: ${invalidCount}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Show first 3 transactions (valid or invalid) for debugging
    console.log('📋 Sample transactions (first 3):\n');
    transactions.slice(0, 3).forEach((t, idx) => {
      console.log(`${idx + 1}. ${t.orderNumber}`);
      console.log(`   totalAmount: $${t.totalAmount} (type: ${typeof t.totalAmount})`);
      console.log(`   Date: ${t.orderDate}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   Items: ${t.items?.length || 0}`);
      console.log();
    });

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the check
checkCustomer();
