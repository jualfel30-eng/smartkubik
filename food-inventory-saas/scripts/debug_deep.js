require('dotenv').config({ path: '../food-inventory-saas/.env' });
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

async function debugDeep() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const ratingsColl = db.collection('purchaseorderratings');
        const poColl = db.collection('purchaseorders');

        // Target Rating ID from previous log: 6960379e7f6302020690bc09
        // Target PO ID: 696037917f6302020690bb83

        const targetRatingId = new ObjectId("6960379e7f6302020690bc09");
        const rating = await ratingsColl.findOne({ _id: targetRatingId });

        if (!rating) {
            console.log("Target rating not found!");
            return;
        }

        console.log("=== RATING DOC ===");
        console.log("ID:", rating._id);
        console.log("PO ID:", rating.purchaseOrderId);
        console.log("PO ID Type:", rating.purchaseOrderId ? rating.purchaseOrderId.constructor.name : 'Unknown');
        console.log("PO ID Hex:", rating.purchaseOrderId.toString());

        const targetPoIdHex = rating.purchaseOrderId.toString();

        console.log("\n=== SEARCHING PO ===");

        // 1. Search as ObjectId
        console.log(`Searching as ObjectId(${targetPoIdHex})...`);
        const poObj = await poColl.findOne({ _id: new ObjectId(targetPoIdHex) });
        console.log("Result (ObjectId):", poObj ? "FOUND" : "NOT FOUND");

        // 2. Search as String
        console.log(`Searching as String("${targetPoIdHex}")...`);
        const poStr = await poColl.findOne({ _id: targetPoIdHex });
        console.log("Result (String):", poStr ? "FOUND" : "NOT FOUND");

        console.log("\n=== SAMPLE POs ===");
        const samples = await poColl.find({}).limit(5).toArray();
        samples.forEach(s => {
            console.log(`PO _id: ${s._id} (Type: ${s._id.constructor.name})`);
        });

    } catch (e) { console.error(e); }
    finally { await mongoose.disconnect(); }
}
debugDeep();
