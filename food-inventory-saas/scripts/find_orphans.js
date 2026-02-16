require('dotenv').config({ path: '../food-inventory-saas/.env' });
const mongoose = require('mongoose');

async function findOrphanRatings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        // 1. Check if collection exists
        const collections = await db.listCollections().toArray();
        const ratingCollection = collections.find(c => c.name === 'purchaseorderratings');

        if (!ratingCollection) {
            console.log("Collection 'purchaseorderratings' DOES NOT EXIST.");
            return;
        }

        const ratingsColl = db.collection('purchaseorderratings');
        const poColl = db.collection('purchaseorders');

        // 2. Count ratings
        const allRatings = await ratingsColl.find({}).toArray();
        console.log(`Total ratings found in 'purchaseorderratings': ${allRatings.length}`);

        if (allRatings.length === 0) return;

        // 3. Analyze Orphans
        let recoveredCount = 0;
        console.log("\n--- Analyzing Linkages ---");

        for (const rating of allRatings) {
            const poId = rating.purchaseOrderId; // Usually ObjectId

            // Try to find the PO
            // Try as ObjectId
            let po = await poColl.findOne({ _id: poId });

            // Try as String if not found (legacy check)
            if (!po && poId) {
                po = await poColl.findOne({ _id: poId.toString() });
            }

            if (po) {
                const isLinked = po.rating === rating.rating;
                console.log(`Rating ${rating._id} -> PO ${po.poNumber}: ${isLinked ? 'LINKED OK' : 'MISMATCH (Orphan?)'}`);
                if (!isLinked) {
                    console.log(`   PO TenantId Type: ${po.tenantId ? po.tenantId.constructor.name : 'null'}`);
                    console.log(`   Rating TenantId Type: ${rating.tenantId ? rating.tenantId.constructor.name : 'null'}`);
                }
            } else {
                console.log(`Rating ${rating._id} -> PO ${poId}: PO NOT FOUND`);
            }
        }

    } catch (e) { console.error(e); }
    finally { await mongoose.disconnect(); }
}
findOrphanRatings();
