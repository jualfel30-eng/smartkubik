const mongoose = require('mongoose');
require('dotenv').config();

async function findCorrectTenant() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar TODOS los tenants EARLYADOPTER
    const tenants = await db.collection('tenants').find({ code: 'EARLYADOPTER' }).toArray();

    console.log(`🔍 Encontrados ${tenants.length} tenant(s) con código EARLYADOPTER:\n`);

    for (const tenant of tenants) {
      console.log('='.repeat(80));
      console.log(`🏢 Tenant: ${tenant.name}`);
      console.log(`🆔 ID: ${tenant._id}`);
      console.log(`📅 Creado: ${tenant.createdAt}`);

      // Buscar usuarios en este tenant
      const users = await db.collection('users').find({ tenantId: tenant._id }).toArray();
      console.log(`👥 Usuarios: ${users.length}`);
      users.forEach(u => console.log(`   - ${u.email}`));

      // Buscar órdenes en este tenant
      const ordersCount = await db.collection('orders').countDocuments({ tenantId: tenant._id });
      console.log(`📦 Órdenes: ${ordersCount}`);

      // Buscar clientes en este tenant
      const customersCount = await db.collection('customers').countDocuments({ tenantId: tenant._id });
      console.log(`👤 Clientes: ${customersCount}`);

      // Buscar productos en este tenant
      const productsCount = await db.collection('products').countDocuments({ tenantId: tenant._id });
      console.log(`🛍️  Productos: ${productsCount}`);

      console.log('');
    }

    // Buscar el usuario admin@earlyadopter.com
    const adminUser = await db.collection('users').findOne({ email: 'admin@earlyadopter.com' });

    if (adminUser) {
      console.log('='.repeat(80));
      console.log('👑 USUARIO ADMIN ENCONTRADO:');
      console.log(`📧 Email: ${adminUser.email}`);
      console.log(`🆔 TenantId: ${adminUser.tenantId}`);
      console.log(`\n✅ El tenant CORRECTO a limpiar es el que tiene ID: ${adminUser.tenantId}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

findCorrectTenant();