// VERIFY WHY DASHBOARD SHOWS ONLY $10
require('dotenv').config();
const mongoose = require('mongoose');

async function diagnoseConsolidatedReport() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
        console.log('✅ Connected to MongoDB');

        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

        // This is what getConsolidatedReport queries
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Last week

        console.log('\n🔍 Query used by getConsolidatedReport:');
        console.log('Start:', startDate);
        console.log('End:', endDate);

        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ["completed", "closed"] },
            totalTipsAmount: { $gt: 0 },
        }).select('orderNumber status totalTipsAmount tipsRecords createdAt').lean();

        console.log('\n📊 ORDERS MATCHING QUERY:', orders.length);

        let total = 0;
        orders.forEach((order, idx) => {
            console.log(`\n${idx + 1}. ${order.orderNumber}`);
            console.log('   Status:', order.status);
            console.log('   Total Tips:', order.totalTipsAmount);
            console.log('   Created:', order.createdAt);
            total += order.totalTipsAmount || 0;
        });

        console.log('\n💰 TOTAL FROM QUERY:', total);

        // Now check ALL orders with tips regardless of status
        const allWithTips = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            totalTipsAmount: { $gt: 0 },
        }).select('orderNumber status totalTipsAmount').lean();

        console.log('\n\n🔍 ALL ORDERS WITH TIPS (any status):', allWithTips.length);

        const byStatus = {};
        let totalAll = 0;
        allWithTips.forEach(order => {
            byStatus[order.status] = (byStatus[order.status] || 0) + 1;
            totalAll += order.totalTipsAmount || 0;
        });

        console.log('By status:', byStatus);
        console.log('Total (all statuses):', totalAll);

        console.log('\n⚠️ PROBLEM: getConsolidatedReport only looks at status "completed" or "closed"');
        console.log('But most orders might be in "confirmed" or "paid" status');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ ERROR:', error);
        process.exit(1);
    }
}

diagnoseConsolidatedReport();
