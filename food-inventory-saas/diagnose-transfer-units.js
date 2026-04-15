require('dotenv').config();
const mongoose = require('mongoose');

async function diagnose() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const orders = await db.collection('transferorders').find({}).toArray();
  console.log(`\nTotal transfer orders: ${orders.length}`);

  let totalItems = 0;
  let itemsWithUnit = 0;
  let itemsWithoutUnit = 0;

  for (const order of orders) {
    for (const item of (order.items || [])) {
      totalItems++;
      if (item.selectedUnit || item.unitOfMeasure) {
        itemsWithUnit++;
      } else {
        itemsWithoutUnit++;
        console.log(`  [${order.orderNumber}] "${item.productName}" — sin unidad (productId: ${item.productId})`);
      }
    }
  }

  console.log(`\nResumen:`);
  console.log(`  Total ítems:        ${totalItems}`);
  console.log(`  Con unidad:         ${itemsWithUnit}`);
  console.log(`  Sin unidad (a migrar): ${itemsWithoutUnit}`);

  await mongoose.disconnect();
}

diagnose().catch(console.error);
