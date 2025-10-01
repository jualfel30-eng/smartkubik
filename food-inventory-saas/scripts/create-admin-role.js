const mongoose = require('mongoose');
require('dotenv').config();

async function createAdminRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar el usuario
    const user = await db.collection('users').findOne({
      email: 'admin@earlyadopter.com'
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('👤 Usuario encontrado:', user.email);
    console.log('🏢 TenantId:', user.tenantId);

    // Buscar todos los permisos disponibles
    const permissions = await db.collection('permissions').find({}).toArray();
    const allPermissionIds = permissions.map(p => p._id);

    console.log(`\n📋 Permisos disponibles: ${allPermissionIds.length}`);

    // Crear el rol de admin con todos los permisos
    const adminRole = {
      _id: new mongoose.Types.ObjectId(),
      name: 'admin',
      displayName: 'Administrador',
      description: 'Rol de administrador con acceso completo',
      permissions: allPermissionIds,
      tenantId: user.tenantId,
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('\n📝 Creando rol de admin...');
    await db.collection('roles').insertOne(adminRole);
    console.log('✅ Rol creado:', adminRole._id);

    // Actualizar el usuario con el nuevo roleId
    console.log('\n🔄 Actualizando usuario con el nuevo rol...');
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { role: adminRole._id } }
    );

    console.log('✅ Usuario actualizado');
    console.log('\n📊 RESUMEN:');
    console.log('='.repeat(80));
    console.log(`Usuario: ${user.email}`);
    console.log(`Rol anterior: ${user.role}`);
    console.log(`Rol nuevo: ${adminRole._id}`);
    console.log(`Nombre del rol: ${adminRole.name}`);
    console.log(`Permisos: ${adminRole.permissions.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

createAdminRole();