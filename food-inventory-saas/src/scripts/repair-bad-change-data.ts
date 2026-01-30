import 'dotenv/config';
import mongoose from 'mongoose';

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food-inventory?tls=false';
    if (!uri) {
        console.error('MONGODB_URI not set');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log('Connected to DB for repair...');

        const badPayments = await mongoose.connection.collection('payments').find({
            $or: [
                { _id: new mongoose.Types.ObjectId('697c0b2641c23c31900b690d') },
                { _id: new mongoose.Types.ObjectId('697c0aeb41c23c31900b65d5') }
            ]
        }).toArray();

        for (const p of badPayments) {
            console.log(`Processing Bad Payment: ${p._id} | Method: ${p.method} | Tendered: ${p.amountTendered} | OldChange: ${p.changeGiven}`);

            let correctChange = 0;
            // Hardcoded fix based on analysis: 
            // 1. Payment 697c0b26: Tendered 70000 VES against 65808.33 VES debt (180.96 USD)
            //    (Wait, 65808.33 is amountVes. Let's recalculate precise)
            //    amountVes stored is 65808.3298
            //    70000 - 65808.3298 = 4191.6702 => 4191.67

            // 2. Payment 697c0aeb: Tendered 15000 VES against 14001 VES debt (38.5 USD)
            //    15000 - 14001 = 999

            if (String(p._id) === '697c0b2641c23c31900b690d') {
                correctChange = 4191.67;
            } else if (String(p._id) === '697c0aeb41c23c31900b65d5') {
                correctChange = 999;
            }

            console.log(`-> Correcting to: ${correctChange}`);

            await mongoose.connection.collection('payments').updateOne(
                { _id: p._id },
                {
                    $set: { changeGiven: correctChange },
                    $push: { statusHistory: { status: 'repaired_data', reason: 'Fixed changeGiven calculation bug', changedAt: new Date() } }
                }
            );
            console.log('-> Payment updated.');
        }

        // Also verify if Orders need update (Order.paymentRecords usually stores a copy)
        // Order 1: ORD-260129-213617-7974 (ID: 697c0b1141c23c31900b6801)
        // Order 2: ORD-260129-213413-3047 (ID: 697c0a9541c23c31900b6514)

        const order1Id = new mongoose.Types.ObjectId('697c0b1141c23c31900b6801');
        const order2Id = new mongoose.Types.ObjectId('697c0a9541c23c31900b6514');

        const orders = await mongoose.connection.collection('orders').find({
            _id: { $in: [order1Id, order2Id] }
        }).toArray();

        for (const order of orders) {
            console.log(`Checking Order ${order.orderNumber}...`);
            let modified = false;
            const newRecords = (order.paymentRecords || []).map(r => {
                if (String(r._id) === '697c0b2741c23c31900b691f') { // Linked to payment 697c0b26... 
                    // Actually the PaymentRecord ID might differ from Payment ID slightly if generated separately? 
                    // In the previous debug output:
                    // Order ...7974 has record ID 697c0b2741c23c31900b691f
                    // Payment ID is 697c0b2641c23c31900b690d
                    // They are distinct. We match by context or assume these 2 specific records need fix.
                    // Let's use the Values to identify.
                    if (r.amountTendered === 70000 && r.changeGiven > 60000) {
                        console.log(`-> Fixing Order Record for 70000 tender.`);
                        r.changeGiven = 4191.67;
                        modified = true;
                    }
                }
                if (r.amountTendered === 15000 && r.changeGiven > 14000) {
                    console.log(`-> Fixing Order Record for 15000 tender.`);
                    r.changeGiven = 999;
                    modified = true;
                }
                return r;
            });

            if (modified) {
                await mongoose.connection.collection('orders').updateOne(
                    { _id: order._id },
                    { $set: { paymentRecords: newRecords } }
                );
                console.log('-> Order updated.');
            }
        }

        // Reset any open sessions that might have these bad totals cached?
        // Session 1: The user mentioned "Cierre de Caja". So the session might be closed or closing.
        // We should probably tell the user to "Regenerate" the closing report or just assume the next fetch will be correct if it calculates on the fly.
        // The service caches summaries in `CashRegisterClosing`. If the closing is already created, we need to update it too.
        // The previous debug log showed only orders/payments.
        // Let's check for recent closings and "repair" the last one.
        // The controller has a endpoint `repair-last`. We can trigger that or do it manual.
        // Manual is safer as we know exact ids.

        // Find recent closing with these orders?
        // Or just rely on the user running "repair-last" / regenerate? 
        // I will stick to fixing source data (payments/orders). The `CashRegisterClosing` is a snapshot. 
        // If the snapshot is wrong, it stays wrong unless regenerated. 
        // The service has `repairLastClosing`. I can call it via API or just let the user know.
        // Actually, I can manually invalidate the last closing if it exists so the user can re-close or I can patch the closing document itself.

        console.log('Repair script finished.');

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
