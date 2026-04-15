/**
 * Script: Delete Duplicate Purchase Order
 *
 * Elimina orden de compra duplicada OC-260407-135818-496726
 * del tenant Tiendas Broas
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

async function deleteDuplicatePO() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('test');
    const purchaseOrdersCollection = db.collection('purchaseorders');

    // Buscar la orden de compra
    const poNumber = 'OC-260407-135818-496726';
    const po = await purchaseOrdersCollection.findOne({
      purchaseOrderNumber: poNumber
    });

    if (!po) {
      console.log(`❌ No se encontró la orden de compra ${poNumber}`);
      return;
    }

    // Mostrar información de la orden
    console.log('📋 INFORMACIÓN DE LA ORDEN DE COMPRA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Número de Orden: ${po.purchaseOrderNumber}`);
    console.log(`ID: ${po._id}`);
    console.log(`Tenant ID: ${po.tenantId}`);
    console.log(`Proveedor: ${po.supplierName}`);
    console.log(`Fecha: ${po.purchaseDate ? new Date(po.purchaseDate).toISOString().split('T')[0] : 'N/A'}`);
    console.log(`Monto Total: $${po.totalAmount || 0}`);
    console.log(`Monto Bs: ${po.totalAmountVes || 0}`);
    console.log(`Estado: ${po.status}`);
    console.log(`Creada: ${po.createdAt ? new Date(po.createdAt).toISOString() : 'N/A'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificar que es del tenant correcto
    const broas1TenantId = '69b187062339e815ceba7487';
    const broas2TenantId = '68d55e4b764d359fed186e47';

    if (po.tenantId !== broas1TenantId && po.tenantId !== broas2TenantId) {
      console.log(`⚠️  ADVERTENCIA: Esta orden NO es del tenant Tiendas Broas`);
      console.log(`   Tenant ID encontrado: ${po.tenantId}`);
      console.log(`   Tenant IDs esperados: ${broas1TenantId} o ${broas2TenantId}`);
      console.log('\n❌ Operación cancelada por seguridad');
      return;
    }

    console.log('✅ Verificación: Orden pertenece al tenant Tiendas Broas\n');

    // Eliminar la orden
    console.log('🗑️  Eliminando orden de compra...');
    const result = await purchaseOrdersCollection.deleteOne({ _id: po._id });

    if (result.deletedCount === 1) {
      console.log('✅ Orden de compra eliminada exitosamente\n');

      // Verificar si quedan órdenes con números similares
      const similarPOs = await purchaseOrdersCollection.find({
        purchaseOrderNumber: { $regex: /^OC-260407/ },
        tenantId: po.tenantId
      }).toArray();

      if (similarPOs.length > 0) {
        console.log(`ℹ️  Órdenes similares encontradas (mismo día):`);
        similarPOs.forEach(similarPO => {
          console.log(`   - ${similarPO.purchaseOrderNumber} | ${similarPO.supplierName} | $${similarPO.totalAmount}`);
        });
      }
    } else {
      console.log('❌ No se pudo eliminar la orden de compra');
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
deleteDuplicatePO()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });
