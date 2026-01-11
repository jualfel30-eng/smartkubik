require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // Get inventory for "Ghee" which showed as having variants
    const inv = await db.collection('inventories').findOne({ 
      productName: 'Ghee'
    });
    
    console.log('Inventory for Ghee:');
    console.log('  productId:', inv.productId);
    console.log('  variantSku:', inv.variantSku);
    console.log('  averageCostPrice:', inv.averageCostPrice);
    
    // Get the product
    const product = await db.collection('products').findOne({ _id: inv.productId });
    
    console.log('\nProduct:');
    console.log('  name:', product.name);
    console.log('  sku:', product.sku);
    console.log('  variants count:', product.variants.length);
    
    if (product.variants.length > 0) {
      console.log('\nVariants:');
      product.variants.forEach((v, i) => {
        console.log('  Variant', i + 1);
        console.log('    sku:', v.sku);
        console.log('    costPrice:', v.costPrice);
        console.log('    basePrice:', v.basePrice);
        console.log('    unitSize:', v.unitSize);
      });
    }
    
    // Now check one that showed 0 variants - "Fresas"
    console.log('\n=== Checking Fresas ===');
    const inv2 = await db.collection('inventories').findOne({ 
      productName: 'Fresas'
    });
    
    if (inv2) {
      console.log('Inventory for Fresas:');
      console.log('  productId:', inv2.productId);
      console.log('  variantSku:', inv2.variantSku);
      
      const product2 = await db.collection('products').findOne({ _id: inv2.productId });
      
      if (product2) {
        console.log('\nProduct found:');
        console.log('  name:', product2.name);
        console.log('  sku:', product2.sku);
        console.log('  variants count:', product2.variants.length);
        
        if (product2.variants && product2.variants.length > 0) {
          console.log('\nVariants:');
          product2.variants.forEach((v, i) => {
            console.log('  Variant', i + 1);
            console.log('    sku:', v.sku);
            console.log('    costPrice:', v.costPrice);
            console.log('    basePrice:', v.basePrice);
          });
        }
      } else {
        console.log('Product NOT found in database!');
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
