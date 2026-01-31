import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const billingSchema = new mongoose.Schema({
    documentNumber: String,
    issueDate: Date,
    totals: {
        currency: String,
        exchangeRate: Number,
        grandTotal: Number
    },
    type: String
});

const BillingDocument = mongoose.model('BillingDocument', billingSchema);

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('No Mongo URI');

    await mongoose.connect(uri);
    console.log('Connected to Mongo');

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-31T23:59:59.000Z');

    const docs = await BillingDocument.find({
        issueDate: { $gte: startDate, $lte: endDate },
        type: { $ne: 'quote' }
    }).lean();

    console.log('=== JAN 2026 INVOICE SCAN (LIGHT) ===');
    console.log('Count:', docs.length);
    docs.forEach(doc => {
        // @ts-ignore
        console.log(`[${doc.documentNumber}] Total: ${doc.totals?.grandTotal}, Rate: ${doc.totals?.exchangeRate}, Cur: ${doc.totals?.currency}`);
    });
    console.log('=====================================');

    await mongoose.disconnect();
}

run().catch(console.error);
