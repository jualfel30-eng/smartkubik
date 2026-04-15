/**
 * Script: Search for Duplicate Purchase Order
 *
 * Busca órdenes de compra de Cocoanet del 7/4/2026
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

async function searchPO() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('test');
    const purchaseOrdersCollection = db.collection('purchaseorders');

    // Buscar por tenant Tiendas Broas
    const broas1TenantId = '69b187062339e815ceba7487';
    const broas2TenantId = '68d55e4b764d359fed186e47';

    console.log('🔍 Buscando órdenes de compra de Cocoanet...\n');

    // Buscar órdenes con Cocoanet en el nombre
    const pos = await purchaseOrdersCollection.find({
      $or: [
        { tenantId: broas1TenantId },
        { tenantId: broas2TenantId }
      ],
      supplierName: { $regex: /Cocoanet/i },
      totalAmount: { $gte: 230, $lte: 240 } // Rango cercano a $234.55
    }).sort({ createdAt: -1 }).limit(20).toArray();

    if (pos.length === 0) {
      console.log('❌ No se encontraron órdenes de Cocoanet con ese monto');

      // Buscar todas las órdenes de Cocoanet
      const allCocoanet = await purchaseOrdersCollection.find({
        $or: [
          { tenantId: broas1TenantId },
          { tenantId: broas2TenantId }
        ],
        supplierName: { $regex: /Cocoanet/i }
      }).sort({ createdAt: -1 }).limit(10).toArray();

      if (allCocoanet.length > 0) {
        console.log('\n📋 Todas las órdenes de Cocoanet encontradas:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        allCocoanet.forEach(po => {
          const date = po.purchaseDate ? new Date(po.purchaseDate).toISOString().split('T')[0] : 'N/A';
          const created = po.createdAt ? new Date(po.createdAt).toISOString() : 'N/A';
          console.log(`\nNúmero: ${po.purchaseOrderNumber || 'N/A'}`);
          console.log(`ID: ${po._id}`);
          console.log(`Proveedor: ${po.supplierName}`);
          console.log(`Fecha Compra: ${date}`);
          console.log(`Creada: ${created}`);
          console.log(`Monto: $${po.totalAmount || 0} / Bs ${po.totalAmountVes || 0}`);
          console.log(`Estado: ${po.status}`);
        });
      }
      return;
    }

    console.log(`✅ Se encontraron ${pos.length} orden(es) de Cocoanet:\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    pos.forEach((po, index) => {
      const date = po.purchaseDate ? new Date(po.purchaseDate).toISOString().split('T')[0] : 'N/A';
      const created = po.createdAt ? new Date(po.createdAt).toISOString() : 'N/A';

      console.log(`\n[${index + 1}] Orden de Compra:`);
      console.log(`    Número: ${po.purchaseOrderNumber || 'N/A'}`);
      console.log(`    ID: ${po._id}`);
      console.log(`    Proveedor: ${po.supplierName}`);
      console.log(`    Fecha Compra: ${date}`);
      console.log(`    Creada: ${created}`);
      console.log(`    Monto: $${po.totalAmount} / Bs ${po.totalAmountVes || 0}`);
      console.log(`    Estado: ${po.status}`);
      console.log(`    Tenant: ${po.tenantId}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Ejecutar
searchPO()
  .then(() => {
    console.log('\n✅ Búsqueda completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });
