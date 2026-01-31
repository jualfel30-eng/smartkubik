import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

// SCHEMA DEFINITIONS (Simplified for Script)
const billingSchema = new mongoose.Schema({
    documentNumber: String,
    controlNumber: String,
    issueDate: Date,
    items: Array,
    customer: Object,
    emitter: Object,
    totals: {
        subtotal: Number,
        taxes: Array,
        grandTotal: Number,
        currency: String,
        exchangeRate: Number
    },
    type: String,
    status: String,
    tenantId: String,
    withheldIvaAmount: Number
});

const salesBookSchema = new mongoose.Schema({
    tenantId: String,
    invoiceNumber: String,
    controlNumber: String,
    invoiceDate: Date,
    transactionDate: Date,
    customerName: String,
    customerRif: String,
    type: String,
    status: String,

    // Tax details
    totalContent: Number,
    exemptAmount: Number,
    baseAmount: Number,
    ivaRate: Number,
    ivaAmount: Number,
    totalAmount: Number,
    withheldIvaAmount: Number,

    // Original Values (New)
    originalCurrency: String,
    exchangeRate: Number,
    originalBaseAmount: Number,
    originalIvaAmount: Number,
    originalTotalAmount: Number,
    isForeignCurrency: Boolean
}, { timestamps: true });

const BillingDocument = mongoose.model('BillingDocument', billingSchema);
const IvaSalesBook = mongoose.model('IvaSalesBook', salesBookSchema);

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('No Mongo URI');

    await mongoose.connect(uri);
    console.log('Connected to Mongo (Light)');

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-31T23:59:59.000Z');

    const invoices = await BillingDocument.find({
        issueDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['issued', 'paid', 'partially_paid', 'sent', 'validated', 'closed'] },
        type: { $ne: 'quote' }
    }).lean();

    console.log(`Found ${invoices.length} invoices to process.`);
    let success = 0;

    for (const invoice of invoices) {
        // FORCE ANY to avoid TS errors
        const totals: any = invoice.totals || {};

        // FIX LOGIC
        let currency = totals.currency || 'VES';
        let exchangeRate = totals.exchangeRate || 1;
        let grandTotal = totals.grandTotal || 0;

        // SURGICAL FIX CONDITION
        const needsFix = !totals.currency ||
            (totals.currency === 'VES' && (!totals.exchangeRate || totals.exchangeRate === 1) && grandTotal < 1000);

        if (needsFix) {
            currency = 'USD';
            exchangeRate = 370.25; // The Magic Number
            console.log(`[FIX] Applying Rate 370.25 to ${invoice.documentNumber} (${grandTotal})`);
        }

        // Calculations
        // @ts-ignore
        let baseAmount = totals.subtotal || 0;
        // @ts-ignore
        let ivaAmount = (totals.taxes || []).reduce((acc, t) => acc + t.amount, 0);
        // @ts-ignore
        let withheld = invoice.withheldIvaAmount || 0;

        const isForeign = currency === 'USD';

        const originalBase = baseAmount;
        const originalIva = ivaAmount;
        const originalTotal = grandTotal;

        if (isForeign) {
            baseAmount = originalBase * exchangeRate;
            ivaAmount = originalIva * exchangeRate;
            withheld = withheld * exchangeRate;
        }

        const totalAmount = baseAmount + ivaAmount - withheld;

        // DELETE OLD (Robust)
        await IvaSalesBook.deleteMany({
            // @ts-ignore
            invoiceNumber: invoice.documentNumber
        });

        // CREATE NEW
        await IvaSalesBook.create({
            // @ts-ignore
            tenantId: invoice.tenantId,
            // @ts-ignore
            invoiceNumber: invoice.documentNumber,
            // @ts-ignore
            controlNumber: invoice.controlNumber,
            // @ts-ignore
            invoiceDate: invoice.issueDate,
            // @ts-ignore
            transactionDate: invoice.issueDate,
            // @ts-ignore
            customerName: invoice.customer?.name || 'Cliente Genérico',
            // @ts-ignore
            customerRif: invoice.customer?.taxId || 'N/A',
            // @ts-ignore
            type: invoice.type,
            // @ts-ignore
            status: invoice.status,

            totalContent: 0,
            exemptAmount: 0,
            baseAmount,
            ivaRate: 16, // Assuming 16% as standard
            ivaAmount,
            totalAmount,
            withheldIvaAmount: withheld,

            originalCurrency: currency,
            exchangeRate: exchangeRate,
            originalBaseAmount: originalBase,
            originalIvaAmount: originalIva,
            originalTotalAmount: originalTotal,
            isForeignCurrency: isForeign
        });
        process.stdout.write('.');
        success++;
    }

    console.log(`\nDone. Processed ${success} invoices.`);
    await mongoose.disconnect();
}

run().catch(console.error);
