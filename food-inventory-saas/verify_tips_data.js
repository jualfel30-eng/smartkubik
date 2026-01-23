// EMERGENCY DIAGNOSTIC SCRIPT - Verify tips data in MongoDB
require('dotenv').config();
const mongoose = require('mongoose');

async function verifyTipsData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
        console.log('✅ Connected to MongoDB');

        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

        // 1. Find ALL orders with tips
        const ordersWithTips = await Order.find({
            tipsRecords: { $exists: true, $ne: [] }
        }).select('orderNumber tipsRecords totalTipsAmount createdAt').lean();

        console.log('\n📊 ORDERS WITH TIPS FOUND:', ordersWithTips.length);

        if (ordersWithTips.length === 0) {
            console.log('❌ NO TIPS FOUND IN DATABASE');
            process.exit(0);
        }

        // 2. Analyze each order
        let totalTips = 0;
        let tipsWithEmployee = 0;
        let tipsWithoutEmployee = 0;

        ordersWithTips.forEach((order, idx) => {
            console.log(`\n--- Order ${idx + 1}: ${order.orderNumber} ---`);
            console.log('Created:', order.createdAt);
            console.log('Total Tips Amount:', order.totalTipsAmount || 0);
            console.log('Tips Records:', JSON.stringify(order.tipsRecords, null, 2));

            order.tipsRecords.forEach(tip => {
                totalTips += tip.amount || 0;
                if (tip.employeeId) {
                    tipsWithEmployee++;
                } else {
                    tipsWithoutEmployee++;
                }
            });
        });

        console.log('\n📈 SUMMARY:');
        console.log('Total tips amount:', totalTips);
        console.log('Tips with employeeId:', tipsWithEmployee);
        console.log('Tips WITHOUT employeeId:', tipsWithoutEmployee);

        // 3. Show the issue
        if (tipsWithoutEmployee > 0) {
            console.log('\n⚠️ PROBLEM IDENTIFIED:');
            console.log(`${tipsWithoutEmployee} tips are missing employeeId`);
            console.log('This is why they dont appear in dashboard');
            console.log('\n💡 SOLUTION: Run fix_tips_employee.js to add default employeeId');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ ERROR:', error);
        process.exit(1);
    }
}

verifyTipsData();
