/**
 * Script para verificar que la corrección funcionó
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function verify() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    // 1. Obtener el tenant
    const tenant = await Tenant.findOne({ name: /Tiendas Broas/i }).lean();
    const tenantId = tenant._id.toString();

    console.log('📍 Tenant:', tenant.name);
    console.log('   ID (string):', tenantId);
    console.log('');

    // 2. Obtener un customer (Virtual Supplier)
    const customer = await Customer.findOne({
      tenantId: tenant._id,
      customerType: 'supplier'
    }).lean();

    const customerId = customer._id.toString();
    console.log('📦 Customer:', customer.companyName || customer.name);
    console.log('   ID (string):', customerId);
    console.log('');

    // 3. Simular lo que hace el backend findOne:
    // Primero intenta buscar Supplier por _id
    console.log('🔍 Paso 1: Buscar Supplier por _id:', customerId);
    let supplier = await Supplier.findOne({
      _id: customerId,
      tenantId: String(tenantId)  // Como lo hace el backend
    }).exec();

    if (supplier) {
      console.log('   ✅ Encontrado como Supplier directo');
    } else {
      console.log('   ⏭️  No encontrado, buscando como Virtual Supplier...');

      // Segundo intento: buscar Customer y luego linked Supplier
      console.log('');
      console.log('🔍 Paso 2: Buscar linked Supplier por customerId:', customerId);
      const linkedSupplier = await Supplier.findOne({
        customerId: customer._id,
        tenantId: String(tenantId)  // Como lo hace el backend
      }).exec();

      if (linkedSupplier) {
        console.log('   ✅ Encontrado linked Supplier!');
        console.log('');
        console.log('📋 Datos del Supplier:');
        console.log('   _id:', linkedSupplier._id.toString());
        console.log('   name:', linkedSupplier.name);
        console.log('   supplierNumber:', linkedSupplier.supplierNumber);
        console.log('   customerId:', linkedSupplier.customerId?.toString());
        console.log('   tenantId:', linkedSupplier.tenantId);
        console.log('   tenantId type:', typeof linkedSupplier.tenantId);
        console.log('');
        console.log('💳 paymentSettings:');
        console.log(JSON.stringify(linkedSupplier.paymentSettings, null, 2));
        console.log('');
        console.log('✅ ¡El backend AHORA SÍ puede encontrar este proveedor!');
      } else {
        console.log('   ❌ NO encontrado - algo sigue mal');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

verify();
