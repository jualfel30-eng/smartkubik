require('dotenv').config();
const mongoose = require('mongoose');

async function listTenants() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    const Tenant = mongoose.connection.collection('tenants');
    const tenants = await Tenant.find({}).toArray();

    console.log(`\n📋 Total de tenants: ${tenants.length}\n`);

    for (const tenant of tenants) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Nombre:', tenant.name);
      console.log('ID:', tenant._id);
      console.log('Code:', tenant.code);
      console.log('Vertical:', tenant.vertical);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

listTenants();
