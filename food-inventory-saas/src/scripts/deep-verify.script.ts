import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const salesBookSchema = new mongoose.Schema({
    tenantId: String,
    invoiceNumber: String,
    status: String,
    invoiceControlNumber: String,
    totalAmount: Number
}, { strict: false });

const IvaSalesBook = mongoose.model('IvaSalesBook', salesBookSchema);

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('No Mongo URI');

    await mongoose.connect(uri);

    // 1. Check for Invalid Status
    const invalidStatus = await IvaSalesBook.countDocuments({ status: { $ne: 'confirmed' } });

    // 2. Check for Missing Fields
    const missingFields = await IvaSalesBook.countDocuments({
        $or: [{ invoiceControlNumber: { $exists: false } }, { invoiceControlNumber: null }]
    });

    // 3. Tenant ID Check
    const tenants = await IvaSalesBook.distinct('tenantId');

    console.log('=== DIAGNOSTIC REPORT ===');
    console.log(`Docs with Invalid Status: ${invalidStatus}`);
    console.log(`Docs with Missing Control #: ${missingFields}`);
    console.log(`Unique Tenant Strings:`, tenants);

    const sample = await IvaSalesBook.findOne({ invoiceNumber: 'F106' });
    if (sample) {
        console.log(`F106 Tenant: '${sample.tenantId}' (Type: ${typeof sample.tenantId})`);
        console.log(`F106 Status: ${sample.status}`);
        console.log(`F106 Total: ${sample.totalAmount}`);
    } else {
        console.log('F106 NOT FOUND');
    }
    console.log('=========================');

    await mongoose.disconnect();
}

run().catch(console.error);
