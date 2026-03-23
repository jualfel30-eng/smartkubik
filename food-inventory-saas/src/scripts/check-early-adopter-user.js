/**
 * Verificar usuario de Early Adopter
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function checkUser() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');

    console.log('🔍 Buscando usuario admin@earlyadopter.com...\n');

    const user = await User.findOne({ email: 'admin@earlyadopter.com' }).lean();

    if (!user) {
      console.log('❌ Usuario NO encontrado con ese email exacto');
      console.log('\n🔍 Buscando emails similares...\n');

      const similarUsers = await User.find({ email: /early/i }).lean();
      console.log(`Encontrados ${similarUsers.length} usuarios con "early" en el email:\n`);
      similarUsers.forEach(u => {
        console.log(`   - ${u.email}`);
      });
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log(`   _id: ${user._id}`);
    console.log(`   email: ${user.email}`);
    console.log(`   name: ${user.name || 'N/A'}`);
    console.log(`   role: ${user.role || 'N/A'}`);
    console.log(`   tenantId: ${user.tenantId}`);
    console.log(`   tiene password: ${user.password ? 'Sí' : 'No'}`);
    console.log('');

    const tenant = await Tenant.findOne({ _id: user.tenantId }).lean();

    if (tenant) {
      console.log('🏢 Tenant:');
      console.log(`   name: ${tenant.name}`);
      console.log(`   status: ${tenant.status}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

checkUser();
