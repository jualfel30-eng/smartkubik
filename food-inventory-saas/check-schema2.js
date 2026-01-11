const mongoose = require('mongoose');

async function checkSchema() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory');

  const inventory = await mongoose.connection.db.collection('inventories').findOne({});
  console.log('Any Inventory:', JSON.stringify(inventory, null, 2));

  const inventoryCount = await mongoose.connection.db.collection('inventories').countDocuments({});
  console.log('\nTotal inventories:', inventoryCount);

  const inventoryWithQty = await mongoose.connection.db.collection('inventories').countDocuments({ totalQuantity: { $gt: 0 } });
  console.log('Inventories with quantity > 0:', inventoryWithQty);

  if (inventory && inventory.productId) {
    const product = await mongoose.connection.db.collection('products').findOne({ _id: inventory.productId });
    console.log('\n\nProduct sample:', JSON.stringify(product, null, 2));
  }

  await mongoose.connection.close();
}

checkSchema().catch(console.error);
