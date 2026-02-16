import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const salesBookSchema = new mongoose.Schema({
    tenantId: String,
    invoiceNumber: String,
    controlNumber: String,
    status: String,
    invoiceControlNumber: String,
    operationDate: Date,
    invoiceDate: Date,
    month: Number,
    year: Number
}, { strict: false }); // Strict false to allow editing bad docs

const IvaSalesBook = mongoose.model('IvaSalesBook', salesBookSchema);

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('No Mongo URI');

    await mongoose.connect(uri);
    console.log('Connected to Mongo (Repair Status)');

    // 1. Fix Status 'issued' -> 'confirmed'
    const statusResult = await IvaSalesBook.updateMany(
        { status: 'issued' },
        { $set: { status: 'confirmed' } }
    );
    console.log(`Updated Status: ${statusResult.modifiedCount} docs`);

    // 2. Fix missing invoiceControlNumber
    const controlResult = await IvaSalesBook.updateMany(
        { $or: [{ invoiceControlNumber: { $exists: false } }, { invoiceControlNumber: null }] },
        { $set: { invoiceControlNumber: 'N/A' } }
    );
    console.log(`Fixed Control Number: ${controlResult.modifiedCount} docs`);

    // 3. Fix missing operationDate (use invoiceDate or now)
    // First find them to copy date if needed
    const missingDate = await IvaSalesBook.find({ operationDate: { $exists: false } });
    let dateFixed = 0;
    for (const doc of missingDate) {
        // @ts-ignore
        const date = doc.invoiceDate || doc.createdAt || new Date('2026-01-30');
        // @ts-ignore
        await IvaSalesBook.updateOne({ _id: doc._id }, { $set: { operationDate: date } });
        dateFixed++;
    }
    console.log(`Fixed Operation Date: ${dateFixed} docs`);

    // 4. Fix missing month/year
    const missingPeriod = await IvaSalesBook.find({ month: { $exists: false } });
    let periodFixed = 0;
    for (const doc of missingPeriod) {
        // @ts-ignore
        const date = new Date(doc.invoiceDate || '2026-01-01');
        await IvaSalesBook.updateOne({ _id: doc._id }, {
            $set: {
                month: date.getMonth() + 1,
                year: date.getFullYear()
            }
        });
        periodFixed++;
    }
    console.log(`Fixed Period (Month/Year): ${periodFixed} docs`);

    await mongoose.disconnect();
}

run().catch(console.error);
