import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const settingSchema = new mongoose.Schema({
    key: String,
    value: mongoose.Schema.Types.Mixed
});

const GlobalSetting = mongoose.model('GlobalSetting', settingSchema);

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('No Mongo URI');

    await mongoose.connect(uri);
    console.log('Connected to Mongo');

    const settings = await GlobalSetting.find({}).lean();

    console.log('=== GLOBAL SETTINGS ===');
    settings.forEach(s => {
        console.log(`${s.key}: ${JSON.stringify(s.value)}`);
    });
    console.log('=======================');

    await mongoose.disconnect();
}

run().catch(console.error);
