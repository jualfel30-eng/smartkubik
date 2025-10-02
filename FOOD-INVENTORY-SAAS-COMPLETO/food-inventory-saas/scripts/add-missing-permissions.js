const mongoose = require('mongoose');
require('dotenv').config();

async function addMissingPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar el usuario admin
    const user = await db.collection('users').findOne({
      email: 'admin@earlyadopter.com'
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    // Buscar el rol
    const role = await db.collection('roles').findOne({ _id: user.role });

    if (!role) {
      console.log('❌ Rol no encontrado');
      return;
    }

    console.log('👤 Usuario:', user.email);
    console.log('📋 Rol:', role.name);
    console.log('🔐 Permisos actuales:', role.permissions?.length || 0);

    // Crear los permisos faltantes
    const missingPermissions = [
      { name: 'accounting_read', description: 'Ver contabilidad', category: 'accounting' },
      { name: 'accounting_create', description: 'Crear registros contables', category: 'accounting' },
      { name: 'accounting_update', description: 'Actualizar registros contables', category: 'accounting' },
      { name: 'accounting_delete', description: 'Eliminar registros contables', category: 'accounting' },
      { name: 'purchases_read', description: 'Ver compras', category: 'purchases' },
      { name: 'purchases_create', description: 'Crear compras', category: 'purchases' },
      { name: 'purchases_update', description: 'Actualizar compras', category: 'purchases' },
      { name: 'purchases_delete', description: 'Eliminar compras', category: 'purchases' },
      { name: 'events_read', description: 'Ver eventos/calendario', category: 'events' },
      { name: 'events_create', description: 'Crear eventos', category: 'events' },
      { name: 'events_update', description: 'Actualizar eventos', category: 'events' },
      { name: 'events_delete', description: 'Eliminar eventos', category: 'events' },
      { name: 'tenant_settings_read', description: 'Ver configuración del tenant', category: 'settings' },
      { name: 'tenant_settings_update', description: 'Actualizar configuración del tenant', category: 'settings' },
    ];

    console.log(`\n🔄 Creando ${missingPermissions.length} permisos faltantes...`);

    const permissionsToInsert = missingPermissions.map(p => ({
      ...p,
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await db.collection('permissions').insertMany(permissionsToInsert);
    console.log(`✅ Creados ${permissionsToInsert.length} permisos nuevos`);

    // Agregar estos permisos al rol de admin
    const newPermissionIds = permissionsToInsert.map(p => p._id);
    const updatedPermissions = [...role.permissions, ...newPermissionIds];

    await db.collection('roles').updateOne(
      { _id: role._id },
      {
        $set: {
          permissions: updatedPermissions,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Rol actualizado con ${updatedPermissions.length} permisos totales`);

    console.log('\n📊 RESUMEN:');
    console.log('='.repeat(80));
    console.log(`Usuario: ${user.email}`);
    console.log(`Rol: ${role.name}`);
    console.log(`Permisos previos: ${role.permissions.length}`);
    console.log(`Permisos agregados: ${newPermissionIds.length}`);
    console.log(`Permisos totales: ${updatedPermissions.length}`);
    console.log('\n⚠️  IMPORTANTE: Haz logout y vuelve a iniciar sesión');
    console.log('   para que el token JWT incluya los nuevos permisos.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

addMissingPermissions();