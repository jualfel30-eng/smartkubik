import 'dotenv/config';
import mongoose from 'mongoose';

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food-inventory?tls=false';
    try {
        await mongoose.connect(uri);
        console.log('Connected.');

        const closings = await mongoose.connection.collection('cashregisterclosings')
            .find({})
            .sort({ periodEnd: -1 })
            .limit(5)
            .toArray();

        console.log(`Found ${closings.length} closings.`);

        closings.forEach(c => {
            console.log('------------------------------------------------');
            console.log(`ID: ${c._id}`);
            console.log(`Number: ${c.closingNumber}`);
            console.log(`Date: ${c.periodEnd}`);
            console.log(`Change Given:`, JSON.stringify(c.changeGiven));
            console.log(`Differences:`, JSON.stringify(c.cashDifferences));

            // Check if this matches the 84k
            const vesChange = c.changeGiven?.find(x => x.currency === 'VES')?.totalChangeGiven;
            console.log(`VES Change: ${vesChange}`);
        });
    } catch (e) { console.error(e); }
    await mongoose.disconnect();
}
run();
