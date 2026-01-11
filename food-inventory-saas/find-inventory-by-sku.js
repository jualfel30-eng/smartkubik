require('dotenv').config();
const mongoose = require('mongoose');

async function findInventoryBySKU() {
  try {
    // Conectar a la base de datos 'test'
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB (database: test)');

    // Obtener las colecciones
    const Tenant = mongoose.connection.collection('tenants');
    const Inventory = mongoose.connection.collection('inventories');

    // 1. Buscar el tenant "Tiendas Broas"
    const tenant = await Tenant.findOne({ name: 'Tiendas Broas' });
    if (!tenant) {
      console.log('❌ Tenant "Tiendas Broas" no encontrado');
      return;
    }
    console.log('✅ Tenant encontrado:', tenant.name, '- ID:', tenant._id);

    // 2. Buscar inventarios que contengan "Sal pulverizada" en el SKU
    const inventories = await Inventory.find({
      tenantId: tenant._id.toString(),
      sku: /Sal pulverizada/i
    }).toArray();

    console.log(`\n📦 Inventarios encontrados: ${inventories.length}\n`);

    if (inventories.length === 0) {
      console.log('ℹ️  No se encontraron inventarios con "Sal pulverizada"');
      console.log('Buscando todos los inventarios del tenant...\n');

      const allInventories = await Inventory.find({
        tenantId: tenant._id.toString()
      }).limit(10).toArray();

      console.log(`Total de inventarios del tenant: ${allInventories.length}\n`);

      for (const inv of allInventories) {
        console.log(`SKU: ${inv.sku} | Cantidad: ${inv.quantity} ${inv.unit}`);
      }
    } else {
      for (const inv of inventories) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Inventario ID:', inv._id);
        console.log('SKU:', inv.sku);
        console.log('Producto ID:', inv.productId);
        console.log('Variante ID:', inv.variantId);
        console.log('Warehouse ID:', inv.warehouseId);
        console.log('Cantidad:', inv.quantity);
        console.log('Unidad:', inv.unit);
        console.log('Costo promedio:', inv.averageCost);
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

findInventoryBySKU();
