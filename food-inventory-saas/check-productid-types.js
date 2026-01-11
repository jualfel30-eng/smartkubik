require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const inventories = await db.collection('inventories').find({ 
      isActive: true,
      totalQuantity: { $gt: 0 }
    }).toArray();

    let objectIdCount = 0;
    let stringIdCount = 0;

    inventories.forEach(inv => {
      if (inv.productId instanceof mongoose.Types.ObjectId) {
        objectIdCount++;
      } else if (typeof inv.productId === 'string') {
        stringIdCount++;
        console.log('String productId:', inv.productName, '- ID:', inv.productId);
      } else {
        console.log('Unknown type:', inv.productName, '- Type:', typeof inv.productId);
      }
    });

    console.log('\n=== SUMMARY ===');
    console.log('ProductId as ObjectId:', objectIdCount);
    console.log('ProductId as String:', stringIdCount);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
