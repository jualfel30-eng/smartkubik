import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const salesBookSchema = new mongoose.Schema({
    invoiceNumber: String,
    baseAmount: Number,
    ivaRate: Number,
    ivaAmount: Number,
    totalAmount: Number,
    isForeignCurrency: Boolean,
    exchangeRate: Number,
    customerRif: String,
    invoiceControlNumber: String,
    invoiceDate: Date,
    isElectronic: Boolean,
    electronicCode: String,
    customerName: String,
    status: String,
    tenantId: String
}, { strict: false });

const IvaSalesBook = mongoose.model('IvaSalesBook', salesBookSchema);

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('No Mongo URI');

    await mongoose.connect(uri);

    // Fetch ALL confirmed documents for Jan 2026
    const entries = await IvaSalesBook.find({
        month: 1,
        year: 2026,
        status: 'confirmed'
    });

    console.log(`Checking ${entries.length} CONFIRMED entries...`);

    let errorCount = 0;
    for (const doc of entries) {
        const entry: any = doc;
        const errors: string[] = [];

        // Check 1: Math (Tolerance 2.0)
        if (entry.baseAmount >= 0) {
            const expectedIva = (entry.baseAmount * (entry.ivaRate || 0)) / 100;
            const diff = Math.abs(expectedIva - (entry.ivaAmount || 0));
            if (diff > 2.0) {
                errors.push(`Math Error: Reg=${entry.ivaAmount}, Exp=${expectedIva.toFixed(2)}, Diff=${diff.toFixed(2)}`);
            }
        }

        // Check 2: Valid RIF (Basic regex)
        const rif = entry.customerRif || '';
        if (!/^[JGVE]-\d{5,9}-?\d?$/i.test(rif)) {
            errors.push(`Invalid RIF: ${rif}`);
        }

        // Check 3: Control Number
        if (!entry.invoiceControlNumber) {
            errors.push(`Missing Control Number`);
        }

        if (errors.length > 0) {
            errorCount++;
            console.log(`\n[FAIL] Invoice ${entry.invoiceNumber} (ID: ${entry._id})`);
            errors.forEach(e => console.log(`  - ${e}`));
        }
    }

    console.log(`\nTotal Failed: ${errorCount}`);

    await mongoose.disconnect();
}

run().catch(console.error);
