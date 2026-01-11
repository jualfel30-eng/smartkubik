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

    // Usar el ID exacto que encontramos
    const inventoryId = new mongoose.Types.ObjectId('6961618822babcfc1cec13fc');

    // Buscar primero
    const inventory = await Inventory.findOne({ _id: inventoryId });

    if (!inventory) {
      console.log('❌ Inventario no encontrado');
      return;
    }

    console.log('\n📦 Inventario encontrado:');
    console.log('ID:', inventory._id);
    console.log('Producto:', inventory.productName);
    console.log('SKU:', inventory.variantSku);
    console.log('');

    // Eliminar usando el ObjectId
    const result = await Inventory.deleteOne({ _id: inventoryId });

    console.log('Resultado de la eliminación:', result);

    if (result.deletedCount === 1) {
      console.log('\n✅ Inventario eliminado exitosamente');
    } else {
      console.log('\n❌ No se pudo eliminar (deletedCount:', result.deletedCount, ')');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

deleteInventory();
