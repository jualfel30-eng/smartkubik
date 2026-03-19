/**
 * Script para probar el endpoint /suppliers/:id con un proveedor real
 * de Tiendas Broas
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function testEndpoint() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    // 1. Obtener el tenant
    const tenant = await Tenant.findOne({ name: /Tiendas Broas/i }).lean();
    console.log('📍 Tenant:', tenant.name);
    console.log('   ID:', tenant._id);
    console.log('');

    // 2. Obtener un proveedor de ejemplo
    const customer = await Customer.findOne({
      tenantId: tenant._id,
      customerType: 'supplier'
    }).lean();

    console.log('📦 Proveedor (Customer):');
    console.log('   Nombre:', customer.companyName || customer.name);
    console.log('   ID:', customer._id);
    console.log('');

    // 3. Simular lo que hace el endpoint: buscar el Supplier vinculado
    console.log('🔍 Buscando registro Supplier vinculado...');
    const linkedSupplier = await Supplier.findOne({
      customerId: customer._id,
      tenantId: String(tenant._id)
    }).lean();

    if (linkedSupplier) {
      console.log('✅ Encontrado registro Supplier vinculado:');
      console.log('   Supplier ID:', linkedSupplier._id);
      console.log('   customerId:', linkedSupplier.customerId);
      console.log('   Nombre:', linkedSupplier.name);
      console.log('');

      console.log('💳 paymentSettings:');
      console.log(JSON.stringify(linkedSupplier.paymentSettings, null, 2));
      console.log('');

      // 4. Simular el objeto que retorna el backend
      const responseObject = {
        _id: customer._id,
        isVirtual: true,
        customerId: customer._id,
        name: customer.companyName || customer.name,
        supplierNumber: 'CRM-' + customer.customerNumber,
        status: customer.status,
        taxInfo: {
          rif: customer.taxInfo?.taxId || '',
          businessName: customer.taxInfo?.taxName || ''
        },
        paymentSettings: linkedSupplier?.paymentSettings || {}
      };

      console.log('📤 Objeto que debería retornar el backend:');
      console.log(JSON.stringify(responseObject, null, 2));
    } else {
      console.log('❌ NO se encontró registro Supplier vinculado');
      console.log('   Esto significa que la migración no creó el registro para este proveedor');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

testEndpoint();
