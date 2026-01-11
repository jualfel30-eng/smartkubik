require('dotenv').config();
const mongoose = require('mongoose');

async function dumpInventory() {
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

    // 3. Mostrar estructura completa
    for (let i = 0; i < inventories.length; i++) {
      const inv = inventories[i];

      console.log(`━━━━━━━ INVENTARIO #${i+1} ━━━━━━━`);
      console.log(JSON.stringify(inv, null, 2));

      // Buscar el producto
      const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(inv.productId) });
      if (product) {
        console.log('\n📦 Producto asociado:', product.name);

        if (product.variants) {
          const variant = product.variants.find(v => v._id.toString() === inv.variantId.toString());
          if (variant) {
            console.log('📋 Variante SKU:', variant.sku);
          }
        }
      }
      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

dumpInventory();
