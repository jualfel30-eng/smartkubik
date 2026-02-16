require('dotenv').config({ path: '../food-inventory-saas/.env' });
const mongoose = require('mongoose');

// Definir esquemas mínimos para consultar
const SupplierSchema = new mongoose.Schema({
    name: String,
    customerId: mongoose.Schema.Types.ObjectId,
    tenantId: String
});
const Supplier = mongoose.model('Supplier', SupplierSchema);

const PurchaseOrderSchema = new mongoose.Schema({
    poNumber: String,
    supplierId: mongoose.Schema.Types.ObjectId, // Este es el campo clave
    totalAmount: Number,
    tenantId: String
});
const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);

async function verifyIntegrity() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-db'; // Fallback común
        console.log(`Conectando a BD...`);
        await mongoose.connect(uri);
        console.log('Conexión exitosa.\n');

        // 1. Obtener Proveedores
        const suppliers = await Supplier.find({}).lean();
        console.log(`=== ANÁLISIS DE PROVEEDORES (${suppliers.length} encontrados) ===`);

        const supplierMap = {};
        suppliers.forEach(s => {
            console.log(`Proveedor: ${s.name}`);
            console.log(`   - Supplier ID: ${s._id}`);
            console.log(`   - Linked Customer ID: ${s.customerId || 'N/A'}`);

            // Mapear ambos IDs al nombre para verificar después
            supplierMap[s._id.toString()] = { name: s.name, type: 'SUPPLIER_ID' };
            if (s.customerId) {
                supplierMap[s.customerId.toString()] = { name: s.name, type: 'CUSTOMER_ID' };
            }
        });

        // Create explicit map of ALL customers to check against
        const CustomerSchema = new mongoose.Schema({
            name: String,
            companyName: String,
            customerType: String
        });
        const Customer = mongoose.model('Customer', CustomerSchema);

        const allCustomers = await Customer.find({}).lean();
        console.log(`=== ANÁLISIS DE CLIENTES (${allCustomers.length} encontrados) ===`);

        allCustomers.forEach(c => {
            // Add all customers to map, using ID as key
            if (!supplierMap[c._id.toString()]) {
                supplierMap[c._id.toString()] = {
                    name: c.companyName || c.name || 'Sin Nombre',
                    type: `CUSTOMER_ONLY (${c.customerType})`,
                    tenantId: c.tenantId
                };
            }
        });

        const pos = await PurchaseOrder.find({}).lean();
        console.log(`\n=== ANÁLISIS DE ÓRDENES DE COMPRA (${pos.length} encontradas) ===`);

        // Check "DISTRIBUIDORA DE CAFE..." specifically
        const targetName = "DISTRIBUIDORA DE CAFE";

        let linkedCount = 0;
        let unlinkedCount = 0;

        pos.forEach(po => {
            const supplierIdStr = po.supplierId ? po.supplierId.toString() : 'NULL';
            const match = supplierMap[supplierIdStr];

            if (match) {
                linkedCount++;
                if (match.name.includes(targetName)) {
                    console.log(`[TARGET MATCH] PO ${po.poNumber} -> ${match.name}`);
                    console.log(`    - PO TenantId: '${po.tenantId}'`);
                    console.log(`    - Supplier/Customer TenantId: '${match.tenantId}'`);
                    console.log(`    - Match? ${String(po.tenantId) === String(match.tenantId) ? 'YES' : 'NO'}`);
                }
                console.log(`[OK] PO ${po.poNumber} ($${po.totalAmount}) -> ${match.name} (vía ${match.type})`);
            } else {
                unlinkedCount++;
                console.log(`[FAIL] PO ${po.poNumber} ($${po.totalAmount}) -> SupplierId: ${supplierIdStr} (NO ENCONTRADO EN PROVEEDORES NI CLIENTES VINCULADOS)`);
            }
        });

        console.log('\n=== RESULTADO FINAL ===');
        console.log(`Órdenes Conectadas Correctamente: ${linkedCount}`);
        console.log(`Órdenes Huérfanas/Desconectadas: ${unlinkedCount}`);

        if (unlinkedCount > 0) {
            console.log('\n⚠️ DIAGNÓSTICO: Hay órdenes que tienen un ID de proveedor que NO coincide con ningún Supplier ni su Customer vinculado.');
        } else {
            console.log('\n✅ DIAGNÓSTICO: Todas las órdenes están correctamente vinculadas en la base de datos.');
            console.log('El problema es puramente de visualización en el frontend (query incorrecto).');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyIntegrity();
