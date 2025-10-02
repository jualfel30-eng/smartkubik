const mongoose = require('mongoose');
require('dotenv').config();

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // 1. Obtener un cliente de ejemplo
    console.log('📊 PASO 1: Obtener un cliente de ejemplo');
    console.log('='.repeat(80));
    const customers = await db.collection('customers').find({ customerType: { $in: ['business', 'individual'] } }).limit(3).toArray();

    if (customers.length === 0) {
      console.log('❌ No se encontraron clientes en la base de datos');
      process.exit(0);
    }

    for (const customer of customers) {
      console.log(`\n🔍 Cliente: ${customer.name}`);
      console.log(`   ID: ${customer._id}`);
      console.log(`   TenantID: ${customer.tenantId}`);
      console.log(`   CustomerType: ${customer.customerType}`);
      console.log(`   Metrics en BD: ${JSON.stringify(customer.metrics, null, 2)}`);

      // 2. Buscar órdenes de ese cliente
      console.log(`\n📦 PASO 2: Buscar órdenes del cliente ${customer.name}`);
      console.log('-'.repeat(80));

      // Intento 1: Buscar por customerId como ObjectId
      const ordersObjectId = await db.collection('orders').find({
        customerId: customer._id,
        tenantId: customer.tenantId
      }).toArray();
      console.log(`   Órdenes encontradas (customerId como ObjectId + tenantId): ${ordersObjectId.length}`);

      // Intento 2: Buscar por customerId como String
      const ordersString = await db.collection('orders').find({
        customerId: customer._id.toString(),
        tenantId: customer.tenantId
      }).toArray();
      console.log(`   Órdenes encontradas (customerId como String + tenantId): ${ordersString.length}`);

      // Intento 3: Solo por customerId (sin tenantId)
      const ordersNoTenant = await db.collection('orders').find({
        customerId: customer._id
      }).toArray();
      console.log(`   Órdenes encontradas (customerId sin tenantId): ${ordersNoTenant.length}`);

      // Intento 4: Buscar órdenes con paymentStatus paid/partial
      const ordersPaid = await db.collection('orders').find({
        customerId: customer._id,
        tenantId: customer.tenantId,
        paymentStatus: { $in: ['paid', 'partial'] }
      }).toArray();
      console.log(`   Órdenes pagadas (paid/partial + tenantId): ${ordersPaid.length}`);

      // 3. Mostrar detalles de las órdenes encontradas
      const allOrders = ordersObjectId.length > 0 ? ordersObjectId : ordersString.length > 0 ? ordersString : ordersNoTenant;

      if (allOrders.length > 0) {
        console.log(`\n📋 PASO 3: Detalles de las órdenes encontradas`);
        console.log('-'.repeat(80));
        allOrders.forEach((order, idx) => {
          console.log(`\n   Orden ${idx + 1}:`);
          console.log(`      OrderNumber: ${order.orderNumber}`);
          console.log(`      CustomerId: ${order.customerId} (type: ${typeof order.customerId})`);
          console.log(`      TenantId: ${order.tenantId} (type: ${typeof order.tenantId})`);
          console.log(`      Status: ${order.status}`);
          console.log(`      PaymentStatus: ${order.paymentStatus}`);
          console.log(`      TotalAmount: $${order.totalAmount}`);
          console.log(`      CreatedAt: ${order.createdAt}`);
        });

        // 4. Calcular el total manualmente
        console.log(`\n💰 PASO 4: Cálculo manual del totalSpent`);
        console.log('-'.repeat(80));
        const totalSpent = ordersPaid.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        console.log(`   Total calculado (solo paid/partial): $${totalSpent}`);
        console.log(`   Total en BD del cliente: $${customer.metrics?.totalSpent || 0}`);
        console.log(`   ¿Coinciden? ${totalSpent === (customer.metrics?.totalSpent || 0) ? '✅ SÍ' : '❌ NO'}`);
      } else {
        console.log(`\n❌ No se encontraron órdenes para este cliente`);
      }

      // 5. Verificar tipos de datos
      console.log(`\n🔬 PASO 5: Verificación de tipos de datos`);
      console.log('-'.repeat(80));
      const sampleOrder = await db.collection('orders').findOne({ customerId: customer._id });
      if (sampleOrder) {
        console.log(`   Customer._id es: ${customer._id.constructor.name}`);
        console.log(`   Order.customerId es: ${sampleOrder.customerId?.constructor?.name || typeof sampleOrder.customerId}`);
        console.log(`   Customer.tenantId es: ${typeof customer.tenantId}`);
        console.log(`   Order.tenantId es: ${typeof sampleOrder.tenantId}`);
        console.log(`   ¿Los tipos coinciden?`);
        console.log(`      customerId: ${customer._id.constructor.name === sampleOrder.customerId?.constructor?.name ? '✅' : '❌'}`);
        console.log(`      tenantId: ${typeof customer.tenantId === typeof sampleOrder.tenantId ? '✅' : '❌'}`);
      }

      console.log('\n' + '='.repeat(80) + '\n');
    }

    // 6. Resumen general
    console.log('\n📊 RESUMEN GENERAL');
    console.log('='.repeat(80));
    const totalCustomers = await db.collection('customers').countDocuments({ customerType: { $in: ['business', 'individual'] } });
    const totalOrders = await db.collection('orders').countDocuments();
    const totalPaidOrders = await db.collection('orders').countDocuments({ paymentStatus: { $in: ['paid', 'partial'] } });

    console.log(`Total de clientes (business/individual): ${totalCustomers}`);
    console.log(`Total de órdenes en sistema: ${totalOrders}`);
    console.log(`Total de órdenes pagadas: ${totalPaidOrders}`);

    // Verificar si hay inconsistencias de tenant
    console.log(`\n🔍 Verificando integridad de tenantId...`);
    const ordersWithoutTenant = await db.collection('orders').countDocuments({ tenantId: { $exists: false } });
    const customersWithoutTenant = await db.collection('customers').countDocuments({ tenantId: { $exists: false } });
    console.log(`Órdenes sin tenantId: ${ordersWithoutTenant} ${ordersWithoutTenant > 0 ? '❌' : '✅'}`);
    console.log(`Clientes sin tenantId: ${customersWithoutTenant} ${customersWithoutTenant > 0 ? '❌' : '✅'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

diagnose();