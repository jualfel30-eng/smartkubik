
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const WarehouseSchema = new mongoose.Schema({
    name: String,
    tenantId: mongoose.Types.ObjectId,
    isActive: Boolean,
    isDeleted: Boolean
});

const Warehouse = mongoose.model('Warehouse', WarehouseSchema);

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food-inventory-db?tls=false';
    console.log(`Connecting to ${uri}...`);

    await mongoose.connect(uri);
    console.log('Connected!');

    const tenantId = "68d55e4b764d359fed186e47";
    console.log(`Checking warehouses for tenant: ${tenantId}`);

    const warehouses = await Warehouse.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        isDeleted: { $ne: true }
    }).lean();

    console.log(`Found ${warehouses.length} warehouses:`);
    warehouses.forEach(w => {
        // @ts-ignore
        console.log(`- [${w._id}] ${w.name} (Active: ${w.isActive})`);
    });

    await mongoose.disconnect();
}

run().catch(err => console.error(err));
