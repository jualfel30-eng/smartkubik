/**
 * Verificar el registro de inventario del Al Reef 4lt
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const TENANT_ID = '6984b426dad0fee93da83cfb';
const PRODUCT_4LT_ID = '698b89c38ad8cf98c367324f';

const InventorySchema = new mongoose.Schema({}, { collection: 'inventories', strict: false });

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Inventory = mongoose.model('Inventory', InventorySchema);

    // Obtener TODOS los inventarios del tenant ordenados por fecha
    console.log('📦 Obteniendo TODOS los inventarios del tenant...\n');

    const allInventories = await Inventory
      .find({
        tenantId: new mongoose.Types.ObjectId(TENANT_ID),
        isActive: { $ne: false }
      })
      .sort({ lastUpdated: -1 })
      .lean();

    console.log(`Total de inventarios activos: ${allInventories.length}\n`);

    // Buscar el de Al Reef 4lt
    const alReef4ltInventory = allInventories.find(inv =>
      inv.productId && inv.productId.toString() === PRODUCT_4LT_ID
    );

    if (!alReef4ltInventory) {
      console.error('❌ No se encontró el inventario para Al Reef 4lt\n');
    } else {
      const position = allInventories.indexOf(alReef4ltInventory) + 1;
      console.log(`✅ Inventario Al Reef 4lt encontrado en la posición ${position} de ${allInventories.length}`);
      console.log('');
      console.log('📋 Datos del inventario:');
      console.log(`   ID: ${alReef4ltInventory._id}`);
      console.log(`   productName: "${alReef4ltInventory.productName}"`);
      console.log(`   productSku: "${alReef4ltInventory.productSku}"`);
      console.log(`   variantSku: "${alReef4ltInventory.variantSku}"`);
      console.log(`   availableQuantity: ${alReef4ltInventory.availableQuantity}`);
      console.log(`   isActive: ${alReef4ltInventory.isActive}`);
      console.log(`   lastUpdated: ${alReef4ltInventory.lastUpdated}`);
      console.log('');

      if (position > 100) {
        console.log('⚠️  ⚠️  ⚠️  PROBLEMA ENCONTRADO ⚠️  ⚠️  ⚠️\n');
        console.log(`El inventario de Al Reef 4lt está en la posición ${position},`);
        console.log('pero el frontend solo obtiene los primeros 100 registros.');
        console.log('Por eso NO APARECE en la lista!\n');
        console.log('SOLUCIÓN: El frontend debe pasar la búsqueda al backend,');
        console.log('o el backend debe retornar más de 100 items cuando hay búsqueda.\n');
      } else {
        console.log(`✅ El inventario está en la posición ${position}, dentro de los primeros 100.\n`);
      }

      // Verificar si el texto de búsqueda "al reef" encontraría este item
      const searchText = 'al reef';
      const searchWords = searchText.split(/\s+/);
      const searchableText = [
        alReef4ltInventory.productName,
        alReef4ltInventory.productSku,
        alReef4ltInventory.variantSku,
      ]
        .filter(Boolean)
        .map(v => String(v).toLowerCase())
        .join(' ');

      const matches = searchWords.every(word => searchableText.includes(word));

      console.log('🔍 Prueba de búsqueda:');
      console.log(`   Texto de búsqueda: "${searchText}"`);
      console.log(`   Texto searchable: "${searchableText}"`);
      console.log(`   ¿Coincide?: ${matches ? '✅ SÍ' : '❌ NO'}`);
      console.log('');
    }

    // Listar los primeros 10 Al Reef encontrados
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Inventarios que contienen "al reef" en el nombre:\n');

    const alReefInventories = allInventories.filter(inv => {
      const text = (inv.productName || '').toLowerCase();
      return text.includes('al reef');
    });

    console.log(`Total encontrados: ${alReefInventories.length}\n`);

    alReefInventories.slice(0, 10).forEach((inv, idx) => {
      const position = allInventories.indexOf(inv) + 1;
      console.log(`${idx + 1}. ${inv.productName}`);
      console.log(`   Posición general: ${position}/${allInventories.length}`);
      console.log(`   Cantidad: ${inv.availableQuantity}`);
      console.log(`   Última actualización: ${inv.lastUpdated}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB\n');
  }
}

main();
