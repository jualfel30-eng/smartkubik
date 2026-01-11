require('dotenv').config();
const mongoose = require('mongoose');

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const Inventory = mongoose.connection.collection('inventories');

    const inventory = await Inventory.findOne({
      variantSku: 'Sal pulverizada 20 kg-VAR1'
    });

    if (inventory) {
      console.log('❌ El inventario todavía existe en la base de datos');
    } else {
      console.log('✅ Verificado: El inventario fue eliminado correctamente');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

verify();
