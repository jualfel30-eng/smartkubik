/**
 * Fix IVA en tenant Tiendas Broas C.A. (69b187062339e815ceba7487):
 *  - 12 productos básicos (alimentos exentos por ley venezolana) → ivaRate=0 + ivaApplicable=false
 *  - 182 productos restantes con ivaApplicable=true e ivaRate=0 → ivaRate=16
 *
 * Uso:
 *   node fix-broas-iva.js              # dry-run
 *   node fix-broas-iva.js --execute    # aplica updates
 */

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";
const EXECUTE = process.argv.includes('--execute');
const TENANT_ID = '69b187062339e815ceba7487';

// 12 productos básicos exentos por Ley del IVA Venezuela
const EXEMPT_SKUS = [
  'TIE-1643', // Pasta Premium Vermicelli 500grs
  'TIE-1644', // Pasta Extra Especial Tornillo 500grs
  'TBS-1352', // Garbanzos Santaniello 400gr
  'TIE-1515', // Garbanzo Macarena
  'TIE-1482', // Avena en Hojuelas 400grs
  'TIE-1543', // Avena en Hojuelas
  'TIE-1519', // Arroz Arborio Italiano 1Kg
  'TIE-1638', // Azucar Cafetin 20x800grs
  'TIE-1634', // Leche en Polvo 900grs
  'TIE-1635', // Leche en Polvo 400grs
  'TIE-1636', // Leche en Polvo 125grs
  'TIE-1578', // Papelón Natural
];

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const products = db.collection('products');
  const ObjectId = mongoose.Types.ObjectId;
  const tenantOid = new ObjectId(TENANT_ID);

  const tenantMatch = { $or: [{ tenantId: tenantOid }, { tenantId: TENANT_ID }] };

  // Identificar el universo: ivaApplicable=true Y ivaRate=0 en este tenant
  const allSuspects = await products.find(
    { ...tenantMatch, ivaApplicable: true, ivaRate: 0 },
    { projection: { _id: 1, sku: 1, name: 1, ivaApplicable: 1, ivaRate: 1 } },
  ).toArray();

  console.log('='.repeat(70));
  console.log(EXECUTE ? '🚀 MODO EJECUCIÓN' : '🧪 MODO DRY-RUN');
  console.log('='.repeat(70));
  console.log(`Total sospechosos en tenant ${TENANT_ID}: ${allSuspects.length}`);

  // Verificar que los 12 exentos existen
  const exemptFound = await products.find(
    { ...tenantMatch, sku: { $in: EXEMPT_SKUS } },
    { projection: { _id: 1, sku: 1, name: 1, ivaApplicable: 1, ivaRate: 1 } },
  ).toArray();

  console.log(`\nProductos exentos a preservar (esperados ${EXEMPT_SKUS.length}, encontrados ${exemptFound.length}):`);
  exemptFound.forEach(p => {
    console.log(`  ✓ ${p.sku.padEnd(15)}  ${p.name}  (actual: ivaApplicable=${p.ivaApplicable}, ivaRate=${p.ivaRate})`);
  });

  const missingExempt = EXEMPT_SKUS.filter(sku => !exemptFound.find(p => p.sku === sku));
  if (missingExempt.length > 0) {
    console.log(`\n⚠️  SKUs exentos NO encontrados:`);
    missingExempt.forEach(sku => console.log(`     ${sku}`));
  }

  // El resto va a ivaRate=16 (filtramos por _id de los exentos encontrados)
  const exemptIds = exemptFound.map(p => p._id);
  const toBumpCount = await products.countDocuments({
    ...tenantMatch,
    ivaApplicable: true,
    ivaRate: 0,
    _id: { $nin: exemptIds },
  });

  console.log(`\nResumen de cambios:`);
  console.log(`  → ${exemptFound.length} productos: ivaApplicable=true → false (mantener ivaRate=0)`);
  console.log(`  → ${toBumpCount} productos: ivaRate=0 → 16 (mantener ivaApplicable=true)`);

  if (!EXECUTE) {
    console.log('\n⚠️  DRY-RUN: no se realizaron cambios. Usa --execute para aplicar.');
    await mongoose.disconnect();
    return;
  }

  console.log('\nAplicando updates...\n');

  // Update 1: exentos legítimos — corregir el flag ivaApplicable
  const r1 = await products.updateMany(
    { ...tenantMatch, sku: { $in: EXEMPT_SKUS } },
    { $set: { ivaApplicable: false, ivaRate: 0 } },
  );
  console.log(`✓ Exentos consolidados: ${r1.modifiedCount} (ivaApplicable=false, ivaRate=0)`);

  // Update 2: el resto a 16%
  const r2 = await products.updateMany(
    {
      ...tenantMatch,
      ivaApplicable: true,
      ivaRate: 0,
      _id: { $nin: exemptIds },
    },
    { $set: { ivaRate: 16 } },
  );
  console.log(`✓ Subidos a 16%: ${r2.modifiedCount}`);

  // Verificación post
  const finalRate0 = await products.countDocuments({ ...tenantMatch, ivaRate: 0 });
  const finalRate16 = await products.countDocuments({ ...tenantMatch, ivaRate: 16 });
  const finalSuspects = await products.countDocuments({
    ...tenantMatch,
    ivaApplicable: true,
    ivaRate: 0,
  });

  console.log(`\nEstado final tenant Broas C.A.:`);
  console.log(`  ivaRate=0:           ${finalRate0}`);
  console.log(`  ivaRate=16:          ${finalRate16}`);
  console.log(`  Sospechosos restantes (ivaApplicable=true, ivaRate=0): ${finalSuspects}`);

  await mongoose.disconnect();
  console.log('\n✓ Desconectado');
})().catch(e => { console.error('❌', e.message); console.error(e.stack); process.exit(1); });
