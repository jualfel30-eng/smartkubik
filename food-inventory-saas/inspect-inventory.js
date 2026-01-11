require('dotenv').config();
const mongoose = require('mongoose');

async function inspectInventory() {
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
    const Product = mongoose.connection.collection('products');

    // 1. Buscar el tenant "Tiendas Broas"
    const tenant = await Tenant.findOne({ name: 'Tiendas Broas' });
    if (!tenant) {
      console.log('❌ Tenant "Tiendas Broas" no encontrado');
      return;
    }
    console.log('✅ Tenant encontrado:', tenant.name, '- ID:', tenant._id);

    // 2. Obtener todos los inventarios
    const inventories = await Inventory.find({
      tenantId: tenant._id.toString()
    }).toArray();

    console.log(`\n📦 Total de inventarios: ${inventories.length}\n`);

    // 3. Para cada inventario, buscar el producto relacionado
    for (const inv of inventories) {
      const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(inv.productId) });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Inventario ID:', inv._id);
      console.log('Producto ID:', inv.productId);
      console.log('Variante ID:', inv.variantId);
      console.log('Warehouse ID:', inv.warehouseId);
      console.log('Cantidad:', inv.quantity);
      console.log('Unidad:', inv.unit);

      if (product) {
        console.log('\n📦 Producto asociado:');
        console.log('  Nombre:', product.name);
        console.log('  SKU Base:', product.sku);

        if (product.variants && product.variants.length > 0) {
          const variant = product.variants.find(v => v._id.toString() === inv.variantId);
          if (variant) {
            console.log('\n  📋 Variante:');
            console.log('    Nombre:', variant.name);
            console.log('    SKU:', variant.sku);

            if (variant.sku && variant.sku.includes('Sal pulverizada')) {
              console.log('\n    ⭐⭐⭐ ENCONTRADO: Este es el inventario de Sal pulverizada 20 kg!');
            }
          }
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

inspectInventory();
