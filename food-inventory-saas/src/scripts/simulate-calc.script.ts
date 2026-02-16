import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const salesBookSchema = new mongoose.Schema({
    tenantId: String,
    month: Number,
    year: Number,
    status: String,
    totalAmount: Number,
    invoiceNumber: String
}, { strict: false });

const IvaSalesBook = mongoose.model('IvaSalesBook', salesBookSchema);

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('No Mongo URI');
    await mongoose.connect(uri);

    console.log("=== SIMULATING BACKEND CALCULATION ===");
    // Query exactly matching IvaSalesBookService.getBookByPeriod
    const query = {
        // tenantId: '68d371dffdb57e5c800f2fcd', // From previous logs
        month: 1,
        year: 2026,
        status: { $in: ['confirmed', 'exported'] }
    };

    const docs = await IvaSalesBook.find(query);
    const total = docs.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

    console.log(`Query:`, JSON.stringify(query));
    console.log(`Found Records: ${docs.length}`);
    console.log(`TOTAL CALCULATED VIA CONFIRMED DOCS: Bs. ${total.toLocaleString('es-VE')}`);

    if (docs.length > 0) {
        console.log(`Sample Doc: ${docs[0].invoiceNumber} - Status: ${docs[0].status}`);
    }

    await mongoose.disconnect();
}

run().catch(console.error);
