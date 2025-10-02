const mongoose = require('mongoose');
require('dotenv').config();

async function assignAdminRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar el usuario admin
    const user = await db.collection('users').findOne({ email: 'admin@earlyadopter.com' });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('👤 Usuario:', user.email);

    // Buscar el rol admin del sistema
    const adminRole = await db.collection('roles').findOne({ name: 'admin', isSystemRole: true });

    if (!adminRole) {
      console.log('❌ Rol admin del sistema no encontrado');
      console.log('⚠️  Asegúrate de que el backend esté corriendo para que el seeding cree el rol');
      return;
    }

    console.log('📋 Rol admin encontrado:', adminRole._id);

    // Asignar el rol al usuario
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { role: adminRole._id } }
    );

    console.log('\n✅ Rol admin asignado al usuario');
    console.log('✅ Ahora puedes hacer login');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

assignAdminRole();