/**
 * Test the /customers/:id/transactions endpoint
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';
const CUSTOMER_ID = '68f6b997f0fedc073262c403'; // Diana Moreira

// Import the service logic directly
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

async function testEndpoint() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const CustomerTransaction = mongoose.model('CustomerTransactionHistory', customerTransactionSchema);

    // Simulate what the controller does
    const query = {
      customerId: new mongoose.Types.ObjectId(CUSTOMER_ID),
      // Note: We don't have tenantId in the test, but let's see what we get
    };

    const transactions = await CustomerTransaction
      .find(query)
      .sort({ orderDate: -1 })
      .lean();

    console.log(`📊 Query result: ${transactions.length} transactions\n`);

    if (transactions.length === 0) {
      console.log('❌ No transactions found!');
      console.log('Query used:', JSON.stringify(query, null, 2));
    } else {
      console.log('✅ Transactions found!');
      console.log('\nFirst transaction:');
      console.log('  Order Number:', transactions[0].orderNumber);
      console.log('  Total Amount:', transactions[0].totalAmount);
      console.log('  Date:', transactions[0].orderDate);
      console.log('  Items:', transactions[0].items?.length || 0);
      console.log('  Tenant ID:', transactions[0].tenantId);

      // Show structure
      console.log('\n📋 Transaction structure:');
      console.log(JSON.stringify(transactions[0], null, 2).substring(0, 1000) + '...');

      // Check if any have invalid totalAmount
      const invalid = transactions.filter(t => isNaN(t.totalAmount));
      if (invalid.length > 0) {
        console.log(`\n⚠️ Found ${invalid.length} transactions with NaN totalAmount`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testEndpoint();
