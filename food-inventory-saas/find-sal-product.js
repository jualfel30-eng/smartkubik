require('dotenv').config();
const mongoose = require('mongoose');

async function findSalProduct() {
  try {
    // Conectar a la base de datos 'test'
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB (database: test)');

    // Obtener las colecciones
    const Tenant = mongoose.connection.collection('tenants');
    const Product = mongoose.connection.collection('products');
    const Inventory = mongoose.connection.collection('inventories');

    // 1. Buscar el tenant "Tiendas Broas"
    const tenant = await Tenant.findOne({ name: 'Tiendas Broas' });
    if (!tenant) {
      console.log('❌ Tenant "Tiendas Broas" no encontrado');
      return;
    }
    console.log('✅ Tenant encontrado:', tenant.name, '- ID:', tenant._id);

    // 2. Buscar productos con "Sal" en el nombre o SKU
    const products = await Product.find({
      tenantId: tenant._id.toString()
    }).toArray();

    console.log(`\n📦 Total de productos del tenant: ${products.length}\n`);

    let found = false;

    for (const product of products) {
      // Buscar en variantes
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (variant.sku && variant.sku.includes('Sal pulverizada')) {
            console.log('⭐⭐⭐ ENCONTRADO ⭐⭐⭐');
            console.log('Producto:', product.name);
            console.log('Producto ID:', product._id);
            console.log('Variante:', variant.name);
            console.log('Variante ID:', variant._id);
            console.log('SKU:', variant.sku);

            // Buscar inventario asociado
            const inventory = await Inventory.findOne({
              tenantId: tenant._id.toString(),
              productId: product._id.toString(),
              variantId: variant._id.toString()
            });

            if (inventory) {
              console.log('\n📦 Inventario encontrado:');
              console.log('  ID:', inventory._id);
              console.log('  Cantidad total:', inventory.totalQuantity);
              console.log('  Cantidad disponible:', inventory.availableQuantity);
              console.log('  Cantidad reservada:', inventory.reservedQuantity);
            } else {
              console.log('\n⚠️  No hay inventario asociado a esta variante');
            }

            found = true;
            console.log('');
          }
        }
      }
    }

    if (!found) {
      console.log('❌ No se encontró ningún producto con "Sal pulverizada" en el SKU');
      console.log('\nListando todos los productos...\n');

      for (const product of products) {
        console.log(`- ${product.name} (SKU: ${product.sku})`);
        if (product.variants) {
          for (const variant of product.variants) {
            console.log(`  └─ ${variant.name || 'Sin nombre'} (SKU: ${variant.sku})`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

findSalProduct();
