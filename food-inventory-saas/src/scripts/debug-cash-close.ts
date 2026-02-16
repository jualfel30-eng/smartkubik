import 'dotenv/config';
import mongoose from 'mongoose';

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food-inventory?tls=false';
    console.log('Connecting to DB at:', uri);

    if (!uri) {
        console.error('MONGODB_URI not set');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const orders = await mongoose.connection.collection('orders').find({})
            .sort({ createdAt: -1 })
            .limit(3)
            .toArray();

        console.log('\n=============================================');
        console.log('--- LAST 3 ORDERS ---');
        console.log('=============================================');
        orders.forEach(o => {
            console.log(`Order: ${o.orderNumber} (ID: ${o._id})`);
            console.log(`Total: ${o.totalAmount} USD / ${o.totalAmountVes} VES`);
            console.log(`Paid: ${o.paidAmount} USD / ${o.paidAmountVes} VES`);
            console.log('Payment Records embedded:', JSON.stringify(o.paymentRecords, null, 2));
            console.log('-------------------');
        });

        const payments = await mongoose.connection.collection('payments').find({})
            .sort({ date: -1 })
            .limit(5)
            .toArray();

        console.log('\n=============================================');
        console.log('--- LAST 5 PAYMENTS ---');
        console.log('=============================================');
        payments.forEach(p => {
            console.log(`Payment ID: ${p._id}`);
            console.log(`Method: ${p.method}`);
            console.log(`Amount: ${p.amount} USD, AmtVes: ${p.amountVes} VES, Currency: ${p.currency}`);
            console.log(`Tendered: ${p.amountTendered}, Change: ${p.changeGiven}`);
            console.log(`Breakdown:`, JSON.stringify(p.changeGivenBreakdown, null, 2));
            console.log('-------------------');
        });

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
