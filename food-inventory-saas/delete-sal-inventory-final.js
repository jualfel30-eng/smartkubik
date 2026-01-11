require('dotenv').config();
const mongoose = require('mongoose');

async function deleteInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    const Inventory = mongoose.connection.collection('inventories');

    // Buscar el inventario
    const inventory = await Inventory.findOne({
      variantSku: 'Sal pulverizada 20 kg-VAR1'
    });

    if (!inventory) {
      console.log('❌ Inventario no encontrado');
      return;
    }

    console.log('\n📦 Inventario a eliminar:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ID:', inventory._id);
    console.log('Tenant ID:', inventory.tenantId);
    console.log('Producto:', inventory.productName);
    console.log('SKU:', inventory.variantSku);
    console.log('Cantidad total:', inventory.totalQuantity);
    console.log('Cantidad disponible:', inventory.availableQuantity);
    console.log('Cantidad reservada:', inventory.reservedQuantity);
    console.log('');

    console.log('⚠️  Eliminando inventario...\n');

    // Eliminar
    const result = await Inventory.deleteOne({ _id: inventory._id });

    if (result.deletedCount === 1) {
      console.log('✅ Inventario eliminado exitosamente');
      console.log('✅ El producto NO fue eliminado, solo su registro de inventario');
    } else {
      console.log('❌ Error: No se pudo eliminar el inventario');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

deleteInventory();
