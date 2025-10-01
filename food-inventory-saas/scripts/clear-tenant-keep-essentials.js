const mongoose = require('mongoose');
require('dotenv').config();

async function clearTenantKeepEssentials() {
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

    console.log('🏢 Tenant encontrado:', tenant.name);
    console.log('🆔 TenantId:', tenant._id);
    console.log('\n🗑️  Limpiando datos del tenant...\n');

    // Colecciones a limpiar (TODAS las transaccionales)
    const collectionsToClean = [
      'orders',
      'customers',
      'inventory',
      'inventorymovements',
      'events',
      'payables',
      'payments',
      'journalentries',
      'shifts',
      'todos',
      'purchaseorders',
      'ratings',
      'products',
      'suppliers',
    ];

    let totalDeleted = 0;

    for (const collectionName of collectionsToClean) {
      try {
        const result = await db.collection(collectionName).deleteMany({
          tenantId: tenant._id
        });
        console.log(`✅ ${collectionName}: ${result.deletedCount} documentos eliminados`);
        totalDeleted += result.deletedCount;
      } catch (error) {
        console.log(`⚠️  ${collectionName}: Error (${error.message})`);
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log('='.repeat(80));
    console.log(`Total de documentos eliminados: ${totalDeleted}`);
    console.log('\n✅ PRESERVADO:');
    console.log('  - Plan de cuentas (chartofaccounts)');
    console.log('  - Roles y permisos (roles, permissions)');
    console.log('  - Usuario super-admin (users)');
    console.log('  - Configuración del tenant (tenants)');
    console.log('\n⚠️  El sistema está limpio y listo para usar.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

clearTenantKeepEssentials();