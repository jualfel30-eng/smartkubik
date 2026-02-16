require('dotenv').config({ path: '../food-inventory-saas/.env' });
const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({ name: String, tenantId: String, customerId: mongoose.Schema.Types.ObjectId });
const Supplier = mongoose.model('Supplier', SupplierSchema);

async function checkSupplier() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-db');

        const s = await Supplier.findOne({ name: /DISTRIBUIDORA DE CAFE/i });
        if (s) {
            console.log('Proveedor encontrado:', s.name);
            console.log('ID:', s._id);
            console.log('TenantID:', s.tenantId, 'Type:', typeof s.tenantId);
            console.log('CustomerID:', s.customerId);
        } else {
            console.log('Proveedor no encontrado en colección Suppliers. Buscando en Customers...');
            // Check customers? No, verified as linked in prev script.
        }
    } catch (e) { console.error(e); }
    finally { await mongoose.disconnect(); }
}
checkSupplier();
