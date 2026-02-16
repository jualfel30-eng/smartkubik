import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const salesBookSchema = new mongoose.Schema({
    tenantId: String,
    invoiceNumber: String,
    originalCurrency: String,
    exchangeRate: Number,
    baseAmount: Number,
    ivaAmount: Number,
    totalAmount: Number,
    isForeignCurrency: Boolean
});

const IvaSalesBook = mongoose.model('IvaSalesBook', salesBookSchema);

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('No Mongo URI');

    await mongoose.connect(uri);
    // console.log('Connected to Mongo (Light Verify)');

    const entry: any = await IvaSalesBook.findOne({ invoiceNumber: 'F106' }).lean();

    if (entry) {
        console.log('=== SALES BOOK ENTRY F106 ===');
        console.log('Original Currency:', entry.originalCurrency);
        console.log('Exchange Rate:', entry.exchangeRate);
        console.log('Base Amount (VES):', entry.baseAmount);
        console.log('IVA Amount (VES):', entry.ivaAmount);
        console.log('Total Amount (VES):', entry.totalAmount);

        const expectedTotal = 60000;
        if (entry.totalAmount > expectedTotal) {
            console.log('SUCCESS: DB has converted VES value.');
        } else {
            console.log('FAILURE: DB still has USD-like value.');
        }
        console.log('=============================');
    } else {
        console.log('F106 NOT FOUND');
    }

    await mongoose.disconnect();
}

run().catch(console.error);
