const mongoose = require('mongoose');
require('dotenv').config();

async function resetPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Borrar todos los permisos
    const permissionsResult = await db.collection('permissions').deleteMany({});
    console.log(`🗑️  Eliminados ${permissionsResult.deletedCount} permisos`);

    // Borrar solo roles del sistema (isSystemRole: true)
    const rolesResult = await db.collection('roles').deleteMany({ isSystemRole: true });
    console.log(`🗑️  Eliminados ${rolesResult.deletedCount} roles del sistema`);

    console.log('\n✅ Permisos y roles del sistema eliminados.');
    console.log('⚠️  Al reiniciar el backend, el seeding los recreará automáticamente con los nuevos permisos.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

resetPermissions();