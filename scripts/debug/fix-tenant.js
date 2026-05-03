const mongoose = require('mongoose');

async function fixTenant() {
  await mongoose.connect('mongodb://localhost:27017/food_inventory_db', {
    authSource: 'admin'
  });
  
  const tenantId = '67d022b3112baee9b28a2a1a'; // Assuming this might be the ID based on previous logs, or we can look it up by email
  
  // Actually let's just find the tenant by the owner's email from the logs: broas.admon@gmail.com
  const user = await mongoose.connection.collection('users').findOne({ email: 'broas.admon@gmail.com' });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  
  const tenant = await mongoose.connection.collection('tenants').findOne({ _id: user.tenantId });
  console.log('Current tenant limits:', JSON.stringify(tenant.limits, null, 2));
  console.log('Current tenant usage:', JSON.stringify(tenant.usage, null, 2));
  
  // Let's check how many products they actually have
  const productCount = await mongoose.connection.collection('products').countDocuments({ tenantId: tenant._id });
  console.log(`Actual products in DB: ${productCount}`);
  
  // Fix the usage counter if it's wrong, and set maxProducts to a very high number
  await mongoose.connection.collection('tenants').updateOne(
    { _id: tenant._id },
    { 
      $set: { 
        'usage.currentProducts': productCount,
        'limits.maxProducts': 999999
      } 
    }
  );
  
  console.log('Fixed tenant limits and usage sync. Ready to import again.');
  process.exit(0);
}

fixTenant().catch(console.error);
