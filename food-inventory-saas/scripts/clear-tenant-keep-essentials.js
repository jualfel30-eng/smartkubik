const mongoose = require('mongoose');
require('dotenv').config();

async function clearTenantKeepEssentials() {
  const tenantIdArg = process.argv[2];

  if (!tenantIdArg) {
    console.error('❌ ERROR: Debe proporcionar el ID del tenant a limpiar.');
    console.log('📖 Uso: node scripts/clear-tenant-keep-essentials.js <tenant_id>');
    console.log('📖 Ejemplo: node scripts/clear-tenant-keep-essentials.js 60d21b4667d0d8992e610c85');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar el tenant por ID
    let tenant;
    try {
        tenant = await db.collection('tenants').findOne({ _id: new mongoose.Types.ObjectId(tenantIdArg) });
    } catch(e) {
        console.log(`❌ ERROR: El ID proporcionado "${tenantIdArg}" no es un ObjectId válido.`);
        process.exit(1);
    }

    if (!tenant) {
      console.log(`❌ Tenant con ID ${tenantIdArg} no encontrado`);
      return;
    }

    console.log('🏢 Tenant encontrado:', tenant.name);
    console.log('🆔 TenantId:', tenant._id);
    console.log('\n🗑️  Limpiando datos transaccionales del tenant...\n');

    // Colecciones a limpiar (transaccionales)
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
      // 'products' and 'suppliers' can be considered master data, but are included here for a cleaner state
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
    console.log(`Total de documentos transaccionales eliminados: ${totalDeleted}`);
    console.log('\n✅ PRESERVADO:');
    console.log('  - Plan de cuentas (chartofaccounts)');
    console.log('  - Roles y permisos (roles, permissions)');
    console.log('  - Usuarios (users)');
    console.log('  - Configuración del tenant (tenants)');
    console.log('\n⚠️  El sistema está limpio y listo para re-usar.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

clearTenantKeepEssentials();
