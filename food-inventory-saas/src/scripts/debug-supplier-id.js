/**
 * Verificar tipo de dato del supplierId en purchase orders
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function debugSupplierId() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({}, { strict: false }), 'purchaseorders');
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');

    // Buscar una orden conocida
    const order = await PurchaseOrder.findOne({ poNumber: 'OC-260314-123751-368785' }).lean();

    if (order) {
      console.log('✅ Orden encontrada: OC-260314-123751-368785\n');
      console.log(`Proveedor: ${order.supplierName}`);
      console.log(`SupplierId: ${order.supplierId}`);
      console.log(`Tipo: ${typeof order.supplierId}`);
      console.log(`Es ObjectId: ${order.supplierId instanceof mongoose.Types.ObjectId}`);
      console.log(`Constructor: ${order.supplierId.constructor.name}\n`);

      // Buscar el proveedor directamente
      console.log('🔍 Buscando proveedor...\n');

      // 1. Buscar en Suppliers por _id
      const supplier1 = await Supplier.findOne({ _id: order.supplierId }).lean();
      console.log(`1. Supplier con _id = ${order.supplierId}:`);
      if (supplier1) {
        console.log(`   ✅ Encontrado: ${supplier1.name} (ID: ${supplier1._id})`);
      } else {
        console.log(`   ❌ No encontrado`);
      }

      // 2. Buscar en Suppliers por customerId
      const supplier2 = await Supplier.findOne({ customerId: order.supplierId }).lean();
      console.log(`\n2. Supplier con customerId = ${order.supplierId}:`);
      if (supplier2) {
        console.log(`   ✅ Encontrado: ${supplier2.name} (ID: ${supplier2._id})`);
        console.log(`   CustomerId: ${supplier2.customerId}`);
      } else {
        console.log(`   ❌ No encontrado`);
      }

      // 3. Buscar en Customers
      const customer = await Customer.findOne({ _id: order.supplierId }).lean();
      console.log(`\n3. Customer con _id = ${order.supplierId}:`);
      if (customer) {
        console.log(`   ✅ Encontrado: ${customer.name} (${customer.customerType})`);
        console.log(`   ID: ${customer._id}`);
      } else {
        console.log(`   ❌ No encontrado`);
      }

      // 4. Buscar Supplier vinculado a ese Customer
      if (customer) {
        const linkedSupplier = await Supplier.findOne({ customerId: customer._id }).lean();
        console.log(`\n4. Supplier vinculado al Customer ${customer._id}:`);
        if (linkedSupplier) {
          console.log(`   ✅ Encontrado: ${linkedSupplier.name}`);
          console.log(`   ID: ${linkedSupplier._id}`);
          console.log(`   TenantId: ${linkedSupplier.tenantId}`);
        } else {
          console.log(`   ❌ No encontrado`);
        }
      }

      // 5. Listar todos los suppliers del tenant
      const tenantId = order.tenantId;
      const allSuppliers = await Supplier.find({ tenantId }).lean();
      console.log(`\n5. Total de Suppliers en el tenant: ${allSuppliers.length}`);

      if (allSuppliers.length > 0 && allSuppliers.length < 30) {
        console.log('\nProveedores:');
        allSuppliers.forEach(s => {
          console.log(`   - ${s.name} (ID: ${s._id}, CustomerID: ${s.customerId})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

debugSupplierId();
