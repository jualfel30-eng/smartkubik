require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // Get a product that has 0 variants
    const product = await db.collection('products').findOne({ 
      name: 'Queso Blanco Test Multi-Unit'
    });

    console.log('Product "Queso Blanco Test Multi-Unit":');
    console.log('Fields:', Object.keys(product || {}));
    console.log('Has variants array:', Array.isArray(product.variants));
    console.log('Variants length:', product.variants ? product.variants.length : 0);
    console.log('Has pricingRules:', !!product.pricingRules);
    
    if (product.variants && product.variants.length > 0) {
      console.log('\nFirst variant:');
      console.log(product.variants[0]);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
