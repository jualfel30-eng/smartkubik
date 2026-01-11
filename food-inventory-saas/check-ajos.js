require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const tenantId = new mongoose.Types.ObjectId("68d371dffdb57e5c800f2fcd");
    
    console.log('=== CHECKING AJO DATA FOR TENANT ===\n');
    
    // Find all inventory items for ajo
    const inventoryItems = await db.collection('inventories').find({ 
      tenantId: tenantId,
      productName: /ajo/i
    }).toArray();
    
    console.log('Found ' + inventoryItems.length + ' inventory items for Ajo:\n');
    
    const productIds = new Set();
    
    inventoryItems.forEach((inv, i) => {
      console.log((i + 1) + '. Inventory ID:', inv._id.toString());
      console.log('   Name:', inv.productName);
      console.log('   ProductId:', inv.productId);
      console.log('   ProductId type:', typeof inv.productId);
      console.log('   Quantity:', inv.totalQuantity);
      console.log('   Reserved:', inv.reservedQuantity);
      console.log('');
      
      const pid = inv.productId instanceof mongoose.Types.ObjectId 
        ? inv.productId.toString() 
        : inv.productId;
      productIds.add(pid);
    });
    
    console.log('Unique product IDs: ' + productIds.size);
    console.log('Product IDs:', Array.from(productIds));
    console.log('');
    
    // Check for orders with ajo
    const orders = await db.collection('orders').find({
      tenantId: tenantId.toString(),
      'items.productName': /ajo/i
    }).toArray();
    
    console.log('Orders containing Ajo: ' + orders.length);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
