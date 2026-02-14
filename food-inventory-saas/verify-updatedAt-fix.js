/**
 * Verificar que TODOS los inventarios tienen updatedAt y que el sort funciona
 */
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
const TENANT_ID = '6984b426dad0fee93da83cfb';
const InventorySchema = new mongoose.Schema({}, { collection: 'inventories', strict: false });

async function main() {
  await mongoose.connect(MONGODB_URI);
  const Inventory = mongoose.model('Inventory', InventorySchema);

  const filter = {
    tenantId: new mongoose.Types.ObjectId(TENANT_ID),
    isActive: { $ne: false }
  };

  // Total inventories
  const total = await Inventory.countDocuments(filter);

  // Inventories WITHOUT updatedAt
  const missingUpdatedAt = await Inventory.countDocuments({ ...filter, updatedAt: { $exists: false } });

  // Inventories WITHOUT lastUpdated (for comparison)
  const missingLastUpdated = await Inventory.countDocuments({ ...filter, lastUpdated: { $exists: false } });

  // Inventories WITH updatedAt
  const hasUpdatedAt = await Inventory.countDocuments({ ...filter, updatedAt: { $exists: true } });

  console.log(`\n📊 INVENTARIOS DEL TENANT:\n`);
  console.log(`  Total activos: ${total}`);
  console.log(`  Con updatedAt: ${hasUpdatedAt} ✅`);
  console.log(`  Sin updatedAt: ${missingUpdatedAt} ${missingUpdatedAt > 0 ? '❌' : '✅'}`);
  console.log(`  Sin lastUpdated: ${missingLastUpdated}`);
  console.log('');

  // Now test the sort with updatedAt
  const first100 = await Inventory
    .find(filter)
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  console.log(`📦 Primeros 100 con sort updatedAt DESC:\n`);

  // Check how many have valid updatedAt dates
  let withDate = 0;
  let withoutDate = 0;
  first100.forEach(inv => {
    if (inv.updatedAt) withDate++;
    else withoutDate++;
  });

  console.log(`  Con updatedAt válido: ${withDate}`);
  console.log(`  Sin updatedAt: ${withoutDate}`);
  console.log('');

  // Get ALL and check sort stability
  const all = await Inventory
    .find(filter)
    .sort({ updatedAt: -1 })
    .lean();

  console.log(`📦 TODOS ${all.length} inventarios con sort updatedAt DESC:\n`);

  // Show last 10 (the ones that would be cut off at limit 100)
  if (all.length > 100) {
    console.log(`  ⚠️  ${all.length - 100} inventarios quedarían fuera del límite de 100`);
    console.log(`  Los últimos 5 por updatedAt:\n`);
    all.slice(-5).forEach((inv, idx) => {
      console.log(`    ${all.length - 4 + idx}. ${inv.productName} | updatedAt: ${inv.updatedAt || 'MISSING'}`);
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
