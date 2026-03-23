/**
 * INGENIERÍA INVERSA: Analizar estructura de Distribuidora Borush
 * Para entender por qué SÍ muestra productos y los demás NO
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';
const TENANT_ID = '69b187062339e815ceba7487';

async function analyze() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');

    // ==================== PARTE 1: BUSCAR DISTRIBUIDORA BORUSH ====================
    console.log('━'.repeat(80));
    console.log('🔍 PARTE 1: BUSCAR DISTRIBUIDORA BORUSH');
    console.log('━'.repeat(80) + '\n');

    const borush = await Supplier.findOne({
      name: /Borush/i,
      tenantId: new mongoose.Types.ObjectId(TENANT_ID)
    }).lean();

    if (!borush) {
      console.log('❌ Distribuidora Borush no encontrada');
      return;
    }

    console.log('✅ Supplier encontrado:');
    console.log(`   Nombre: ${borush.name}`);
    console.log(`   _id: ${borush._id}`);
    console.log(`   customerId: ${borush.customerId}`);
    console.log(`   tenantId: ${borush.tenantId}\n`);

    // Si tiene customerId, buscar el Customer también
    if (borush.customerId) {
      const customer = await Customer.findById(borush.customerId).lean();
      if (customer) {
        console.log('📋 Customer vinculado:');
        console.log(`   Nombre: ${customer.name || customer.companyName}`);
        console.log(`   _id: ${customer._id}`);
        console.log(`   customerType: ${customer.customerType}\n`);
      }
    }

    // ==================== PARTE 2: BUSCAR PRODUCTOS VINCULADOS ====================
    console.log('━'.repeat(80));
    console.log('🔍 PARTE 2: BUSCAR PRODUCTOS QUE TENGAN A BORUSH EN suppliers[]');
    console.log('━'.repeat(80) + '\n');

    // Buscar por Supplier._id
    const productsBySupplier = await Product.find({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      'suppliers.supplierId': String(borush._id)
    }).lean();

    console.log(`📊 Productos con supplierId = "${borush._id}" (Supplier ID):`);
    console.log(`   Total: ${productsBySupplier.length}\n`);

    if (productsBySupplier.length > 0) {
      console.log('   Productos encontrados:');
      productsBySupplier.forEach((p, idx) => {
        const supplierLink = p.suppliers.find(s => String(s.supplierId) === String(borush._id));
        console.log(`   ${idx + 1}. ${p.name} (${p.sku})`);
        console.log(`      supplierId: ${supplierLink.supplierId}`);
        console.log(`      costPrice: $${supplierLink.costPrice}`);
        console.log(`      currency: ${supplierLink.paymentCurrency}`);
        console.log('');
      });
    }

    // Buscar por Customer ID (si existe)
    if (borush.customerId) {
      const productsByCustomer = await Product.find({
        tenantId: new mongoose.Types.ObjectId(TENANT_ID),
        'suppliers.supplierId': String(borush.customerId)
      }).lean();

      console.log(`📊 Productos con supplierId = "${borush.customerId}" (Customer ID):`);
      console.log(`   Total: ${productsByCustomer.length}\n`);

      if (productsByCustomer.length > 0) {
        console.log('   Productos encontrados:');
        productsByCustomer.forEach((p, idx) => {
          const supplierLink = p.suppliers.find(s => String(s.supplierId) === String(borush.customerId));
          console.log(`   ${idx + 1}. ${p.name} (${p.sku})`);
          console.log(`      supplierId: ${supplierLink.supplierId}`);
          console.log(`      costPrice: $${supplierLink.costPrice}`);
          console.log(`      currency: ${supplierLink.paymentCurrency}`);
          console.log('');
        });
      }
    }

    // ==================== PARTE 3: COMPARAR CON 3P INVERSIONES ====================
    console.log('━'.repeat(80));
    console.log('🔍 PARTE 3: COMPARAR CON 3P INVERSIONES (que NO muestra productos)');
    console.log('━'.repeat(80) + '\n');

    const tresp = await Supplier.findOne({
      name: /3P Inversiones/i,
      tenantId: new mongoose.Types.ObjectId(TENANT_ID)
    }).lean();

    if (tresp) {
      console.log('✅ 3P Inversiones encontrado:');
      console.log(`   Nombre: ${tresp.name}`);
      console.log(`   _id: ${tresp._id}`);
      console.log(`   customerId: ${tresp.customerId}\n`);

      const productsByTresp = await Product.find({
        tenantId: new mongoose.Types.ObjectId(TENANT_ID),
        'suppliers.supplierId': String(tresp._id)
      }).lean();

      console.log(`📊 Productos con supplierId = "${tresp._id}" (Supplier ID):`);
      console.log(`   Total: ${productsByTresp.length}\n`);

      if (productsByTresp.length > 0) {
        productsByTresp.forEach((p, idx) => {
          const supplierLink = p.suppliers.find(s => String(s.supplierId) === String(tresp._id));
          console.log(`   ${idx + 1}. ${p.name} (${p.sku})`);
          console.log(`      supplierId: ${supplierLink.supplierId}`);
          console.log(`      costPrice: $${supplierLink.costPrice}`);
          console.log('');
        });
      }
    }

    // ==================== PARTE 4: ESTRUCTURA JSON COMPLETA ====================
    console.log('━'.repeat(80));
    console.log('🔍 PARTE 4: ESTRUCTURA JSON COMPLETA DE UN PRODUCTO DE BORUSH');
    console.log('━'.repeat(80) + '\n');

    if (productsBySupplier.length > 0) {
      const sample = productsBySupplier[0];
      console.log('Producto completo (JSON):');
      console.log(JSON.stringify({
        _id: sample._id,
        name: sample.name,
        sku: sample.sku,
        tenantId: sample.tenantId,
        suppliers: sample.suppliers
      }, null, 2));
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

analyze();
