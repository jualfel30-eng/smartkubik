require('dotenv').config();
const mongoose = require('mongoose');

async function findSalProducts() {
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

    // 2. Buscar productos que contengan "Sal" en el nombre
    const products = await Product.find({
      tenantId: tenant._id.toString(),
      name: /Sal/i
    }).toArray();

    console.log(`\n📦 Productos encontrados: ${products.length}\n`);

    for (const product of products) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Producto:', product.name);
      console.log('ID:', product._id);
      console.log('SKU Base:', product.sku);
      console.log('\nVariantes:');

      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          console.log(`  - ${variant.name || 'Sin nombre'}`);
          console.log(`    SKU: ${variant.sku}`);
          console.log(`    ID Variante: ${variant._id}`);
        }
      } else {
        console.log('  Sin variantes');
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

findSalProducts();
