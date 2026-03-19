/**
 * Script para verificar un supplier específico por su ID
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function verify() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    // ID del primer supplier que apareció en investigate-tenant
    const supplierId = '69bc293427860a03a6916853';
    const customerId = '68efecbe4a214ead0bc41cea';

    console.log('🔍 Buscando Supplier por _id:', supplierId);
    const supplier = await Supplier.findById(supplierId).lean();

    if (supplier) {
      console.log('✅ Encontrado:');
      console.log('   _id:', supplier._id);
      console.log('   name:', supplier.name);
      console.log('   customerId:', supplier.customerId);
      console.log('   tenantId:', supplier.tenantId);
      console.log('   paymentSettings:', supplier.paymentSettings);
      console.log('');

      console.log('🔍 Verificando si customerId coincide:');
      console.log('   Esperado:', customerId);
      console.log('   Real:', supplier.customerId?.toString());
      console.log('   ¿Coincide?:', supplier.customerId?.toString() === customerId);
    } else {
      console.log('❌ No encontrado');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

verify();
