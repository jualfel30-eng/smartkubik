const mongoose = require('mongoose');
const uri = "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const searches = ["Corte Clásico", "Barba Completa", "Tinte de Cabello"];
    
    console.log("Buscando en colección 'services'...");
    for(const name of searches) {
        const items = await db.collection('services').find({ name: { $regex: new RegExp(name, 'i') } }).toArray();
        if(items.length > 0) {
            console.log(`Encontrado '${name}' en SERVICES: tenant=${items[0].tenant || items[0].tenantId}`);
        }
    }

    console.log("\nBuscando en colección 'products'...");
    for(const name of searches) {
        const items = await db.collection('products').find({ name: { $regex: new RegExp(name, 'i') } }).toArray();
        if(items.length > 0) {
            console.log(`Encontrado '${name}' en PRODUCTS: tenant=${items[0].tenant || items[0].tenantId}`);
        }
    }
    
    // Retrieve ALL services for that found tenant, just to be sure we get the same 8 items.
    // If we find one, let's use its tenant
    const sample = await db.collection('services').findOne({ name: { $regex: /Corte Clásico/i } });
    if(sample) {
        const realTenantId = sample.tenant || sample.tenantId;
        console.log(`\nVamos a listar todos los servicios de tenant: ${realTenantId}`);
        const allServices = await db.collection('services').find({ $or: [{tenant: realTenantId}, {tenantId: realTenantId}]}).toArray();
        console.log(`Total services for this tenant: ${allServices.length}`);
        allServices.forEach(s => console.log(`- ${s.name}`));
    }
  } catch(e) { console.error(e); } 
  finally { await mongoose.disconnect(); }
}
run();
