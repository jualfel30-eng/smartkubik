/**
 * Entender cómo funciona el sistema de proveedores
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';
const TENANT_ID = '69b187062339e815ceba7487';

async function understand() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');
    const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({}, { strict: false }), 'purchaseorders');

    console.log('━'.repeat(80));
    console.log('📊 RESUMEN DE COLECCIONES');
    console.log('━'.repeat(80) + '\n');

    // Contar documentos en cada colección
    const supplierCount = await Supplier.countDocuments({ tenantId: new mongoose.Types.ObjectId(TENANT_ID) });
    const customerCount = await Customer.countDocuments({ tenantId: new mongoose.Types.ObjectId(TENANT_ID) });
    const productCount = await Product.countDocuments({ tenantId: new mongoose.Types.ObjectId(TENANT_ID) });
    const poCount = await PurchaseOrder.countDocuments({ tenantId: new mongoose.Types.ObjectId(TENANT_ID) });

    console.log(`Suppliers: ${supplierCount}`);
    console.log(`Customers: ${customerCount}`);
    console.log(`Products: ${productCount}`);
    console.log(`Purchase Orders: ${poCount}\n`);

    // Buscar customers que sean proveedores
    console.log('━'.repeat(80));
    console.log('👥 CUSTOMERS QUE SON PROVEEDORES');
    console.log('━'.repeat(80) + '\n');

    const supplierCustomers = await Customer.find({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      customerType: 'supplier'
    }).sort({ name: 1, companyName: 1 }).lean();

    console.log(`Total de customers con customerType='supplier': ${supplierCustomers.length}\n`);

    for (const customer of supplierCustomers.slice(0, 5)) {
      console.log(`${customer.name || customer.companyName}`);
      console.log(`   ID: ${customer._id}`);
      console.log(`   customerType: ${customer.customerType}`);

      // Buscar productos vinculados con este Customer ID
      const productsByCustomerId = await Product.countDocuments({
        tenantId: new mongoose.Types.ObjectId(TENANT_ID),
        'suppliers.supplierId': String(customer._id)
      });

      console.log(`   Productos vinculados (por Customer ID): ${productsByCustomerId}`);

      // Buscar si existe un Supplier vinculado
      const linkedSupplier = await Supplier.findOne({
        customerId: customer._id
      }).lean();

      if (linkedSupplier) {
        console.log(`   ✅ Tiene Supplier vinculado: ${linkedSupplier._id}`);

        // Buscar productos vinculados con el Supplier ID
        const productsBySupplierId = await Product.countDocuments({
          tenantId: new mongoose.Types.ObjectId(TENANT_ID),
          'suppliers.supplierId': String(linkedSupplier._id)
        });

        console.log(`   Productos vinculados (por Supplier ID): ${productsBySupplierId}`);
      } else {
        console.log(`   ❌ No tiene Supplier vinculado`);
      }

      console.log('');
    }

    // Buscar específicamente "Borush" en customers
    console.log('━'.repeat(80));
    console.log('🔍 BUSCANDO "BORUSH" EN CUSTOMERS');
    console.log('━'.repeat(80) + '\n');

    const borushCustomers = await Customer.find({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      $or: [
        { name: /Borush/i },
        { companyName: /Borush/i }
      ]
    }).lean();

    console.log(`Customers con "Borush": ${borushCustomers.length}\n`);

    for (const customer of borushCustomers) {
      console.log(`${customer.name || customer.companyName}`);
      console.log(`   ID: ${customer._id}`);
      console.log(`   customerType: ${customer.customerType}`);

      const productsByCustomerId = await Product.countDocuments({
        tenantId: new mongoose.Types.ObjectId(TENANT_ID),
        'suppliers.supplierId': String(customer._id)
      });

      console.log(`   Productos vinculados: ${productsByCustomerId}`);

      // Ver uno de los productos para entender la estructura
      if (productsByCustomerId > 0) {
        const sampleProduct = await Product.findOne({
          tenantId: new mongoose.Types.ObjectId(TENANT_ID),
          'suppliers.supplierId': String(customer._id)
        }).lean();

        const supplierLink = sampleProduct.suppliers.find(s => String(s.supplierId) === String(customer._id));

        console.log(`\n   📦 Ejemplo de producto: ${sampleProduct.name}`);
        console.log(`      Estructura del supplier en Product.suppliers[]:`);
        console.log(JSON.stringify(supplierLink, null, 8));
      }

      console.log('');
    }

    // Ver estructura de un Purchase Order
    console.log('━'.repeat(80));
    console.log('📋 ESTRUCTURA DE PURCHASE ORDER');
    console.log('━'.repeat(80) + '\n');

    const samplePO = await PurchaseOrder.findOne({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      status: 'received'
    }).lean();

    if (samplePO) {
      console.log(`PO Number: ${samplePO.poNumber || samplePO._id}`);
      console.log(`Supplier Name: ${samplePO.supplierName}`);
      console.log(`Supplier ID: ${samplePO.supplierId}`);
      console.log(`Supplier ID type: ${typeof samplePO.supplierId}`);
      console.log(`Status: ${samplePO.status}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

understand();
