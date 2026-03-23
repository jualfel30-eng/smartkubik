/**
 * Encontrar el tenantId correcto del usuario broas.admon@gmail.com
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function findTenant() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');

    console.log('🔍 Buscando usuario broas.admon@gmail.com...\n');

    const user = await User.findOne({ email: 'broas.admon@gmail.com' }).lean();

    if (!user) {
      console.log('❌ Usuario NO encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log('   _id:', user._id);
    console.log('   email:', user.email);
    console.log('   name:', user.name);
    console.log('   tenantId:', user.tenantId);
    console.log('   tenantId type:', typeof user.tenantId);

    console.log('\n🔍 Buscando tenant vinculado...\n');

    const tenant = await Tenant.findOne({ _id: user.tenantId }).lean();

    if (!tenant) {
      console.log('❌ Tenant NO encontrado');
      return;
    }

    console.log('✅ Tenant encontrado:');
    console.log('   _id:', tenant._id);
    console.log('   name:', tenant.name);
    console.log('   companyName:', tenant.companyName);
    console.log('   status:', tenant.status);
    console.log('   createdAt:', tenant.createdAt);

    console.log('\n' + '═'.repeat(80));
    console.log('📋 TENANT ID CORRECTO:\n');
    console.log(`   ${tenant._id}\n`);
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

findTenant();
