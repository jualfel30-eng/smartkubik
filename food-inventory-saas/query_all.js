const mongoose = require('mongoose');
const uri = "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";
async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log("Searching in all collections for 'Corte Clásico'...");
    for(const col of collections) {
        if(col.name.startsWith('system.')) continue;
        
        const docs = await db.collection(col.name).find({}).toArray();
        for(const doc of docs) {
            const str = JSON.stringify(doc);
            if(str.includes("Corte Cl")) {
                console.log(`\nFOUND inside collection: ${col.name}`);
                console.log(`Doc ID: ${doc._id}`);
                console.log(`Doc Content: ${str.substring(0, 200)}...`);
            }
        }
    }
    console.log("End of search.");
  } catch(e) { console.error(e); } 
  finally { await mongoose.disconnect(); }
}
run();
