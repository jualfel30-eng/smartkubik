require('dotenv').config();
const mongoose = require('mongoose');

async function deletePollo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const tenantId = new mongoose.Types.ObjectId("68d371dffdb57e5c800f2fcd");
    
    console.log('=== DELETING POLLO FOR TENANT ' + tenantId.toString() + ' ===\n');
    
    // 1. Get inventory item first to get productId
    const inventoryItem = await db.collection('inventories').findOne({ 
      tenantId: tenantId,
      productName: 'Pollo Congelado'
    });
    
    if (!inventoryItem) {
      console.log('No inventory item found for Pollo Congelado');
      await mongoose.connection.close();
      return;
    }
    
    console.log('Found inventory item:', inventoryItem._id);
    
    const productId = inventoryItem.productId;
    const productIdObj = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;
    
    // 2. Delete inventory item
    const invResult = await db.collection('inventories').deleteOne({ 
      _id: inventoryItem._id 
    });
    console.log('Deleted inventory item:', invResult.deletedCount, 'document(s)');
    
    // 3. Delete product (only if it belongs to this tenant)
    const product = await db.collection('products').findOne({ _id: productIdObj });
    
    if (product) {
      // Verify it belongs to this tenant
      const productTenantId = product.tenantId;
      const productTenantStr = productTenantId instanceof mongoose.Types.ObjectId 
        ? productTenantId.toString() 
        : productTenantId;
      const targetTenantStr = tenantId.toString();
      
      if (productTenantStr === targetTenantStr) {
        const prodResult = await db.collection('products').deleteOne({ 
          _id: productIdObj 
        });
        console.log('Deleted product:', prodResult.deletedCount, 'document(s)');
      } else {
        console.log('Product belongs to different tenant, NOT deleted');
        console.log('  Product tenant:', productTenantStr);
        console.log('  Target tenant:', targetTenantStr);
      }
    } else {
      console.log('Product not found in database');
    }
    
    console.log('\n=== DELETION COMPLETE ===');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deletePollo();
