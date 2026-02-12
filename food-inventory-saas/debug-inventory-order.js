/**
 * Debug: Ver el ordenamiento exacto de inventarios
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const TENANT_ID = '6984b426dad0fee93da83cfb';

const InventorySchema = new mongoose.Schema({}, { collection: 'inventories', strict: false });

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Inventory = mongoose.model('Inventory', InventorySchema);

    // Obtener exactamente como lo hace el backend
    const filter = {
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      isActive: { $ne: false }
    };

    const sortOptions = { lastUpdated: -1 }; // descending

    const inventories = await Inventory
      .find(filter)
      .sort(sortOptions)
      .limit(100)
      .lean()
      .exec();

    console.log(`📦 Primeros 100 inventarios (ordenados por lastUpdated desc):\n`);

    // Buscar Al Reef en los primeros 100
    const alReefInFirst100 = [];
    inventories.forEach((inv, idx) => {
      if ((inv.productName || '').toLowerCase().includes('al reef')) {
        alReefInFirst100.push({
          position: idx + 1,
          productName: inv.productName,
          lastUpdated: inv.lastUpdated,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
        });
      }
    });

    console.log(`Al Reef encontrados en los primeros 100: ${alReefInFirst100.length}\n`);
    alReefInFirst100.forEach((item) => {
      console.log(`Posición ${item.position}: ${item.productName}`);
      console.log(`   lastUpdated: ${item.lastUpdated}`);
      console.log(`   createdAt: ${item.createdAt}`);
      console.log(`   updatedAt: ${item.updatedAt}`);
      console.log('');
    });

    // Ahora obtener TODOS y buscar dónde está el 4lt
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔍 Buscando posición del 4lt en TODOS los inventarios...\n');

    const allInventories = await Inventory
      .find(filter)
      .sort(sortOptions)
      .lean()
      .exec();

    const index4lt = allInventories.findIndex(inv =>
      (inv.productName || '').toLowerCase().includes('al reef 4lt')
    );

    const index2lt = allInventories.findIndex(inv =>
      (inv.productName || '').toLowerCase().includes('al reef 2 lts')
    );

    if (index4lt !== -1) {
      const inv4lt = allInventories[index4lt];
      console.log(`✅ Al Reef 4lt encontrado en posición ${index4lt + 1} de ${allInventories.length}`);
      console.log(`   productName: ${inv4lt.productName}`);
      console.log(`   lastUpdated: ${inv4lt.lastUpdated}`);
      console.log(`   createdAt: ${inv4lt.createdAt}`);
      console.log(`   updatedAt: ${inv4lt.updatedAt}`);
      console.log('');

      if (index4lt >= 100) {
        console.log(`❌ PROBLEMA: El 4lt está en posición ${index4lt + 1}, FUERA de los primeros 100`);
        console.log('   Por eso NO aparece en el frontend!\n');
      }
    } else {
      console.log('❌ Al Reef 4lt NO encontrado\n');
    }

    if (index2lt !== -1) {
      const inv2lt = allInventories[index2lt];
      console.log(`✅ Al Reef 2lt encontrado en posición ${index2lt + 1} de ${allInventories.length}`);
      console.log(`   productName: ${inv2lt.productName}`);
      console.log(`   lastUpdated: ${inv2lt.lastUpdated}`);
      console.log(`   createdAt: ${inv2lt.createdAt}`);
      console.log(`   updatedAt: ${inv2lt.updatedAt}`);
      console.log('');

      if (index2lt < 100) {
        console.log(`✅ El 2lt está en posición ${index2lt + 1}, DENTRO de los primeros 100`);
        console.log('   Por eso SÍ aparece en el frontend!\n');
      }
    } else {
      console.log('❌ Al Reef 2lt NO encontrado\n');
    }

    // Comparar lastUpdated
    if (index4lt !== -1 && index2lt !== -1) {
      const date4lt = allInventories[index4lt].lastUpdated;
      const date2lt = allInventories[index2lt].lastUpdated;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📅 COMPARACIÓN DE FECHAS:\n');
      console.log(`4lt lastUpdated: ${date4lt} (${typeof date4lt})`);
      console.log(`2lt lastUpdated: ${date2lt} (${typeof date2lt})`);

      if (!date4lt && date2lt) {
        console.log('\n⚠️  PROBLEMA: 4lt tiene lastUpdated undefined/null');
        console.log('   MongoDB pone los valores undefined/null al FINAL cuando se ordena DESC');
        console.log('   Por eso el 4lt queda después del límite de 100!\n');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB\n');
  }
}

main();
