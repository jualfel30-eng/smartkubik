const mongoose = require('mongoose');
require('dotenv').config();

async function findOrderTenant() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar la orden que mencionaste
    const order = await db.collection('orders').findOne({
      orderNumber: 'ORD-250929-151001-1892'
    });

    if (!order) {
      console.log('❌ Orden ORD-250929-151001-1892 no encontrada');
      return;
    }

    console.log('📦 ORDEN ENCONTRADA:');
    console.log('='.repeat(80));
    console.log('Número:', order.orderNumber);
    console.log('TenantId:', order.tenantId);
    console.log('CustomerId:', order.customerId);
    console.log('Monto:', order.finalPrice);

    // Buscar el tenant de esta orden
    const tenant = await db.collection('tenants').findOne({ _id: order.tenantId });

    if (tenant) {
      console.log('\n🏢 TENANT DE ESTA ORDEN:');
      console.log('Código:', tenant.code);
      console.log('Nombre:', tenant.name);
      console.log('ID:', tenant._id);
    }

    // Buscar el tenant EARLYADOPTER
    const earlyadopterTenant = await db.collection('tenants').findOne({ code: 'EARLYADOPTER' });

    if (earlyadopterTenant) {
      console.log('\n🔍 TENANT EARLYADOPTER:');
      console.log('ID:', earlyadopterTenant._id);
      console.log('\n❓SON IGUALES?', order.tenantId.toString() === earlyadopterTenant._id.toString() ? '✅ SÍ' : '❌ NO');
    }

    // Contar cuántas órdenes hay por tenant
    const ordersCount = await db.collection('orders').countDocuments({ tenantId: order.tenantId });
    console.log(`\n📊 Este tenant tiene ${ordersCount} órdenes en total`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

findOrderTenant();