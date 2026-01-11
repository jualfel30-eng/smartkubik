require('dotenv').config();
const mongoose = require('mongoose');

async function searchInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    const Inventory = mongoose.connection.collection('inventories');

    // Buscar por SKU exacto
    console.log('\n🔍 Buscando inventario con SKU "Sal pulverizada 20 kg-VAR1"...\n');

    const inventory = await Inventory.findOne({
      variantSku: 'Sal pulverizada 20 kg-VAR1'
    });

    if (inventory) {
      console.log('✅ Inventario encontrado:');
      console.log(JSON.stringify(inventory, null, 2));
    } else {
      console.log('❌ No se encontró inventario con ese SKU exacto');
      console.log('\n🔍 Buscando variantes con "Sal" o "20 kg"...\n');

      const allInventories = await Inventory.find({}).toArray();

      for (const inv of allInventories) {
        if (inv.variantSku && (inv.variantSku.includes('Sal') || inv.variantSku.includes('20 kg'))) {
          console.log('━━━━━━━━━━━━━━━━━');
          console.log('ID:', inv._id);
          console.log('Tenant ID:', inv.tenantId);
          console.log('Producto:', inv.productName);
          console.log('SKU Variante:', inv.variantSku);
          console.log('Cantidad:', inv.totalQuantity);
          console.log('');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

searchInventory();
