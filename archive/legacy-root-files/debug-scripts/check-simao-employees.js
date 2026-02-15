// Script para verificar empleados Simao
const { MongoClient } = require('mongodb');

async function check() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB Atlas\n');

    const db = client.db('test');

    // Buscar tenant Tiendas Broas
    const tenant = await db.collection('tenants').findOne({ name: /broas/i });
    if (!tenant) {
      console.log('❌ No se encontró tenant Tiendas Broas');
      return;
    }

    console.log(`✓ Tenant: ${tenant.name} (${tenant._id})\n`);
    const tenantId = tenant._id;

    // Buscar todos los customers que contengan "Simao"
    console.log('=== BUSCANDO CUSTOMERS CON "SIMAO" ===');
    const simaoCustomers = await db.collection('customers')
      .find({
        tenantId,
        name: /simao/i
      })
      .toArray();

    console.log(`Total customers con "Simao": ${simaoCustomers.length}\n`);

    for (const customer of simaoCustomers) {
      console.log(`\n📋 Customer: ${customer.name}`);
      console.log(`   ID: ${customer._id}`);
      console.log(`   Tipo: ${customer.customerType}`);
      console.log(`   Email: ${customer.email || 'N/A'}`);
      console.log(`   Teléfono: ${customer.phone || 'N/A'}`);
      console.log(`   Creado: ${customer.createdAt}`);

      // Verificar si tiene contacts array
      if (customer.contacts && customer.contacts.length > 0) {
        console.log(`   Contactos:`);
        customer.contacts.forEach(c => {
          console.log(`     - ${c.type}: ${c.value}`);
        });
      }

      // Verificar si tiene addresses
      if (customer.addresses && customer.addresses.length > 0) {
        console.log(`   Direcciones:`);
        customer.addresses.forEach(a => {
          console.log(`     - ${a.type}: ${a.street || ''} ${a.city || ''} ${a.state || ''}`);
        });
      }

      // Buscar si tiene EmployeeProfile
      const profile = await db.collection('employeeprofiles').findOne({
        tenantId,
        customerId: customer._id
      });

      if (profile) {
        console.log(`   ✅ TIENE EmployeeProfile (${profile._id})`);
        console.log(`      Status: ${profile.status}`);
        console.log(`      Position: ${profile.position || 'N/A'}`);
        console.log(`      Department: ${profile.department || 'N/A'}`);
      } else {
        console.log(`   ❌ NO TIENE EmployeeProfile`);
      }
    }

    // Listar TODOS los customers del tenant ordenados por fecha
    console.log('\n\n=== TODOS LOS CUSTOMERS DEL TENANT (últimos 10) ===');
    const allCustomers = await db.collection('customers')
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    for (const customer of allCustomers) {
      const hasProfile = await db.collection('employeeprofiles').findOne({
        tenantId,
        customerId: customer._id
      });

      const profileStatus = hasProfile ? '✅ Con profile' : '❌ Sin profile';
      console.log(`${customer.name} (${customer.customerType}) - ${profileStatus}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

check();
