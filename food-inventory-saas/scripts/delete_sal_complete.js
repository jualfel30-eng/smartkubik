require('dotenv').config();
const mongoose = require('mongoose');

async function deleteProductAndAssociations() {
    try {
        console.log('🚀 Iniciando script de limpieza completa (Versión Corregida de Tipos)...');

        // Conexión a la BD
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('✅ Conectado a MongoDB');

        const db = mongoose.connection.db;
        const Tenants = db.collection('tenants');
        const Products = db.collection('products');
        const Inventories = db.collection('inventories');
        const Orders = db.collection('orders');

        // 1. Buscar Tenant
        const tenantName = 'Tiendas Broas';
        const tenant = await Tenants.findOne({ name: { $regex: new RegExp(tenantName, 'i') } });

        if (!tenant) {
            console.error(`❌ Tenant "${tenantName}" no encontrado.`);
            return;
        }
        const tenantIdStr = tenant._id.toString();
        const tenantIdObj = tenant._id; // Es ObjectId original
        console.log(`✅ Tenant encontrado: ${tenant.name} (${tenantIdStr})`);

        // Helper para query de Tenant (ObjectId o String)
        const tenantQuery = { $in: [tenantIdStr, tenantIdObj] };

        // 2. Buscar Producto
        const targetSku = 'Sal pulverizada 20 kg-VAR1';
        console.log(`🔍 Buscando producto por SKU: "${targetSku}"...`);

        let product = await Products.findOne({
            tenantId: tenantQuery,
            $or: [
                { 'variants.sku': targetSku },
                { sku: targetSku }
            ]
        });

        if (!product) {
            console.log(`⚠️  No se encontró por SKU exacto. Buscando por nombre (regex /Sal pulverizada/i)...`);
            const candidates = await Products.find({
                tenantId: tenantQuery,
                name: { $regex: /Sal pulverizada/i }
            }).toArray();

            console.log(`   Candidatos encontrados por nombre: ${candidates.length}`);
            candidates.forEach(c => console.log(`   - ${c.name} (ID: ${c._id})`));

            if (candidates.length === 1) {
                product = candidates[0];
                console.log(`✅ Seleccionando único candidato: ${product.name}`);
            }
        }

        // Lógica para Inventory Huérfano
        if (!product) {
            console.error(`❌ Producto no encontrado.`);
            console.log(`🔍 Buscando Inventario huérfano con variantSku='${targetSku}'...`);

            const orphanInventories = await Inventories.find({
                tenantId: tenantQuery,
                variantSku: targetSku
            }).toArray();

            if (orphanInventories.length > 0) {
                console.log(`✅ ¡ENCONTRADO INVENTARIO HUÉRFANO! (${orphanInventories.length} registros)`);
                const delInv = await Inventories.deleteMany({ _id: { $in: orphanInventories.map(i => i._id) } });
                console.log(`🗑️  Inventarios huérfanos eliminados: ${delInv.deletedCount}`);
                console.log('✅ Limpieza de inventario completada.');
            } else {
                console.log(`❌ No se encontró ni producto ni inventario con ese SKU.`);
            }
            return;
        }

        const productId = product._id;
        const productIdStr = productId.toString();
        console.log(`✅ OBJETIVO CONFIRMADO: ${product.name}`);
        console.log(`   ID: ${productIdStr}`);

        // 3. Buscar Órdenes Asociadas y eliminar
        // Orders usan tenantId como String (según schema) pero probamos ambos
        const orders = await Orders.find({
            tenantId: tenantQuery,
            $or: [
                { 'items.productId': productId },     // ObjectId match
                { 'items.productSku': targetSku },    // SKU match
                { 'items.variantSku': targetSku }     // Variant SKU match
            ]
        }).toArray();

        console.log(`\n🔍 Análisis de Órdenes:`);
        console.log(`   Encontradas: ${orders.length} órdenes.`);

        if (orders.length > 0) {
            console.log(`⚠️  SE ELIMINARÁN ${orders.length} ÓRDENES DE VENTA.`);
            const orderIds = orders.map(o => o._id);
            const deleteOrdersResult = await Orders.deleteMany({
                _id: { $in: orderIds }
            });
            console.log(`🗑️  Órdenes eliminadas: ${deleteOrdersResult.deletedCount}`);
        }

        // 4. Eliminar Inventario
        // Inventory usually uses productId as ObjectId
        const deleteInventoryResult = await Inventories.deleteMany({
            tenantId: tenantQuery,
            $or: [
                { productId: productIdStr },
                { productId: productId },
                { variantSku: targetSku }
            ]
        });
        console.log(`🗑️  Registros de inventario eliminados: ${deleteInventoryResult.deletedCount}`);

        // 5. Eliminar Producto
        const deleteProductResult = await Products.deleteOne({ _id: productId });
        console.log(`🔥 Producto eliminado: ${deleteProductResult.deletedCount}`);

        console.log('\n✅ OPERACIÓN COMPLETADA CON ÉXITO.');

    } catch (error) {
        console.error('❌ Error crítico:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

deleteProductAndAssociations();
