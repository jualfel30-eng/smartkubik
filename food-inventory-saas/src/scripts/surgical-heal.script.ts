import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const salesBookSchema = new mongoose.Schema({
    invoiceNumber: String,
    baseAmount: Number,
    ivaRate: Number,
    ivaAmount: Number,
    totalAmount: Number,
    withheldIvaAmount: Number,
    status: String,
    tenantId: String
}, { strict: false });

const IvaSalesBook = mongoose.model('IvaSalesBook', salesBookSchema);

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('No Mongo URI');

    await mongoose.connect(uri);

    const entries = await IvaSalesBook.find({
        month: 1,
        year: 2026,
        status: 'confirmed'
    });

    console.log(`Checking ${entries.length} entries for surgical repair...`);

    let fixed = 0;
    for (const doc of entries) {
        const entry: any = doc;
        if (entry.baseAmount >= 0) {
            const expectedIva = (entry.baseAmount * (entry.ivaRate || 0)) / 100;
            const diff = Math.abs(expectedIva - (entry.ivaAmount || 0));

            if (diff > 2.0) {
                console.log(`[HEAL] Fixing Invoice ${entry.invoiceNumber}`);
                console.log(`   Old Tax: ${entry.ivaAmount} -> New: ${expectedIva.toFixed(2)}`);

                // Apply fix
                entry.ivaAmount = expectedIva;
                // Recalculate Total: Base + Tax - Retained (ignoring other fees for this specific fix)
                const retained = entry.withheldIvaAmount || 0;
                entry.totalAmount = entry.baseAmount + expectedIva - retained;

                await entry.save();
                fixed++;
            }
        }
    }

    console.log(`\nSurigcal Repair Complete. Fixed ${fixed} invoices.`);

    await mongoose.disconnect();
}

run().catch(console.error);
