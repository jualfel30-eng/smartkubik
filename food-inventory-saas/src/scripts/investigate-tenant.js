/**
 * Script para investigar por qué no cargan las condiciones de pago
 * para el tenant "Tiendas Broas, C.A."
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function investigate() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    // 1. Buscar el tenant 'Tiendas Broas, C.A.'
    console.log('🔍 Buscando tenant "Tiendas Broas, C.A."...');
    const tenant = await Tenant.findOne({ name: /Tiendas Broas/i }).lean();

    if (!tenant) {
      console.log('❌ No se encontró el tenant');
      process.exit(1);
    }

    console.log('✅ Tenant encontrado:');
    console.log('   ID:', tenant._id);
    console.log('   Nombre:', tenant.name);
    console.log('');

    // 2. Buscar proveedores (Virtual Suppliers) de este tenant
    console.log('🔍 Buscando proveedores en customers (Virtual Suppliers)...');
    const virtualSuppliers = await Customer.find({
      tenantId: tenant._id,
      customerType: 'supplier'
    }).select('_id name companyName').lean();

    console.log(`📦 Encontrados ${virtualSuppliers.length} proveedores en customers\n`);

    if (virtualSuppliers.length > 0) {
      console.log('Primeros 5 proveedores:');
      virtualSuppliers.slice(0, 5).forEach((vs, i) => {
        console.log(`  ${i+1}. ${vs.companyName || vs.name} (ID: ${vs._id})`);
      });
      console.log('');
    }

    // 3. Buscar registros en suppliers para estos proveedores
    console.log('🔍 Verificando registros en suppliers...');
    const suppliers = await Supplier.find({
      tenantId: tenant._id
    }).select('_id customerId name paymentSettings').lean();

    console.log(`📊 Encontrados ${suppliers.length} registros en suppliers\n`);

    if (suppliers.length > 0) {
      console.log('Primeros 5 registros en suppliers:');
      suppliers.slice(0, 5).forEach((s, i) => {
        console.log(`  ${i+1}. ${s.name}`);
        console.log(`     - ID: ${s._id}`);
        console.log(`     - customerId: ${s.customerId}`);
        console.log(`     - paymentSettings: ${s.paymentSettings ? 'SÍ' : 'NO'}`);
        if (s.paymentSettings) {
          console.log(`       * acceptedPaymentMethods: ${s.paymentSettings.acceptedPaymentMethods?.join(', ') || 'ninguno'}`);
          console.log(`       * acceptsCredit: ${s.paymentSettings.acceptsCredit}`);
        }
      });
      console.log('');
    }

    // 4. Verificar cuántos Virtual Suppliers NO tienen registro en suppliers
    const missingSuppliers = [];
    for (const vs of virtualSuppliers) {
      const hasSupplierRecord = suppliers.some(s => s.customerId?.toString() === vs._id.toString());
      if (!hasSupplierRecord) {
        missingSuppliers.push(vs);
      }
    }

    console.log('='.repeat(70));
    console.log('📊 RESUMEN PARA TENANT "Tiendas Broas, C.A."');
    console.log('='.repeat(70));
    console.log(`Total proveedores (customers):        ${virtualSuppliers.length}`);
    console.log(`Total registros en suppliers:         ${suppliers.length}`);
    console.log(`Proveedores SIN registro en suppliers: ${missingSuppliers.length}`);
    console.log('='.repeat(70));

    if (missingSuppliers.length > 0) {
      console.log('\n⚠️  Los siguientes proveedores NO tienen registro en suppliers:');
      missingSuppliers.forEach((vs, i) => {
        console.log(`  ${i+1}. ${vs.companyName || vs.name} (ID: ${vs._id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

investigate();
