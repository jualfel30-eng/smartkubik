const mongoose = require('mongoose');
const uri = "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";
async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // El tenant real del usuario admin
    const tIdString = "69c71e7840187515237b821f";
    const tId = new mongoose.Types.ObjectId(tIdString);
    const tenant = await db.collection('tenants').findOne({ _id: tId });
    console.log("TENANT FOUND:", tenant ? tenant.name : null);
    
    const services = await db.collection('services').find({ $or: [{tenantId: tId}, {tenant: tId}, {tenantId: tIdString}, {tenant: tIdString}] }).toArray();
    console.log(`\n--- SERVICES (${services.length}) ---`);
    services.forEach(s => console.log(`- ${s.name}: ${s.description || 'No description'} (has image: ${!!s.image || !!(s.images && s.images.length > 0)})`));

    const resources = await db.collection('resources').find({ $or: [{tenantId: tId}, {tenant: tId}, {tenantId: tIdString}, {tenant: tIdString}] }).toArray();
    console.log(`\n--- RESOURCES (${resources.length}) ---`);
    resources.forEach(r => console.log(`- ${r.name} (${r.type || 'N/A'})`));
    
    const products = await db.collection('products').find({ $or: [{tenantId: tId}, {tenant: tId}, {tenantId: tIdString}, {tenant: tIdString}] }).toArray();
    console.log(`\n--- PRODUCTS (${products.length}) ---`);
    products.forEach(p => console.log(`- ${p.name}: ${p.description || 'No description'}`));

  } catch(e) { console.error(e); } 
  finally { await mongoose.disconnect(); }
}
run();
