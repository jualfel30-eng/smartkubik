/**
 * Buscar en qué tenant está Distribuidora Borush
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function findBorush() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    // Buscar user broas.admon@gmail.com
    console.log('━'.repeat(80));
    console.log('👤 BUSCAR USUARIO broas.admon@gmail.com');
    console.log('━'.repeat(80) + '\n');

    const user = await User.findOne({ email: 'broas.admon@gmail.com' }).lean();

    if (user) {
      console.log(`✅ Usuario encontrado:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Tenant ID: ${user.tenantId}`);
      console.log(`   Name: ${user.name}\n`);
    }

    // Buscar "Borush" en TODOS los tenants
    console.log('━'.repeat(80));
    console.log('🔍 BUSCAR "BORUSH" EN TODOS LOS TENANTS');
    console.log('━'.repeat(80) + '\n');

    const borushCustomers = await Customer.find({
      $or: [
        { name: /Borush/i },
        { companyName: /Borush/i }
      ]
    }).lean();

    console.log(`Customers con "Borush": ${borushCustomers.length}\n`);

    for (const customer of borushCustomers) {
      console.log(`${customer.name || customer.companyName}`);
      console.log(`   ID: ${customer._id}`);
      console.log(`   Tenant ID: ${customer.tenantId}`);
      console.log(`   Customer Type: ${customer.customerType}`);

      // Contar productos vinculados
      const productsByCustomerId = await Product.countDocuments({
        'suppliers.supplierId': String(customer._id)
      });

      console.log(`   Productos vinculados (por Customer ID): ${productsByCustomerId}`);

      // Buscar si tiene Supplier vinculado
      const linkedSupplier = await Supplier.findOne({
        customerId: customer._id
      }).lean();

      if (linkedSupplier) {
        console.log(`   ✅ Tiene Supplier vinculado: ${linkedSupplier._id}`);

        const productsBySupplierId = await Product.countDocuments({
          'suppliers.supplierId': String(linkedSupplier._id)
        });

        console.log(`   Productos vinculados (por Supplier ID): ${productsBySupplierId}`);

        // Si tiene productos, mostrar uno de ejemplo
        if (productsByCustomerId > 0) {
          const sampleProduct = await Product.findOne({
            'suppliers.supplierId': String(customer._id)
          }).lean();

          const supplierLink = sampleProduct.suppliers.find(s => String(s.supplierId) === String(customer._id));

          console.log(`\n   📦 Ejemplo de producto vinculado:`);
          console.log(`      Producto: ${sampleProduct.name} (${sampleProduct.sku})`);
          console.log(`      Tenant ID del producto: ${sampleProduct.tenantId}`);
          console.log(`      Estructura del supplier:`);
          console.log(JSON.stringify(supplierLink, null, 10));
        }
      } else {
        console.log(`   ❌ No tiene Supplier vinculado`);
      }

      console.log('');
    }

    // También buscar en Suppliers directamente
    const borushSuppliers = await Supplier.find({
      name: /Borush/i
    }).lean();

    console.log(`Suppliers con "Borush": ${borushSuppliers.length}\n`);

    for (const supplier of borushSuppliers) {
      console.log(`${supplier.name}`);
      console.log(`   ID: ${supplier._id}`);
      console.log(`   Tenant ID: ${supplier.tenantId}`);
      console.log(`   Customer ID: ${supplier.customerId}`);

      const productsBySupplierId = await Product.countDocuments({
        'suppliers.supplierId': String(supplier._id)
      });

      console.log(`   Productos vinculados: ${productsBySupplierId}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

findBorush();
