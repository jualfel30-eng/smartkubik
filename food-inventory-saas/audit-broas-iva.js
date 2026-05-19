/**
 * Auditoría IVA para Tiendas Broas.
 * Lista productos con ivaRate:0 y agrupa por categoría/subcategoría
 * para facilitar decisión: cuáles son exentos legítimos (alimentos básicos)
 * y cuáles son víctimas del bug del default 0.
 */

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // 1. Encontrar tenant Broas
  const tenants = db.collection('tenants');
  const broasCandidates = await tenants.find(
    { $or: [
      { name: { $regex: /broas/i } },
      { slug: { $regex: /broas/i } },
      { businessName: { $regex: /broas/i } },
    ] },
    { projection: { _id: 1, name: 1, slug: 1, businessName: 1 } },
  ).toArray();

  console.log('Tenants candidatos:');
  broasCandidates.forEach(t => console.log(`  ${t._id}  name="${t.name}"  slug="${t.slug}"  business="${t.businessName}"`));
  console.log('');

  if (broasCandidates.length === 0) {
    console.log('❌ No se encontró tenant Broas');
    await mongoose.disconnect();
    return;
  }

  const products = db.collection('products');

  // Iterar TODOS los tenants Broas
  for (const tenant of broasCandidates) {
  const tenantId = tenant._id;
  const tenantIdStr = tenantId.toString();
  console.log('━'.repeat(70));
  console.log(`Auditando: ${tenant.name} (${tenantIdStr})`);
  console.log('━'.repeat(70));

  // 2. Stats generales del tenant
  const total = await products.countDocuments({
    $or: [{ tenantId }, { tenantId: tenantIdStr }],
  });
  const rate0 = await products.countDocuments({
    $or: [{ tenantId }, { tenantId: tenantIdStr }],
    ivaRate: 0,
  });
  const rate8 = await products.countDocuments({
    $or: [{ tenantId }, { tenantId: tenantIdStr }],
    ivaRate: 8,
  });
  const rate16 = await products.countDocuments({
    $or: [{ tenantId }, { tenantId: tenantIdStr }],
    ivaRate: 16,
  });

  console.log(`=== Tiendas Broas (tenantId=${tenantIdStr}) ===`);
  console.log(`Total productos: ${total}`);
  console.log(`  ivaRate=0:   ${rate0}`);
  console.log(`  ivaRate=8:   ${rate8}`);
  console.log(`  ivaRate=16:  ${rate16}`);
  console.log('');

  // 3. Listar todos los ivaRate=0 con detalle, agrupados por categoría
  const exempt = await products.find(
    {
      $or: [{ tenantId }, { tenantId: tenantIdStr }],
      ivaRate: 0,
    },
    {
      projection: {
        _id: 1, name: 1, sku: 1, category: 1, subcategory: 1,
        ivaApplicable: 1, ivaRate: 1, isActive: 1, createdAt: 1, updatedAt: 1,
      },
    },
  ).toArray();

  // Agrupar por categoría
  const byCategory = {};
  exempt.forEach(p => {
    const cat = Array.isArray(p.category) ? (p.category[0] || 'sin-categoria') : (p.category || 'sin-categoria');
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  });

  console.log(`=== Productos con ivaRate=0 agrupados por categoría ===`);
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length);
  for (const [cat, prods] of sortedCats) {
    console.log(`\n📁 ${cat} (${prods.length} productos)`);
    prods.slice(0, 20).forEach(p => {
      const subcat = Array.isArray(p.subcategory) ? (p.subcategory[0] || '') : (p.subcategory || '');
      const ivaBool = p.ivaApplicable === true ? 'true' : (p.ivaApplicable === false ? 'false' : 'unset');
      const created = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '?';
      console.log(`  [${ivaBool}] sku=${p.sku || '-'}  ${p.name}  (subcat: ${subcat})  created=${created}`);
    });
    if (prods.length > 20) console.log(`  ... y ${prods.length - 20} más`);
  }

  // 4. Diagnóstico clave: separar legítimos vs sospechosos
  const legitExempt = exempt.filter(p => p.ivaApplicable === false);
  const suspectExempt = exempt.filter(p => p.ivaApplicable === true);
  const unsetExempt = exempt.filter(p => p.ivaApplicable === undefined || p.ivaApplicable === null);

  console.log(`\n=== Diagnóstico ===`);
  console.log(`Exentos legítimos (ivaApplicable=false): ${legitExempt.length}`);
  console.log(`Sospechosos (ivaApplicable=true Y ivaRate=0): ${suspectExempt.length}`);
  console.log(`Sin ivaApplicable: ${unsetExempt.length}`);

  // Export CSV de sospechosos (solo si los hay)
  if (suspectExempt.length > 0) {
    const fs = require('fs');
    const csvHeader = '_id,sku,name,category,subcategory,ivaApplicable,ivaRate,createdAt\n';
    const csvRows = suspectExempt.map(p => {
      const cat = Array.isArray(p.category) ? p.category.join('|') : (p.category || '');
      const subcat = Array.isArray(p.subcategory) ? p.subcategory.join('|') : (p.subcategory || '');
      const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return [
        p._id, escape(p.sku || ''), escape(p.name || ''), escape(cat), escape(subcat),
        p.ivaApplicable, p.ivaRate,
        p.createdAt ? new Date(p.createdAt).toISOString() : '',
      ].join(',');
    }).join('\n');
    const csvPath = `/tmp/broas-sospechosos-${tenantIdStr}.csv`;
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`📋 CSV exportado: ${csvPath}`);
  }

  console.log('');
  } // fin loop tenants

  await mongoose.disconnect();
})().catch(e => { console.error('❌', e.message); console.error(e.stack); process.exit(1); });
