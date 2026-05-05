/**
 * Backfill seguro de ivaRate basado en ivaApplicable.
 *
 * Reglas:
 *   - Solo toca productos donde el campo ivaRate NO existe (no toca los que ya tienen valor explícito).
 *   - Mapeo: ivaApplicable=true → ivaRate=16, ivaApplicable=false → ivaRate=0,
 *           ivaApplicable ausente/null → ivaRate=16 (alineado con default nuevo del schema).
 *
 * Uso:
 *   node migrate-iva-rate-v2.js              # dry-run (no escribe)
 *   node migrate-iva-rate-v2.js --execute    # ejecuta updates
 */

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";
const EXECUTE = process.argv.includes('--execute');

(async () => {
  await mongoose.connect(uri);
  console.log('✓ Conectado a MongoDB\n');

  const products = mongoose.connection.db.collection('products');

  const total = await products.countDocuments({});
  const candidates = await products.countDocuments({ ivaRate: { $exists: false } });
  const taxable = await products.countDocuments({ ivaRate: { $exists: false }, ivaApplicable: true });
  const exempt = await products.countDocuments({ ivaRate: { $exists: false }, ivaApplicable: false });
  const unset = await products.countDocuments({
    ivaRate: { $exists: false },
    $or: [{ ivaApplicable: { $exists: false } }, { ivaApplicable: null }],
  });

  console.log('='.repeat(60));
  console.log(EXECUTE ? '🚀 MODO EJECUCIÓN' : '🧪 MODO DRY-RUN');
  console.log('='.repeat(60));
  console.log(`Total productos:                          ${total}`);
  console.log(`Candidatos (sin campo ivaRate):           ${candidates}`);
  console.log(`  - ivaApplicable=true → ivaRate=16:     ${taxable}`);
  console.log(`  - ivaApplicable=false → ivaRate=0:     ${exempt}`);
  console.log(`  - ivaApplicable ausente → ivaRate=16:  ${unset}`);
  console.log('');

  // Sample preview de 5 docs
  console.log('Muestra de 5 productos a tocar:');
  const sample = await products.find(
    { ivaRate: { $exists: false } },
    { projection: { _id: 1, name: 1, sku: 1, ivaApplicable: 1, tenantId: 1, createdAt: 1 } },
  ).limit(5).toArray();
  sample.forEach((p, i) => {
    const target = p.ivaApplicable === false ? 0 : 16;
    console.log(`  ${i + 1}. ${p.name || '(sin nombre)'} sku=${p.sku || '-'} ivaApplicable=${p.ivaApplicable} → ivaRate=${target}`);
  });
  console.log('');

  if (!EXECUTE) {
    console.log('⚠️  DRY-RUN: no se realizaron cambios. Usa --execute para aplicar.');
    await mongoose.disconnect();
    return;
  }

  console.log('Aplicando updates...\n');

  const r1 = await products.updateMany(
    { ivaRate: { $exists: false }, ivaApplicable: true },
    { $set: { ivaRate: 16 } },
  );
  const r2 = await products.updateMany(
    { ivaRate: { $exists: false }, ivaApplicable: false },
    { $set: { ivaRate: 0 } },
  );
  const r3 = await products.updateMany(
    {
      ivaRate: { $exists: false },
      $or: [{ ivaApplicable: { $exists: false } }, { ivaApplicable: null }],
    },
    { $set: { ivaRate: 16, ivaApplicable: true } },
  );

  console.log(`✓ ivaApplicable=true  → ivaRate=16:  ${r1.modifiedCount} actualizados`);
  console.log(`✓ ivaApplicable=false → ivaRate=0:   ${r2.modifiedCount} actualizados`);
  console.log(`✓ ivaApplicable null  → ivaRate=16:  ${r3.modifiedCount} actualizados`);
  console.log(`\nTotal: ${r1.modifiedCount + r2.modifiedCount + r3.modifiedCount} productos\n`);

  // Verificación post
  const remaining = await products.countDocuments({ ivaRate: { $exists: false } });
  const finalRate0 = await products.countDocuments({ ivaRate: 0 });
  const finalRate8 = await products.countDocuments({ ivaRate: 8 });
  const finalRate16 = await products.countDocuments({ ivaRate: 16 });

  console.log('Estado final:');
  console.log(`  Sin ivaRate (debe ser 0):  ${remaining}`);
  console.log(`  ivaRate=0:                  ${finalRate0}`);
  console.log(`  ivaRate=8:                  ${finalRate8}`);
  console.log(`  ivaRate=16:                 ${finalRate16}`);

  await mongoose.disconnect();
  console.log('\n✓ Desconectado');
})().catch((e) => {
  console.error('❌ Error:', e.message);
  console.error(e.stack);
  process.exit(1);
});
