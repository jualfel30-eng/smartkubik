/**
 * Buscar específicamente Isola Foods
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function findIsola() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    // Buscar por nombre
    const byName = await Supplier.find({ name: /Isola/i }).lean();
    console.log(`Suppliers con "Isola" en el nombre: ${byName.length}\n`);

    byName.forEach(s => {
      console.log(`- ${s.name}`);
      console.log(`  ID: ${s._id}`);
      console.log(`  CustomerID: ${s.customerId}`);
      console.log(`  TenantID: ${s.tenantId}`);
      console.log(`  TenantID type: ${typeof s.tenantId}`);
      console.log('');
    });

    // El customerId que estamos buscando
    const targetCustomerId = '69b5569f25f06fd575d4105c';
    console.log(`\nBuscando supplier con customerId: ${targetCustomerId}`);

    const byCustomerId = await Supplier.findOne({ customerId: targetCustomerId }).lean();
    if (byCustomerId) {
      console.log(`✅ Encontrado: ${byCustomerId.name}`);
    } else {
      console.log('❌ No encontrado');

      // Intentar como ObjectId
      console.log('\nIntentando como ObjectId...');
      const byCustomerIdObj = await Supplier.findOne({
        customerId: new mongoose.Types.ObjectId(targetCustomerId)
      }).lean();

      if (byCustomerIdObj) {
        console.log(`✅ Encontrado: ${byCustomerIdObj.name}`);
      } else {
        console.log('❌ No encontrado tampoco');
      }
    }

    // Listar todos los suppliers del tenant
    const tenantId = new mongoose.Types.ObjectId('69b187062339e815ceba7487');
    const byTenant = await Supplier.find({ tenantId }).lean();
    console.log(`\nSuppliers en tenant 69b187062339e815ceba7487: ${byTenant.length}`);

    if (byTenant.length > 0) {
      console.log('\nListado:');
      byTenant.forEach(s => {
        console.log(`   - ${s.name} (customerID: ${s.customerId})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

findIsola();
