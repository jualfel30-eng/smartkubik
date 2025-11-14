/**
 * Script para agregar permisos faltantes y actualizar roles
 * Ejecutar con: node add-missing-permissions.js
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/food-inventory-dev';

const newPermissions = [
  {
    name: 'products_write',
    description: 'Crear y modificar configuraciones de productos',
    category: 'products',
  },
  {
    name: 'inventory_write',
    description: 'Registrar movimientos y consumos de inventario',
    category: 'inventory',
  },
];

async function run() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db();
    const permissionsCollection = db.collection('permissions');
    const rolesCollection = db.collection('roles');

    // 1. Agregar nuevos permisos
    console.log('\n📝 Agregando permisos faltantes...');
    const insertedPermissionIds = [];

    for (const permission of newPermissions) {
      const existing = await permissionsCollection.findOne({ name: permission.name });

      if (existing) {
        console.log(`   ⏭️  Permiso "${permission.name}" ya existe`);
        insertedPermissionIds.push(existing._id);
      } else {
        const result = await permissionsCollection.insertOne({
          ...permission,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`   ✅ Permiso "${permission.name}" creado`);
        insertedPermissionIds.push(result.insertedId);
      }
    }

    // 2. Actualizar rol Admin (agregar TODOS los permisos)
    console.log('\n👑 Actualizando rol Admin...');
    const allPermissions = await permissionsCollection.find({}).toArray();
    const allPermissionIds = allPermissions.map(p => p._id);

    const adminUpdateResult = await rolesCollection.updateOne(
      { name: 'admin', isSystemRole: true },
      {
        $set: {
          permissions: allPermissionIds,
          updatedAt: new Date(),
        }
      }
    );
    console.log(`   ✅ Admin actualizado (${adminUpdateResult.modifiedCount} roles modificados)`);

    // 3. Actualizar rol Manager (agregar nuevos permisos)
    console.log('\n👔 Actualizando rol Manager...');
    const managerRole = await rolesCollection.findOne({ name: 'manager', isSystemRole: true });

    if (managerRole) {
      const managerUpdateResult = await rolesCollection.updateOne(
        { name: 'manager', isSystemRole: true },
        {
          $addToSet: {
            permissions: { $each: insertedPermissionIds }
          },
          $set: {
            updatedAt: new Date(),
          }
        }
      );
      console.log(`   ✅ Manager actualizado (${managerUpdateResult.modifiedCount} roles modificados)`);
    } else {
      console.log('   ⚠️  Rol Manager no encontrado');
    }

    console.log('\n✨ ¡Migración completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   - Permisos agregados: ${newPermissions.length}`);
    console.log(`   - Total de permisos en sistema: ${allPermissionIds.length}`);
    console.log('\n🔄 Por favor reinicia el backend para que los cambios surtan efecto');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

run();
