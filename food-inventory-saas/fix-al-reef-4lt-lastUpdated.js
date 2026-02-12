/**
 * Fix: Actualizar lastUpdated del inventario Al Reef 4lt
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const TENANT_ID = '6984b426dad0fee93da83cfb';
const INVENTORY_4LT_ID = '698b9cc6a2214bb9724c5ce5';

const InventorySchema = new mongoose.Schema({}, { collection: 'inventories', strict: false });

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Inventory = mongoose.model('Inventory', InventorySchema);

    // Obtener el inventario actual
    const inventory = await Inventory.findById(INVENTORY_4LT_ID).lean();

    if (!inventory) {
      console.error('❌ Inventario no encontrado');
      process.exit(1);
    }

    console.log('📦 Inventario actual:');
    console.log(`   productName: ${inventory.productName}`);
    console.log(`   lastUpdated: ${inventory.lastUpdated}`);
    console.log(`   createdAt: ${inventory.createdAt}`);
    console.log(`   updatedAt: ${inventory.updatedAt}`);
    console.log('');

    // Actualizar lastUpdated con fecha actual
    const now = new Date();

    console.log('🔧 Actualizando lastUpdated a:', now);
    console.log('');

    const result = await Inventory.updateOne(
      { _id: new mongoose.Types.ObjectId(INVENTORY_4LT_ID) },
      {
        $set: {
          lastUpdated: now,
          updatedAt: now
        }
      }
    );

    console.log(`✅ Actualización completada`);
    console.log(`   Documentos modificados: ${result.modifiedCount}`);
    console.log('');

    // Verificar
    const updated = await Inventory.findById(INVENTORY_4LT_ID).lean();
    console.log('📦 Inventario actualizado:');
    console.log(`   lastUpdated: ${updated.lastUpdated}`);
    console.log(`   updatedAt: ${updated.updatedAt}`);
    console.log('');

    console.log('✅ Ahora el inventario del 4lt debería aparecer al principio de la lista!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB\n');
  }
}

main();
