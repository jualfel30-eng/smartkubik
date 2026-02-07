require('dotenv').config({ path: '../food-inventory-saas/.env' });
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

async function recoverRatings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const ratingsColl = db.collection('purchaseorderratings');
        const poColl = db.collection('purchaseorders');
        const customerColl = db.collection('customers');
        const supplierColl = db.collection('suppliers');

        const allRatings = await ratingsColl.find({}).toArray();
        console.log(`Found ${allRatings.length} ratings. Attempting recovery...`);

        let updatedCount = 0;
        const suppliersToRecalculate = new Set();

        for (const rating of allRatings) {
            const poId = rating.purchaseOrderId;

            // Find PO with Hybrid Filter
            let po = await poColl.findOne({ _id: poId });

            // If not found, try converting types
            if (!po && poId) {
                // If it's a string looking like ObjectId, try as ObjectId
                if (typeof poId === 'string' && ObjectId.isValid(poId)) {
                    po = await poColl.findOne({ _id: new ObjectId(poId) });
                }
                // If it's an ObjectId, try as string (legacy check)
                else if (poId instanceof ObjectId) {
                    po = await poColl.findOne({ _id: poId.toString() });
                }
            }

            if (po) {
                // Update PO with rating
                await poColl.updateOne(
                    { _id: po._id },
                    { $set: { rating: rating.rating } }
                );
                console.log(`✅ Recovered: Rating ${rating.rating} -> PO ${po.poNumber}`);
                updatedCount++;

                // Add supplier ID to set for recalculation
                if (po.supplierId) {
                    suppliersToRecalculate.add(po.supplierId); // Can be String or ObjectId
                }
            } else {
                console.log(`❌ Failed: Rating ${rating._id} -> PO ${poId} NOT FOUND`);
            }
        }

        console.log(`\nUpdated ${updatedCount} Purchase Orders.`);
        console.log(`Recalculating metrics for ${suppliersToRecalculate.size} suppliers...`);

        // Recalculate Logic
        for (const supplierId of suppliersToRecalculate) {

            // Hybrid Supplier Find
            let supplierIdFilter = supplierId;
            // If string literal looks like ObjectId, try both
            if (typeof supplierId === 'string' && ObjectId.isValid(supplierId)) {
                supplierIdFilter = { $in: [supplierId, new ObjectId(supplierId)] };
            }

            // Find all rated orders for this supplier (using hybrid supplier ID filter)
            // Note: need to handle supplierId in PO being mixed too
            // But simpler: just query POs where supplierId matches this ID
            const ratedOrders = await poColl.find({
                supplierId: supplierIdFilter, // This might need broader search if POs have mixed supplierIds, but let's trust the set we built
                rating: { $exists: true, $ne: null }
            }).toArray();

            const total = ratedOrders.length;
            const sum = ratedOrders.reduce((acc, r) => acc + (r.rating || 0), 0);
            const avg = total > 0 ? Number((sum / total).toFixed(2)) : 0;

            console.log(`Supplier ${supplierId}: ${total} ratings, Avg ${avg}`);

            // Update Customer (Supplier Profile)
            // Try both String and ObjectId _id
            let custUpdateFilter = { _id: supplierId };
            if (typeof supplierId === 'string' && ObjectId.isValid(supplierId)) {
                custUpdateFilter = { _id: new ObjectId(supplierId) };
                // Try finding it first to be sure
                if (!await customerColl.findOne(custUpdateFilter)) {
                    custUpdateFilter = { _id: supplierId }; // Fallback to string
                }
            }

            await customerColl.updateOne(
                custUpdateFilter,
                { $set: { 'metrics.averageRating': avg, 'metrics.totalRatings': total } }
            );

            // Update explicit Supplier doc if exists
            if (ObjectId.isValid(supplierId.toString())) {
                await supplierColl.updateOne(
                    { customerId: new ObjectId(supplierId.toString()) },
                    { $set: { 'metrics.averageRating': avg, 'metrics.totalRatings': total } }
                );
            }
        }

    } catch (e) { console.error(e); }
    finally { await mongoose.disconnect(); }
}
recoverRatings();
