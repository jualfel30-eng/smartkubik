require('dotenv').config();
const mongoose = require('mongoose');

async function deleteInventory() {
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
    const Inventory = mongoose.connection.collection('inventories');

    // 1. Buscar el tenant "Tiendas Broas"
    const tenant = await Tenant.findOne({ name: 'Tiendas Broas' });
    if (!tenant) {
      console.log('❌ Tenant "Tiendas Broas" no encontrado');
      return;
    }
    console.log('✅ Tenant encontrado:', tenant.name, '- ID:', tenant._id);

    // 2. Buscar el producto con el SKU
    const product = await Product.findOne({
      tenantId: tenant._id.toString(),
      'variants.sku': 'Sal pulverizada 20 kg-VAR1'
    });

    if (!product) {
      console.log('❌ Producto con SKU "Sal pulverizada 20 kg-VAR1" no encontrado');
      return;
    }
    console.log('✅ Producto encontrado:', product.name, '- ID:', product._id);

    // Encontrar la variante específica
    const variant = product.variants.find(v => v.sku === 'Sal pulverizada 20 kg-VAR1');
    if (!variant) {
      console.log('❌ Variante con SKU "Sal pulverizada 20 kg-VAR1" no encontrada');
      return;
    }
    console.log('✅ Variante encontrada:', variant.name, '- ID:', variant._id);

    // 3. Buscar inventarios relacionados (SOLO EN LA COLECCIÓN INVENTORIES)
    const inventories = await Inventory.find({
      tenantId: tenant._id.toString(),
      productId: product._id.toString(),
      variantId: variant._id.toString()
    }).toArray();

    console.log(`\n📦 Inventarios encontrados en la colección 'inventories': ${inventories.length}`);

    if (inventories.length === 0) {
      console.log('✅ No hay inventarios para eliminar');
      return;
    }

    // Mostrar información de los inventarios
    for (const inv of inventories) {
      console.log('\n📋 Inventario a eliminar:');
      console.log('  - ID:', inv._id);
      console.log('  - Warehouse:', inv.warehouseId);
      console.log('  - Cantidad:', inv.quantity);
      console.log('  - Unidad:', inv.unit);
      console.log('  - Costo promedio:', inv.averageCost);
    }

    // 4. ELIMINAR solo los registros de inventario
    console.log('\n⚠️  Eliminando inventarios...');
    const result = await Inventory.deleteMany({
      tenantId: tenant._id.toString(),
      productId: product._id.toString(),
      variantId: variant._id.toString()
    });

    console.log(`\n✅ Inventarios eliminados: ${result.deletedCount}`);
    console.log('✅ El producto NO fue eliminado, solo sus registros de inventario');
    console.log('✅ Operación completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

deleteInventory();
