/**
 * Script para debuggear el vínculo entre Customer y Supplier
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function debug() {
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
    console.log('   ID:', tenant._id.toString());
    console.log('');

    // 2. Obtener el primer proveedor
    const customer = await Customer.findOne({
      tenantId: tenant._id,
      customerType: 'supplier'
    }).lean();

    console.log('📦 Customer (Proveedor):');
    console.log('   Nombre:', customer.companyName || customer.name);
    console.log('   _id:', customer._id);
    console.log('   _id type:', typeof customer._id);
    console.log('   _id toString():', customer._id.toString());
    console.log('');

    // 3. Buscar ALL suppliers para este tenant
    console.log('🔍 Todos los Suppliers para este tenant:');
    const allSuppliers = await Supplier.find({
      tenantId: String(tenant._id)
    }).lean();

    console.log(`   Total: ${allSuppliers.length}`);
    console.log('');

    // 4. Revisar el primer supplier en detalle
    if (allSuppliers.length > 0) {
      const firstSupplier = allSuppliers[0];
      console.log('📋 Primer Supplier en detalle:');
      console.log('   _id:', firstSupplier._id);
      console.log('   name:', firstSupplier.name);
      console.log('   customerId:', firstSupplier.customerId);
      console.log('   customerId type:', typeof firstSupplier.customerId);
      if (firstSupplier.customerId) {
        console.log('   customerId toString():', firstSupplier.customerId.toString());
      }
      console.log('   tenantId:', firstSupplier.tenantId);
      console.log('   tenantId type:', typeof firstSupplier.tenantId);
      console.log('');

      // 5. Comparar IDs
      console.log('🔍 Comparando customer._id con supplier.customerId:');
      console.log('   customer._id:         ', customer._id.toString());
      console.log('   supplier.customerId:  ', firstSupplier.customerId?.toString() || 'undefined');
      console.log('   ¿Son iguales?:        ', customer._id.toString() === firstSupplier.customerId?.toString());
      console.log('');

      // 6. Buscar con diferentes métodos
      console.log('🔍 Intentando buscar con diferentes métodos:');

      // Método 1: String exacto
      const test1 = await Supplier.findOne({
        customerId: customer._id.toString(),
        tenantId: String(tenant._id)
      }).lean();
      console.log('   Método 1 (String):', test1 ? '✅ Encontrado' : '❌ No encontrado');

      // Método 2: ObjectId
      const test2 = await Supplier.findOne({
        customerId: new mongoose.Types.ObjectId(customer._id),
        tenantId: String(tenant._id)
      }).lean();
      console.log('   Método 2 (ObjectId):', test2 ? '✅ Encontrado' : '❌ No encontrado');

      // Método 3: Sin conversión
      const test3 = await Supplier.findOne({
        customerId: customer._id,
        tenantId: String(tenant._id)
      }).lean();
      console.log('   Método 3 (Raw):', test3 ? '✅ Encontrado' : '❌ No encontrado');

      // Método 4: Buscar por nombre
      const test4 = await Supplier.findOne({
        name: customer.companyName || customer.name,
        tenantId: String(tenant._id)
      }).lean();
      console.log('   Método 4 (Por nombre):', test4 ? '✅ Encontrado' : '❌ No encontrado');
      if (test4) {
        console.log('      Supplier._id:', test4._id);
        console.log('      Supplier.customerId:', test4.customerId);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

debug();
