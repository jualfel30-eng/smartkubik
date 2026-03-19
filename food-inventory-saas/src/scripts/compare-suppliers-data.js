/**
 * Script para comparar proveedores de Tiendas Broas vs Early Adopter
 * Identificar diferencias en cómo se guardan los datos
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function compare() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    // 1. Obtener ambos tenants
    const broas = await Tenant.findOne({ name: /Tiendas Broas/i }).lean();
    const earlyAdopter = await Tenant.findOne({ name: /Early Adopter/i }).lean();

    console.log('📍 Tenant 1: Tiendas Broas');
    console.log('   ID:', broas._id.toString());
    console.log('');
    console.log('📍 Tenant 2: Early Adopter INC');
    console.log('   ID:', earlyAdopter._id.toString());
    console.log('');

    // 2. Comparar un proveedor de cada tenant
    console.log('=' .repeat(70));
    console.log('COMPARACIÓN: TIENDAS BROAS (no funciona)');
    console.log('=' .repeat(70));

    const broasCustomer = await Customer.findOne({
      tenantId: broas._id,
      customerType: 'supplier'
    }).lean();

    if (broasCustomer) {
      console.log('\n📦 Customer (Virtual Supplier):');
      console.log('   _id:', broasCustomer._id.toString());
      console.log('   name:', broasCustomer.name);
      console.log('   companyName:', broasCustomer.companyName);
      console.log('   customerType:', broasCustomer.customerType);
      console.log('   customerNumber:', broasCustomer.customerNumber);
      console.log('   tenantId:', broasCustomer.tenantId);
      console.log('   tenantId type:', typeof broasCustomer.tenantId);
      console.log('');
      console.log('   taxInfo:');
      console.log('      taxId:', broasCustomer.taxInfo?.taxId);
      console.log('      taxType:', broasCustomer.taxInfo?.taxType);
      console.log('      taxName:', broasCustomer.taxInfo?.taxName);
      console.log('');
      console.log('   contacts:', JSON.stringify(broasCustomer.contacts, null, 2));
      console.log('');

      // Buscar Supplier vinculado
      const broasSupplier = await Supplier.findOne({
        customerId: broasCustomer._id,
        tenantId: String(broas._id)
      }).lean();

      if (broasSupplier) {
        console.log('📋 Supplier Record:');
        console.log('   _id:', broasSupplier._id.toString());
        console.log('   customerId:', broasSupplier.customerId?.toString());
        console.log('   supplierNumber:', broasSupplier.supplierNumber);
        console.log('   name:', broasSupplier.name);
        console.log('   tenantId:', broasSupplier.tenantId);
        console.log('   tenantId type:', typeof broasSupplier.tenantId);
        console.log('');
        console.log('   taxInfo:', JSON.stringify(broasSupplier.taxInfo, null, 2));
        console.log('');
        console.log('   contacts:', JSON.stringify(broasSupplier.contacts, null, 2));
        console.log('');
        console.log('   paymentSettings:', JSON.stringify(broasSupplier.paymentSettings, null, 2));
      } else {
        console.log('❌ NO tiene Supplier record vinculado');
      }
    }

    console.log('\n' + '=' .repeat(70));
    console.log('COMPARACIÓN: EARLY ADOPTER INC (SÍ funciona)');
    console.log('=' .repeat(70));

    const earlyCustomer = await Customer.findOne({
      tenantId: earlyAdopter._id,
      customerType: 'supplier'
    }).lean();

    if (earlyCustomer) {
      console.log('\n📦 Customer (Virtual Supplier):');
      console.log('   _id:', earlyCustomer._id.toString());
      console.log('   name:', earlyCustomer.name);
      console.log('   companyName:', earlyCustomer.companyName);
      console.log('   customerType:', earlyCustomer.customerType);
      console.log('   customerNumber:', earlyCustomer.customerNumber);
      console.log('   tenantId:', earlyCustomer.tenantId);
      console.log('   tenantId type:', typeof earlyCustomer.tenantId);
      console.log('');
      console.log('   taxInfo:');
      console.log('      taxId:', earlyCustomer.taxInfo?.taxId);
      console.log('      taxType:', earlyCustomer.taxInfo?.taxType);
      console.log('      taxName:', earlyCustomer.taxInfo?.taxName);
      console.log('');
      console.log('   contacts:', JSON.stringify(earlyCustomer.contacts, null, 2));
      console.log('');

      // Buscar Supplier vinculado
      const earlySupplier = await Supplier.findOne({
        customerId: earlyCustomer._id,
        tenantId: String(earlyAdopter._id)
      }).lean();

      if (earlySupplier) {
        console.log('📋 Supplier Record:');
        console.log('   _id:', earlySupplier._id.toString());
        console.log('   customerId:', earlySupplier.customerId?.toString());
        console.log('   supplierNumber:', earlySupplier.supplierNumber);
        console.log('   name:', earlySupplier.name);
        console.log('   tenantId:', earlySupplier.tenantId);
        console.log('   tenantId type:', typeof earlySupplier.tenantId);
        console.log('');
        console.log('   taxInfo:', JSON.stringify(earlySupplier.taxInfo, null, 2));
        console.log('');
        console.log('   contacts:', JSON.stringify(earlySupplier.contacts, null, 2));
        console.log('');
        console.log('   paymentSettings:', JSON.stringify(earlySupplier.paymentSettings, null, 2));
      } else {
        console.log('❌ NO tiene Supplier record vinculado');
      }
    }

    console.log('\n' + '=' .repeat(70));
    console.log('RESUMEN DE DIFERENCIAS');
    console.log('=' .repeat(70));

    // Comparar todos los suppliers de cada tenant
    const broasSuppliers = await Supplier.find({ tenantId: String(broas._id) }).lean();
    const earlySuppliers = await Supplier.find({ tenantId: String(earlyAdopter._id) }).lean();

    console.log('\nTiendas Broas:');
    console.log('  Total Suppliers:', broasSuppliers.length);
    console.log('  Con paymentSettings:', broasSuppliers.filter(s => s.paymentSettings && Object.keys(s.paymentSettings).length > 0).length);
    console.log('  Sin paymentSettings:', broasSuppliers.filter(s => !s.paymentSettings || Object.keys(s.paymentSettings).length === 0).length);

    console.log('\nEarly Adopter INC:');
    console.log('  Total Suppliers:', earlySuppliers.length);
    console.log('  Con paymentSettings:', earlySuppliers.filter(s => s.paymentSettings && Object.keys(s.paymentSettings).length > 0).length);
    console.log('  Sin paymentSettings:', earlySuppliers.filter(s => !s.paymentSettings || Object.keys(s.paymentSettings).length === 0).length);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

compare();
