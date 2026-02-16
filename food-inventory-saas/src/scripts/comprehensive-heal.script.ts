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
    tenantId: String,
    customerRif: String,
    customerName: String,
    updatedAt: Date
}, { strict: false });

const IvaSalesBook = mongoose.model('IvaSalesBook', salesBookSchema);

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('No Mongo URI');

    await mongoose.connect(uri);

    const entries = await IvaSalesBook.find({
        month: 1,
        year: 2026
    });

    console.log(`Checking ${entries.length} entries for RIF and Math repair...`);

    let fixed = 0;
    for (const doc of entries) {
        const entry: any = doc;
        let modified = false;

        // 1. Fix RIF (e.g., "17030648" -> "V-17030648", "V123" -> "V-123")
        const originalRif = entry.customerRif || '';
        if (!/^[JGVE]-\d{5,9}-?\d?$/i.test(originalRif)) {
            // Normalize: Remove spaces, uppercase
            let clean = originalRif.replace(/\s/g, '').toUpperCase();

            // Heuristics
            if (/^\d+$/.test(clean)) {
                // Only digits -> assume V-
                clean = `V-${clean}`;
            } else if (/^[JGVE]\d+$/.test(clean)) {
                // Letter + Digits (missing hyphen) -> Insert hyphen
                clean = clean.charAt(0) + '-' + clean.slice(1);
            }

            if (clean !== originalRif) {
                console.log(`[RIF] ${entry.invoiceNumber}: ${originalRif} -> ${clean}`);
                entry.customerRif = clean;
                modified = true;
            }
        }

        // 2. Fix Math (NE2 and others)
        // Special check for NE2
        if (entry.invoiceNumber === 'NE2' && entry.ivaAmount === 0 && entry.baseAmount > 0) {
            const expected = (entry.baseAmount * 16) / 100;
            console.log(`[MATH-NE2] Forcing repair on NE2: 0 -> ${expected}`);
            entry.ivaAmount = expected;
            entry.totalAmount = entry.baseAmount + expected;
            modified = true;
        }

        // General Math Fix (Tolerance 2.0)
        if (entry.baseAmount >= 0 && entry.ivaRate > 0) {
            const expectedIva = (entry.baseAmount * entry.ivaRate) / 100;
            const diff = Math.abs(expectedIva - (entry.ivaAmount || 0));
            if (diff > 2.0) {
                console.log(`[MATH] ${entry.invoiceNumber}: Tax ${entry.ivaAmount} -> ${expectedIva.toFixed(2)}`);
                entry.ivaAmount = expectedIva;
                entry.totalAmount = entry.baseAmount + expectedIva - (entry.withheldIvaAmount || 0);
                modified = true;
            }
        }

        if (modified) {
            entry.status = 'confirmed'; // Force valid status
            await entry.save();
            fixed++;
        }
    }

    console.log(`\nRepair Complete. Modified ${fixed} documents.`);

    await mongoose.disconnect();
}

run().catch(console.error);
