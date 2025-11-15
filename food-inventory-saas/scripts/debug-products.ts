import { connect, connection } from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';

async function debugProducts() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const db = connection.db;
    const productsCollection = db.collection('products');

    // 1. Total de productos
    const total = await productsCollection.countDocuments({});
    console.log(`\n📊 Total de productos en DB: ${total}`);

    if (total === 0) {
      console.log('❌ No hay productos en la base de datos');
      await connection.close();
      return;
    }

    // 2. Productos por estado
    const byStatus = await productsCollection.aggregate([
      {
        $group: {
          _id: '$isActive',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    console.log('\n📈 Productos por estado (isActive):');
    byStatus.forEach((stat: any) => {
      console.log(`   ${stat._id === true ? 'Activos' : stat._id === false ? 'Inactivos' : 'Sin definir'}: ${stat.count}`);
    });

    // 3. Productos por tipo
    const byType = await productsCollection.aggregate([
      {
        $group: {
          _id: '$productType',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    console.log('\n📦 Productos por tipo:');
    byType.forEach((stat: any) => {
      console.log(`   ${stat._id || 'Sin productType'}: ${stat.count}`);
    });

    // 4. Mostrar todos los productos
    console.log('\n📋 Lista de todos los productos:');
    const allProducts = await productsCollection.find({}).limit(50).toArray();

    allProducts.forEach((product: any, index: number) => {
      console.log(`\n   ${index + 1}. ${product.name}`);
      console.log(`      SKU: ${product.sku}`);
      console.log(`      isActive: ${product.isActive !== false ? 'true' : 'false'}`);
      console.log(`      productType: ${product.productType || 'NO DEFINIDO'}`);
      console.log(`      tenantId: ${product.tenantId}`);
    });

    // 5. Buscar productos específicos que menciona el usuario
    console.log('\n🔍 Buscando "Aceituna"...');
    const aceitunas = await productsCollection.find({
      name: /aceituna/i
    }).toArray();

    if (aceitunas.length > 0) {
      console.log(`   Encontrados ${aceitunas.length} productos:`);
      aceitunas.forEach((p: any) => {
        console.log(`   - ${p.name} (SKU: ${p.sku}, isActive: ${p.isActive !== false}, productType: ${p.productType || 'NO DEFINIDO'})`);
      });
    } else {
      console.log('   ❌ No se encontraron productos con "aceituna"');
    }

    await connection.close();
    console.log('\n✅ Análisis completado');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await connection.close();
    process.exit(1);
  }
}

debugProducts();
