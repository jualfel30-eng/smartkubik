const mongoose = require('mongoose');
require('dotenv').config();

// Importar el servicio directamente
const { CustomersService } = require('../dist/modules/customers/customers.service');
const { getModelToken } = require('@nestjs/mongoose');

async function testEndpoint() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Obtener los modelos
    const customerModel = mongoose.model('Customer');
    const orderModel = mongoose.model('Order');

    // Crear una instancia del servicio
    const customersService = new CustomersService(customerModel, orderModel);

    // Obtener un tenant de prueba
    const sampleCustomer = await customerModel.findOne({ customerType: 'individual' });
    if (!sampleCustomer) {
      console.log('❌ No hay clientes en la BD');
      return;
    }

    const tenantId = sampleCustomer.tenantId;
    console.log('🔍 Testing con tenantId:', tenantId);

    // Simular la llamada que hace el frontend
    const query = {
      page: 1,
      limit: 100,
      sortBy: 'metrics.totalSpent',
      sortOrder: 'desc'
    };

    console.log('📡 Llamando a findAll con query:', query);
    console.log('='.repeat(80));

    const result = await customersService.findAll(query, tenantId);

    console.log('\n📊 RESULTADOS:');
    console.log('   Total clientes:', result.customers.length);
    console.log('   Total en BD:', result.total);
    console.log('\n📋 Detalle de clientes:');
    console.log('='.repeat(80));

    result.customers.forEach((customer, idx) => {
      console.log(`\n${idx + 1}. ${customer.name}`);
      console.log(`   Customer Type: ${customer.customerType}`);
      console.log(`   Metrics: ${JSON.stringify(customer.metrics)}`);
      console.log(`   Total Spent: $${customer.metrics?.totalSpent || 0}`);
      console.log(`   Total Orders: ${customer.metrics?.totalOrders || 0}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ El servicio devuelve los datos correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

testEndpoint();