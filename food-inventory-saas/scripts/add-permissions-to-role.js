const mongoose = require('mongoose');
require('dotenv').config();

async function addPermissionsToRole() {
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

    console.log('👤 Usuario:', user.email);
    console.log('🆔 Role ID:', user.role);

    // Buscar el rol
    const role = await db.collection('roles').findOne({ _id: user.role });

    if (!role) {
      console.log('❌ Rol no encontrado');
      return;
    }

    console.log('📋 Rol actual:', role.name);
    console.log('🔐 Permisos actuales:', role.permissions?.length || 0);

    // Buscar todos los permisos
    const allPermissions = await db.collection('permissions').find({}).toArray();
    console.log(`\n🔍 Permisos disponibles en el sistema: ${allPermissions.length}`);

    if (allPermissions.length === 0) {
      console.log('\n⚠️  No hay permisos en la base de datos.');
      console.log('   El sistema necesita permisos creados primero.');
      console.log('   Creando permisos básicos...\n');

      // Crear permisos básicos necesarios
      const basicPermissions = [
        { name: 'dashboard_read', description: 'Ver dashboard', category: 'dashboard' },
        { name: 'customers_read', description: 'Ver clientes', category: 'customers' },
        { name: 'customers_create', description: 'Crear clientes', category: 'customers' },
        { name: 'customers_update', description: 'Actualizar clientes', category: 'customers' },
        { name: 'customers_delete', description: 'Eliminar clientes', category: 'customers' },
        { name: 'orders_read', description: 'Ver órdenes', category: 'orders' },
        { name: 'orders_create', description: 'Crear órdenes', category: 'orders' },
        { name: 'orders_update', description: 'Actualizar órdenes', category: 'orders' },
        { name: 'orders_delete', description: 'Eliminar órdenes', category: 'orders' },
        { name: 'products_read', description: 'Ver productos', category: 'products' },
        { name: 'products_create', description: 'Crear productos', category: 'products' },
        { name: 'products_update', description: 'Actualizar productos', category: 'products' },
        { name: 'products_delete', description: 'Eliminar productos', category: 'products' },
        { name: 'inventory_read', description: 'Ver inventario', category: 'inventory' },
        { name: 'inventory_update', description: 'Actualizar inventario', category: 'inventory' },
        { name: 'users_read', description: 'Ver usuarios', category: 'users' },
        { name: 'users_create', description: 'Crear usuarios', category: 'users' },
        { name: 'users_update', description: 'Actualizar usuarios', category: 'users' },
        { name: 'users_delete', description: 'Eliminar usuarios', category: 'users' },
        { name: 'roles_read', description: 'Ver roles', category: 'roles' },
        { name: 'roles_create', description: 'Crear roles', category: 'roles' },
        { name: 'roles_update', description: 'Actualizar roles', category: 'roles' },
        { name: 'roles_delete', description: 'Eliminar roles', category: 'roles' },
        { name: 'reports_read', description: 'Ver reportes', category: 'reports' },
        { name: 'settings_read', description: 'Ver configuración', category: 'settings' },
        { name: 'settings_update', description: 'Actualizar configuración', category: 'settings' },
      ];

      const permissionsToInsert = basicPermissions.map(p => ({
        ...p,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await db.collection('permissions').insertMany(permissionsToInsert);
      console.log(`✅ Creados ${permissionsToInsert.length} permisos`);

      allPermissions.push(...permissionsToInsert);
    }

    // Asignar todos los permisos al rol de admin
    const permissionIds = allPermissions.map(p => p._id);

    console.log(`\n🔄 Actualizando rol con ${permissionIds.length} permisos...`);
    await db.collection('roles').updateOne(
      { _id: role._id },
      {
        $set: {
          permissions: permissionIds,
          updatedAt: new Date()
        }
      }
    );

    console.log('✅ Rol actualizado con todos los permisos');

    console.log('\n📊 RESUMEN:');
    console.log('='.repeat(80));
    console.log(`Usuario: ${user.email}`);
    console.log(`Rol: ${role.name}`);
    console.log(`Permisos asignados: ${permissionIds.length}`);
    console.log('\n⚠️  IMPORTANTE: Necesitas hacer logout y volver a iniciar sesión');
    console.log('   para que el nuevo token JWT incluya los permisos actualizados.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

addPermissionsToRole();