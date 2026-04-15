/**
 * Script: Search Recent Purchase Orders
 *
 * Busca órdenes de compra recientes de Tiendas Broas
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

async function searchRecentPOs() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('test');
    const purchaseOrdersCollection = db.collection('purchaseorders');

    // Tenant IDs de Tiendas Broas
    const broas1TenantId = '69b187062339e815ceba7487';
    const broas2TenantId = '68d55e4b764d359fed186e47';

    console.log('🔍 Buscando órdenes recientes de Tiendas Broas (últimas 20)...\n');

    // Buscar las últimas 20 órdenes
    const pos = await purchaseOrdersCollection.find({
      $or: [
        { tenantId: broas1TenantId },
        { tenantId: broas2TenantId }
      ]
    }).sort({ createdAt: -1 }).limit(20).toArray();

    console.log(`✅ Se encontraron ${pos.length} órdenes:\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    pos.forEach((po, index) => {
      const date = po.purchaseDate ? new Date(po.purchaseDate).toISOString().split('T')[0] : 'N/A';
      const created = po.createdAt ? new Date(po.createdAt).toISOString() : 'N/A';

      console.log(`\n[${index + 1}]`);
      console.log(`    Número: ${po.purchaseOrderNumber || po.poNumber || 'N/A'}`);
      console.log(`    ID: ${po._id}`);
      console.log(`    Proveedor: ${po.supplierName || 'N/A'}`);
      console.log(`    Fecha Compra: ${date}`);
      console.log(`    Creada: ${created}`);
      console.log(`    Monto USD: $${po.totalAmount || 0}`);
      console.log(`    Monto Bs: ${po.totalAmountVes?.toFixed(2) || '0.00'}`);
      console.log(`    Estado: ${po.status || 'N/A'}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Buscar específicamente órdenes del 7 de abril 2026
    console.log('\n\n🔍 Buscando órdenes del 7 de abril 2026...\n');

    const april7Start = new Date('2026-04-07T00:00:00.000Z');
    const april7End = new Date('2026-04-08T00:00:00.000Z');

    const april7POs = await purchaseOrdersCollection.find({
      $or: [
        { tenantId: broas1TenantId },
        { tenantId: broas2TenantId }
      ],
      $or: [
        {
          purchaseDate: {
            $gte: april7Start,
            $lt: april7End
          }
        },
        {
          createdAt: {
            $gte: april7Start,
            $lt: april7End
          }
        }
      ]
    }).toArray();

    if (april7POs.length > 0) {
      console.log(`✅ Órdenes del 7 de abril 2026: ${april7POs.length}\n`);
      april7POs.forEach((po, index) => {
        const date = po.purchaseDate ? new Date(po.purchaseDate).toISOString() : 'N/A';
        const created = po.createdAt ? new Date(po.createdAt).toISOString() : 'N/A';

        console.log(`[${index + 1}] ${po.purchaseOrderNumber || po.poNumber || 'N/A'}`);
        console.log(`    ID: ${po._id}`);
        console.log(`    Proveedor: ${po.supplierName || 'N/A'}`);
        console.log(`    Fecha: ${date}`);
        console.log(`    Creada: ${created}`);
        console.log(`    Monto: $${po.totalAmount || 0} / Bs ${po.totalAmountVes?.toFixed(2) || '0.00'}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron órdenes del 7 de abril 2026');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Ejecutar
searchRecentPOs()
  .then(() => {
    console.log('\n✅ Búsqueda completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });
