require('dotenv').config();
const mongoose = require('mongoose');

async function findAllProducts() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Obtener las colecciones
    const Tenant = mongoose.connection.collection('tenants');
    const Product = mongoose.connection.collection('products');

    // 1. Buscar el tenant "Tiendas Broas"
    const tenant = await Tenant.findOne({ name: 'Tiendas Broas' });
    if (!tenant) {
      console.log('❌ Tenant "Tiendas Broas" no encontrado');
      return;
    }
    console.log('✅ Tenant encontrado:', tenant.name, '- ID:', tenant._id);

    // 2. Buscar TODOS los productos
    const products = await Product.find({
      tenantId: tenant._id.toString()
    }).limit(30).toArray();

    console.log(`\n📦 Total de productos: ${products.length}\n`);

    for (const product of products) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Producto:', product.name);
      console.log('SKU Base:', product.sku);

      if (product.variants && product.variants.length > 0) {
        console.log('Variantes:');
        for (const variant of product.variants) {
          console.log(`  - SKU: ${variant.sku} | Nombre: ${variant.name || 'Sin nombre'}`);

          // Buscar si tiene "Sal" o "20 kg"
          if (variant.sku && (variant.sku.includes('Sal') || variant.sku.includes('20 kg'))) {
            console.log('    ⭐ POSIBLE COINCIDENCIA');
          }
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

findAllProducts();
