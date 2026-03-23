/**
 * Debug: ¿Por qué no se encuentra el linkedSupplier?
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function debug() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    const customerId = '68efecbe4a214ead0bc41cea'; // Aceite AL REEF customer ID
    const tenantId = '68d55e4b764d359fed186e47'; // Tiendas Broas

    console.log('🔍 Buscando Supplier vinculado...\n');
    console.log('Parámetros de búsqueda:');
    console.log('  customerId:', customerId);
    console.log('  customerId type:', typeof customerId);
    console.log('  tenantId:', tenantId);
    console.log('  tenantId type:', typeof tenantId);
    console.log('');

    // Test 1: Buscar exactamente como lo hace el backend
    console.log('Test 1: Buscar como backend (String(tenantId))');
    const test1 = await Supplier.findOne({
      customerId: customerId,
      tenantId: String(tenantId)
    }).lean();
    console.log('   Resultado:', test1 ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    if (test1) {
      console.log('   Supplier:', test1);
    }

    // Test 2: Buscar con ObjectId para customerId
    console.log('\nTest 2: Buscar con ObjectId(customerId)');
    const test2 = await Supplier.findOne({
      customerId: new mongoose.Types.ObjectId(customerId),
      tenantId: String(tenantId)
    }).lean();
    console.log('   Resultado:', test2 ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    if (test2) {
      console.log('   Supplier._id:', test2._id);
      console.log('   Supplier.customerId:', test2.customerId);
      console.log('   Supplier.customerId type:', typeof test2.customerId);
      console.log('   Supplier.tenantId:', test2.tenantId);
      console.log('   Supplier.tenantId type:', typeof test2.tenantId);
      console.log('   Supplier.paymentSettings:', test2.paymentSettings);
    }

    // Test 3: Buscar solo por customerId
    console.log('\nTest 3: Buscar SOLO por customerId (sin filtro tenant)');
    const test3 = await Supplier.findOne({
      customerId: new mongoose.Types.ObjectId(customerId)
    }).lean();
    console.log('   Resultado:', test3 ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    if (test3) {
      console.log('   Supplier._id:', test3._id);
      console.log('   Supplier.customerId:', test3.customerId);
      console.log('   Supplier.tenantId:', test3.tenantId);
      console.log('   Supplier.tenantId type:', typeof test3.tenantId);
    }

    // Test 4: Listar TODOS los suppliers para este tenant
    console.log('\nTest 4: Listar TODOS los suppliers de este tenant');
    const allSuppliers = await Supplier.find({
      tenantId: String(tenantId)
    }).select('_id customerId name tenantId').lean();
    console.log(`   Total: ${allSuppliers.length} suppliers`);
    allSuppliers.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.name}`);
      console.log(`      _id: ${s._id}`);
      console.log(`      customerId: ${s.customerId} (type: ${typeof s.customerId})`);
      console.log(`      tenantId: ${s.tenantId} (type: ${typeof s.tenantId})`);
      console.log(`      ¿Es el que buscamos?: ${s.customerId?.toString() === customerId ? '✅ SÍ' : 'no'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

debug();
