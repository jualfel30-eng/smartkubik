/**
 * Encontrar usuarios disponibles para testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function findTestUsers() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');

    console.log('🔍 Buscando usuarios disponibles...\n');

    const users = await User.find({}).select('email name tenantId role').lean();

    console.log(`📊 Total de usuarios: ${users.length}\n`);

    for (const user of users) {
      const tenant = await Tenant.findOne({ _id: user.tenantId }).lean();

      console.log(`📧 ${user.email}`);
      console.log(`   Nombre: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role || 'N/A'}`);
      console.log(`   Tenant: ${tenant?.name || 'N/A'} (${user.tenantId})`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

findTestUsers();
