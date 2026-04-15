/**
 * Script: Delete Purchase Order by ID
 *
 * Elimina orden OC-260407-135818-496726
 * ID: 69d50d7aad57ed61059e65fe
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

async function deletePO() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('test');
    const purchaseOrdersCollection = db.collection('purchaseorders');

    const poId = '69d50d7aad57ed61059e65fe';

    // Buscar la orden primero
    const po = await purchaseOrdersCollection.findOne({ _id: new ObjectId(poId) });

    if (!po) {
      console.log('❌ Orden no encontrada');
      return;
    }

    // Mostrar información
    console.log('📋 ORDEN A ELIMINAR:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Número: ${po.purchaseOrderNumber || po.poNumber || 'N/A'}`);
    console.log(`ID: ${po._id}`);
    console.log(`Proveedor: ${po.supplierName || 'N/A'}`);
    console.log(`Fecha: ${po.purchaseDate ? new Date(po.purchaseDate).toISOString().split('T')[0] : 'N/A'}`);
    console.log(`Monto: $${po.totalAmount || 0} / Bs ${po.totalAmountVes?.toFixed(2) || '0.00'}`);
    console.log(`Estado: ${po.status || 'N/A'}`);
    console.log(`Tenant: ${po.tenantId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Eliminar
    console.log('🗑️  Eliminando orden...');
    const result = await purchaseOrdersCollection.deleteOne({ _id: new ObjectId(poId) });

    if (result.deletedCount === 1) {
      console.log('✅ Orden eliminada exitosamente');
    } else {
      console.log('❌ No se pudo eliminar la orden');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Ejecutar
deletePO()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });
