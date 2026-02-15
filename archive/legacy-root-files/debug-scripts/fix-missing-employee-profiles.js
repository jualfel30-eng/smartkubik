// Script para crear EmployeeProfiles faltantes
const { MongoClient, ObjectId } = require('mongodb');

async function fix() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB Atlas\n');

    const db = client.db('test');

    // 1. Buscar tenant Tiendas Broas
    const tenant = await db.collection('tenants').findOne({ name: /broas/i });
    if (!tenant) {
      console.log('❌ No se encontró tenant Tiendas Broas');
      return;
    }

    console.log(`✓ Tenant: ${tenant.name} (${tenant._id})\n`);
    const tenantId = tenant._id;

    // 2. Buscar customers tipo employee sin EmployeeProfile
    const employeeCustomers = await db.collection('customers')
      .find({ tenantId, customerType: 'employee' })
      .toArray();

    console.log(`Encontrados ${employeeCustomers.length} customers tipo employee\n`);

    // 3. Verificar cuáles tienen profile
    const employeeProfiles = await db.collection('employeeprofiles')
      .find({ tenantId })
      .toArray();

    const profileCustomerIds = new Set(employeeProfiles.map(ep => ep.customerId.toString()));

    // 4. Crear profiles faltantes
    const customersWithoutProfile = employeeCustomers.filter(c =>
      !profileCustomerIds.has(c._id.toString())
    );

    console.log(`${customersWithoutProfile.length} customers SIN EmployeeProfile:\n`);

    for (const customer of customersWithoutProfile) {
      console.log(`\n📝 Creando EmployeeProfile para: ${customer.name} (${customer._id})`);

      const newProfile = {
        tenantId: tenantId,
        customerId: customer._id,
        status: 'active',
        hireDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('employeeprofiles').insertOne(newProfile);

      if (result.acknowledged) {
        console.log(`   ✓ EmployeeProfile creado con ID: ${result.insertedId}`);
      } else {
        console.log(`   ❌ Error al crear EmployeeProfile`);
      }
    }

    console.log('\n=== VERIFICACIÓN FINAL ===');
    const finalProfiles = await db.collection('employeeprofiles')
      .find({ tenantId })
      .toArray();

    console.log(`Total EmployeeProfiles en ${tenant.name}: ${finalProfiles.length}`);
    finalProfiles.forEach(ep => {
      const customer = employeeCustomers.find(c => c._id.toString() === ep.customerId.toString());
      console.log(`  - ${customer?.name || 'Unknown'} (Profile ID: ${ep._id}, Status: ${ep.status})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fix();
