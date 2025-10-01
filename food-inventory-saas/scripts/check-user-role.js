const mongoose = require('mongoose');
require('dotenv').config();

async function checkUserRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar el usuario específico
    const user = await db.collection('users').findOne({
      email: 'admin@earlyadopter.com'
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('👤 USUARIO:');
    console.log('='.repeat(80));
    console.log(`Email: ${user.email}`);
    console.log(`Nombre: ${user.firstName} ${user.lastName}`);
    console.log(`TenantId: ${user.tenantId}`);
    console.log(`Role (ID): ${user.role}`);
    console.log(`Role (type): ${typeof user.role}`);
    console.log(`isActive: ${user.isActive}`);

    // Intentar buscar el rol
    console.log('\n🔍 BUSCANDO ROL:');
    console.log('='.repeat(80));

    let role;
    if (typeof user.role === 'string') {
      role = await db.collection('roles').findOne({
        _id: new mongoose.Types.ObjectId(user.role)
      });
    } else if (user.role && user.role._bsontype === 'ObjectId') {
      role = await db.collection('roles').findOne({
        _id: user.role
      });
    } else {
      console.log('❌ user.role no es un ObjectId válido');
    }

    if (role) {
      console.log('✅ Rol encontrado:');
      console.log(`   ID: ${role._id}`);
      console.log(`   Name: ${role.name}`);
      console.log(`   TenantId: ${role.tenantId}`);
      console.log(`   Permissions: ${role.permissions?.length || 0} permisos`);
    } else {
      console.log('❌ Rol NO encontrado en la base de datos');
      console.log('   Esto significa que el roleId del usuario apunta a un rol que no existe');
    }

    // Listar todos los roles del tenant
    console.log('\n📋 ROLES DISPONIBLES EN EL TENANT:');
    console.log('='.repeat(80));
    const rolesInTenant = await db.collection('roles').find({
      tenantId: user.tenantId
    }).toArray();

    if (rolesInTenant.length === 0) {
      console.log('❌ No hay roles en este tenant');
    } else {
      rolesInTenant.forEach((r, idx) => {
        console.log(`${idx + 1}. ${r.name} (${r._id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

checkUserRole();