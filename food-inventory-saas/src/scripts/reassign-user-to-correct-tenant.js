/**
 * Reasignar broas.admon@gmail.com al tenant correcto
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function reassignUser() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    const userEmail = 'broas.admon@gmail.com';
    const wrongTenantId = '69b481c03d5ba33267c3ada0'; // Tenant vacío
    const correctTenantId = '69b187062339e815ceba7487'; // Tiendas Broas, C.A. con 37 proveedores

    console.log('🔍 Buscando usuario...\n');

    const user = await User.findOne({ email: userEmail });

    if (!user) {
      console.log('❌ Usuario NO encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log(`   _id: ${user._id}`);
    console.log(`   email: ${user.email}`);
    console.log(`   tenantId actual: ${user.tenantId}`);
    console.log('');

    if (user.tenantId.toString() === correctTenantId) {
      console.log('✅ El usuario YA está asignado al tenant correcto. No se necesita cambio.\n');
      return;
    }

    console.log('🔄 Reasignando usuario al tenant correcto...\n');

    const result = await User.updateOne(
      { _id: user._id },
      { $set: { tenantId: new mongoose.Types.ObjectId(correctTenantId) } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Usuario reasignado exitosamente!');
      console.log(`   Tenant anterior: ${wrongTenantId}`);
      console.log(`   Tenant nuevo: ${correctTenantId}`);
      console.log('');
      console.log('🎯 Ahora broas.admon@gmail.com tiene acceso a "Tiendas Broas, C.A." con 37 proveedores\n');
    } else {
      console.log('⚠️  No se realizaron cambios\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

reassignUser();
