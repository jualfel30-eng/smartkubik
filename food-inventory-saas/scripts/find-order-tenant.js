const mongoose = require('mongoose');
require('dotenv').config();

async function findOrderTenant() {
  const orderNumberArg = process.argv[2];

  if (!orderNumberArg) {
    console.error('❌ ERROR: Debe proporcionar un número de orden (orderNumber).');
    console.log('📖 Uso: node scripts/find-order-tenant.js <order_number>');
    console.log('📖 Ejemplo: node scripts/find-order-tenant.js ORD-250929-151001-1892');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // 1. Buscar la orden por su número
    const order = await db.collection('orders').findOne({
      orderNumber: orderNumberArg
    });

    if (!order) {
      console.log(`❌ Orden con número "${orderNumberArg}" no encontrada.`);
      return;
    }

    console.log('📦 ORDEN ENCONTRADA:');
    console.log('='.repeat(80));
    console.log('Número:', order.orderNumber);
    console.log('ID de Orden:', order._id);
    console.log('ID de Tenant:', order.tenantId);
    console.log('ID de Cliente:', order.customerId);
    console.log('Monto Final:', order.finalPrice);

    if (!order.tenantId) {
        console.log('\n⚠️ Esta orden no tiene un tenantId asociado.');
        return;
    }

    // 2. Buscar el tenant de esta orden
    const tenant = await db.collection('tenants').findOne({ _id: order.tenantId });

    if (tenant) {
      console.log('\n🏢 TENANT ASOCIADO:');
      console.log('Nombre:', tenant.name);
      console.log('ID:', tenant._id);
    } else {
      console.log(`\n⚠️ No se encontró un tenant con el ID ${order.tenantId}`);
    }

    // 3. Contar cuántas órdenes hay en total para este tenant
    const ordersCount = await db.collection('orders').countDocuments({ tenantId: order.tenantId });
    console.log(`\n📊 Este tenant (${tenant.name}) tiene ${ordersCount} órdenes en total.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

findOrderTenant();
