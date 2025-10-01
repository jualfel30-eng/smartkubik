const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar todos los usuarios
    const users = await db.collection('users').find({}).toArray();
    console.log(`📊 Total usuarios en base de datos: ${users.length}\n`);

    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }

    console.log('👥 USUARIOS ENCONTRADOS:');
    console.log('='.repeat(80));

    users.forEach((user, idx) => {
      console.log(`\n${idx + 1}. Email: ${user.email}`);
      console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
      console.log(`   TenantId: ${user.tenantId}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status || 'N/A'}`);
    });

    // Buscar tenants
    console.log('\n\n🏢 TENANTS ENCONTRADOS:');
    console.log('='.repeat(80));
    const tenants = await db.collection('tenants').find({}).toArray();

    tenants.forEach((tenant, idx) => {
      console.log(`\n${idx + 1}. Code: ${tenant.code}`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   ID: ${tenant._id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

checkUsers();