import 'dotenv/config';
import mongoose from 'mongoose';

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food-inventory?tls=false';
    await mongoose.connect(uri);

    const doc = await mongoose.connection.collection('billingdocuments').findOne({ documentNumber: 'F107' });

    if (!doc) {
        console.log('Invoice F107 not found. Listing last 3...');
        const last = await mongoose.connection.collection('billingdocuments').find({}).sort({ createdAt: -1 }).limit(3).toArray();
        last.forEach(d => console.log(`${d.documentNumber}: Totals=`, JSON.stringify(d.totals, null, 2)));
    } else {
        console.log('Invoice F107 found.');
        console.log('Totals:', JSON.stringify(doc.totals, null, 2));
        console.log('Created At:', doc.createdAt);
    }

    await mongoose.disconnect();
}
run();
