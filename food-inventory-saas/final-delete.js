require('dotenv').config();
const mongoose = require('mongoose');

async function finalDelete() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    const Inventory = mongoose.connection.collection('inventories');

    // Buscar por SKU
    const inventory = await Inventory.findOne({
      variantSku: 'Sal pulverizada 20 kg-VAR1'
    });

    if (!inventory) {
      console.log('❌ Inventario no encontrado');
      return;
    }

    console.log('\n📦 Inventario encontrado:');
    console.log('ID:', inventory._id);
    console.log('Tipo de _id:', typeof inventory._id);
    console.log('Producto:', inventory.productName);
    console.log('SKU:', inventory.variantSku);
    console.log('');

    // Intentar eliminar con el _id tal cual viene de la base de datos
    console.log('Intentando eliminar...');
    const result = await Inventory.deleteOne({ _id: inventory._id });

    console.log('Resultado:', result);

    if (result.deletedCount > 0) {
      console.log('\n✅ Inventario eliminado exitosamente!');

      // Verificar
      const check = await Inventory.findOne({ variantSku: 'Sal pulverizada 20 kg-VAR1' });
      if (check) {
        console.log('⚠️  Advertencia: El inventario todavía existe');
      } else {
        console.log('✅ Verificado: El inventario fue eliminado correctamente');
      }
    } else {
      console.log('\n❌ No se eliminó ningún documento');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

finalDelete();
