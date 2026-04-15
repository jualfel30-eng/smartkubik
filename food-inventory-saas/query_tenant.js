const mongoose = require('mongoose');
const uri = "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection.db;
    
    console.log("Connected...");
    const user = await db.collection('users').findOne({ email: 'savageorganicsolutions+test100@gmail.com' });
    if(user) {
        console.log("USER:", JSON.stringify(user, null, 2));
    }
    
    // Also try to find tenant by name "Savage"
    const tenantByName = await db.collection('tenants').findOne({ name: { $regex: /Savage/i } });
    if(tenantByName) {
        console.log("TENANT FOUND BY NAME:", tenantByName.name, tenantByName._id);
        const tId = tenantByName._id;
        
        const services = await db.collection('services').find({ tenant: tId }).toArray();
        console.log(`\n--- SERVICES (${services.length}) ---`);
        services.forEach(s => console.log(`- ${s.name}: ${s.description || 'No description'} (has image: ${!!s.image || !!(s.images && s.images.length > 0)})`));

        const products = await db.collection('products').find({ tenant: tId }).toArray();
        console.log(`\n--- PRODUCTS (${products.length}) ---`);
        products.forEach(p => console.log(`- ${p.name}: ${p.description || 'No description'} (has image: ${!!p.image || !!(p.images && p.images.length > 0)})`));
        
        const resources = await db.collection('resources').find({ tenant: tId }).toArray();
        console.log(`\n--- RESOURCES (${resources.length}) ---`);
        resources.forEach(r => console.log(`- ${r.name} (${r.type || 'N/A'}) (has image: ${!!r.image})`));
        
        const staff = await db.collection('staff').find({ tenant: tId }).toArray();
        console.log(`\n--- STAFF (${staff.length}) ---`);
        staff.forEach(s => console.log(`- ${s.name} (${s.role || 'N/A'}) (has avatar: ${!!s.avatarUrl})`));
        
    } else {
        console.log("No tenant containing 'Savage' found.");
    }
  } catch(e) { 
      console.error(e); 
  } finally { 
      await mongoose.disconnect(); 
  }
}
run();
