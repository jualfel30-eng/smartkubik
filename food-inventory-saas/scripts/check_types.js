require('dotenv').config({ path: '../food-inventory-saas/.env' });
const mongoose = require('mongoose');

async function checkTypes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-db');
        const db = mongoose.connection.db;
        const collection = db.collection('purchaseorders');

        // Find one order for the target supplier/tenant
        // We know the ID from previous debug: 6982701d3c3ab059f14b6399 (Customer ID of Distribuidora)
        // Or just find ANY order and list its types

        const cursor = collection.find({}).limit(5);
        const docs = await cursor.toArray();

        console.log("=== TYPE CHECK ===");
        docs.forEach(doc => {
            console.log(`PO: ${doc.poNumber}`);
            console.log(`  supplierId: ${doc.supplierId} (Type: ${doc.supplierId ? doc.supplierId.constructor.name : 'null'})`);
            console.log(`  tenantId: ${doc.tenantId} (Type: ${doc.tenantId ? doc.tenantId.constructor.name : 'null'})`);
            console.log("---");
        });

    } catch (e) { console.error(e); }
    finally { await mongoose.disconnect(); }
}
checkTypes();
