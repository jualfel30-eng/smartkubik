/**
 * Listar todos los suppliers del tenant
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';
const TENANT_ID = '69b187062339e815ceba7487';

async function listSuppliers() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');

    const suppliers = await Supplier.find({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID)
    }).sort({ name: 1 }).lean();

    console.log(`📊 Total de suppliers en el tenant: ${suppliers.length}\n`);
    console.log('━'.repeat(80));
    console.log('LISTADO DE SUPPLIERS:\n');

    for (const supplier of suppliers) {
      // Contar productos vinculados
      const productCount = await Product.countDocuments({
        tenantId: new mongoose.Types.ObjectId(TENANT_ID),
        'suppliers.supplierId': String(supplier._id)
      });

      console.log(`${supplier.name}`);
      console.log(`   ID: ${supplier._id}`);
      console.log(`   CustomerID: ${supplier.customerId || 'N/A'}`);
      console.log(`   Productos vinculados: ${productCount}`);
      console.log('');
    }

    console.log('━'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

listSuppliers();
