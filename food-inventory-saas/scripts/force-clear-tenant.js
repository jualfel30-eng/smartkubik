const mongoose = require('mongoose');
require('dotenv').config();

async function forceClearTenant() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar el tenant EARLYADOPTER
    const tenant = await db.collection('tenants').findOne({ code: 'EARLYADOPTER' });

    if (!tenant) {
      console.log('❌ Tenant EARLYADOPTER no encontrado');
      return;
    }

    console.log('🏢 Tenant:', tenant.name);
    console.log('🆔 TenantId:', tenant._id);

    const tenantIdObj = tenant._id;
    const tenantIdStr = tenant._id.toString();

    console.log('\n🗑️  Limpiando datos del tenant...\n');

    // Lista de colecciones a limpiar
    const collectionsToClean = [
      'orders',
      'customers',
      'inventory',
      'inventories',
      'inventorymovements',
      'events',
      'payables',
      'payments',
      'journalentries',
      'shifts',
      'todos',
      'purchaseorders',
      'ratings',
      'purchaseorderratings',
      'products',
      'suppliers',
      'performancekpis',
      'recurringpayables',
      'auditlogs',
    ];

    let totalDeleted = 0;

    for (const collectionName of collectionsToClean) {
      try {
        // Intentar con ObjectId
        let result = await db.collection(collectionName).deleteMany({
          tenantId: tenantIdObj
        });

        // Si no borró nada, intentar con string
        if (result.deletedCount === 0) {
          result = await db.collection(collectionName).deleteMany({
            tenantId: tenantIdStr
          });
        }

        if (result.deletedCount > 0) {
          console.log(`✅ ${collectionName}: ${result.deletedCount} documentos eliminados`);
          totalDeleted += result.deletedCount;
        } else {
          console.log(`⚪ ${collectionName}: 0 documentos`);
        }
      } catch (error) {
        console.log(`⚠️  ${collectionName}: Error (${error.message})`);
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log('='.repeat(80));
    console.log(`Total de documentos eliminados: ${totalDeleted}`);
    console.log('\n✅ PRESERVADO:');
    console.log('  - Tenants');
    console.log('  - Usuarios');
    console.log('  - Roles y permisos');
    console.log('  - Plan de cuentas');
    console.log('\n✅ Sistema limpio.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

forceClearTenant();