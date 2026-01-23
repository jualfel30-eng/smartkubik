// EMERGENCY FIX - Add employeeId to tips that don't have it
require('dotenv').config();
const mongoose = require('mongoose');

async function fixTipsEmployee() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
        console.log('✅ Connected to MongoDB');

        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

        // Find orders with tips that don't have employeeId
        const orders = await Order.find({
            'tipsRecords': { $exists: true, $ne: [] }
        });

        console.log(`Found ${orders.length} orders with tips`);

        let fixed = 0;
        for (const order of orders) {
            let needsUpdate = false;

            order.tipsRecords.forEach(tip => {
                if (!tip.employeeId && order.assignedWaiterId) {
                    console.log(`Fixing tip in order ${order.orderNumber}: adding employeeId ${order.assignedWaiterId}`);
                    tip.employeeId = order.assignedWaiterId;
                    needsUpdate = true;
                }
            });

            if (needsUpdate) {
                await order.save();
                fixed++;
            }
        }

        console.log(`\n✅ Fixed ${fixed} orders`);
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ ERROR:', error);
        process.exit(1);
    }
}

fixTipsEmployee();
