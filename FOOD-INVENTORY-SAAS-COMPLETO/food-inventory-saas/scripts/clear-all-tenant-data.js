const mongoose = require('mongoose');
require('dotenv').config();

async function clearAllTenantData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar el usuario admin
    const adminUser = await db.collection('users').findOne({ email: 'admin@earlyadopter.com' });

    if (!adminUser) {
      console.log('❌ Usuario admin@earlyadopter.com no encontrado');
      return;
    }

    const tenantId = adminUser.tenantId;
    console.log('🏢 TenantId a limpiar:', tenantId);

    // Obtener TODAS las colecciones de la base de datos
    const collections = await db.listCollections().toArray();

    console.log('\n🗑️  Limpiando datos del tenant...\n');

    // Colecciones a NUNCA tocar
    const protectedCollections = [
      'tenants',
      'users',
      'roles',
      'permissions',
      'chartofaccounts',
    ];

    let totalDeleted = 0;

    for (const collection of collections) {
      const collectionName = collection.name;

      // Saltar colecciones del sistema
      if (collectionName.startsWith('system.')) {
        continue;
      }

      // Saltar colecciones protegidas
      if (protectedCollections.includes(collectionName)) {
        console.log(`⚪ ${collectionName}: PROTEGIDA (no se toca)`);
        continue;
      }

      try {
        // Intentar borrar por tenantId
        const result = await db.collection(collectionName).deleteMany({
          tenantId: tenantId
        });

        if (result.deletedCount > 0) {
          console.log(`✅ ${collectionName}: ${result.deletedCount} documentos eliminados`);
          totalDeleted += result.deletedCount;
        } else {
          console.log(`⚪ ${collectionName}: 0 documentos (sin datos del tenant)`);
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
    console.log('\n✅ Sistema limpio y listo para usar.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

clearAllTenantData();