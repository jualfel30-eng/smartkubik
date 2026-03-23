/**
 * Verificar el tipo de dato de tenantId en customers
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function verify() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    const tenantId = '68d55e4b764d359fed186e47'; // Tiendas Broas
    const customerId = '68efecbe4a214ead0bc41cea'; // Aceite AL REEF

    console.log('🔍 Buscando Customer...\n');

    // Intentar buscar con diferentes tipos
    console.log('Test 1: Buscar con ObjectId');
    const test1 = await Customer.findOne({
      _id: customerId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      customerType: 'supplier'
    }).lean();
    console.log('   Resultado:', test1 ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');

    console.log('\nTest 2: Buscar con String');
    const test2 = await Customer.findOne({
      _id: customerId,
      tenantId: tenantId,
      customerType: 'supplier'
    }).lean();
    console.log('   Resultado:', test2 ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');

    console.log('\nTest 3: Buscar sin filtro de tenantId');
    const test3 = await Customer.findOne({
      _id: customerId,
      customerType: 'supplier'
    }).lean();
    if (test3) {
      console.log('   ✅ ENCONTRADO');
      console.log('   tenantId:', test3.tenantId);
      console.log('   tenantId type:', typeof test3.tenantId);
      console.log('   tenantId toString():', test3.tenantId?.toString());
    } else {
      console.log('   ❌ NO ENCONTRADO');
    }

    console.log('\n' + '='.repeat(70));
    console.log('Ahora verificando Supplier vinculado...\n');

    console.log('Test 4: Buscar Supplier con String(tenantId)');
    const test4 = await Supplier.findOne({
      customerId: customerId,
      tenantId: String(tenantId)
    }).lean();
    if (test4) {
      console.log('   ✅ ENCONTRADO');
      console.log('   _id:', test4._id);
      console.log('   customerId:', test4.customerId);
      console.log('   tenantId:', test4.tenantId);
      console.log('   tenantId type:', typeof test4.tenantId);
      console.log('   paymentSettings:', JSON.stringify(test4.paymentSettings, null, 2));
    } else {
      console.log('   ❌ NO ENCONTRADO');
    }

    console.log('\n' + '='.repeat(70));
    console.log('CONCLUSIÓN:\n');

    if (test1) {
      console.log('✅ Customer.tenantId es ObjectId - backend usa new Types.ObjectId(tenantId) ✅');
    } else if (test2) {
      console.log('⚠️  Customer.tenantId es String - backend debería usar String(tenantId)');
    }

    if (test4) {
      console.log('✅ Supplier.tenantId es String - backend usa String(tenantId) ✅');
      console.log('✅ Supplier vinculado EXISTE con paymentSettings');
    } else {
      console.log('❌ NO se encontró Supplier vinculado');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

verify();
