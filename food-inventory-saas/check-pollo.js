require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const tenantId = new mongoose.Types.ObjectId("68d371dffdb57e5c800f2fcd");
    
    console.log('=== CHECKING POLLO DATA FOR TENANT ===\n');
    
    // 1. Find inventory items for pollo
    const inventoryItems = await db.collection('inventories').find({ 
      tenantId: tenantId,
      productName: /pollo/i
    }).toArray();
    
    console.log('Inventory items for Pollo:');
    inventoryItems.forEach(inv => {
      console.log('  ID:', inv._id);
      console.log('  Name:', inv.productName);
      console.log('  ProductId:', inv.productId);
      console.log('  Quantity:', inv.totalQuantity);
      console.log('  Reserved:', inv.reservedQuantity);
      console.log('');
    });
    
    // 2. Find the product
    if (inventoryItems.length > 0) {
      const productId = inventoryItems[0].productId;
      const productIdObj = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;
      
      const product = await db.collection('products').findOne({ _id: productIdObj });
      if (product) {
        console.log('Product found:');
        console.log('  ID:', product._id);
        console.log('  Name:', product.name);
        console.log('  SKU:', product.sku);
        console.log('');
      } else {
        console.log('Product NOT found in database\n');
      }
      
      // 3. Check for orders with pollo
      const orders = await db.collection('orders').find({
        tenantId: tenantId.toString(),
        'items.productName': /pollo/i
      }).toArray();
      
      console.log('Orders containing Pollo: ' + orders.length);
      orders.forEach(order => {
        console.log('  Order:', order.orderNumber);
        console.log('  Status:', order.status);
        const polloItems = order.items.filter(i => /pollo/i.test(i.productName));
        polloItems.forEach(item => {
          console.log('    Item:', item.productName, '- Qty:', item.quantity);
        });
      });
      console.log('');
      
      // 4. Check for inventory movements
      const movements = await db.collection('inventorymovements').find({
        tenantId: tenantId,
        productSku: { $regex: /pollo/i }
      }).toArray();
      
      console.log('Inventory movements for Pollo: ' + movements.length);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
