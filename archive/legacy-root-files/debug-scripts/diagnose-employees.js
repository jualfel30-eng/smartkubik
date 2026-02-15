// Script de diagnóstico para empleados
const { MongoClient } = require('mongodb');

async function diagnose() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB Atlas\n');

    const db = client.db('test');

    // 1. Buscar tenant "Tiendas Broas" o similar
    console.log('=== BUSCANDO TENANT ===');
    const tenants = await db.collection('tenants').find({}).project({ _id: 1, name: 1 }).toArray();
    console.log(`Total tenants: ${tenants.length}`);
    tenants.forEach(t => console.log(`  - ${t.name} (${t._id})`));

    const broas = await db.collection('tenants').findOne({ name: /broas/i });
    if (!broas) {
      console.log('\n⚠️  No se encontró tenant "Tiendas Broas"');
      console.log('Tenants disponibles:', tenants.map(t => t.name).join(', '));
      return;
    }

    console.log(`\n✓ Tenant encontrado: ${broas.name} (${broas._id})\n`);
    const tenantId = broas._id;

    // 2. Buscar customers tipo employee de ese tenant
    console.log('=== CUSTOMERS TIPO EMPLOYEE ===');
    const employeeCustomers = await db.collection('customers')
      .find({ tenantId, customerType: 'employee' })
      .project({ _id: 1, name: 1, customerType: 1, createdAt: 1 })
      .toArray();

    console.log(`Total customers tipo employee: ${employeeCustomers.length}`);
    employeeCustomers.forEach(c => {
      console.log(`  - ${c.name} (${c._id}) - Creado: ${c.createdAt}`);
    });

    if (employeeCustomers.length === 0) {
      console.log('\n⚠️  No hay customers con customerType="employee"');
    }

    // 3. Buscar EmployeeProfiles
    console.log('\n=== EMPLOYEE PROFILES ===');
    const employeeProfiles = await db.collection('employeeprofiles')
      .find({ tenantId })
      .project({ _id: 1, customerId: 1, status: 1, position: 1, department: 1, createdAt: 1 })
      .toArray();

    console.log(`Total EmployeeProfiles: ${employeeProfiles.length}`);
    employeeProfiles.forEach(ep => {
      console.log(`  - Profile ${ep._id}`);
      console.log(`    Customer: ${ep.customerId}`);
      console.log(`    Status: ${ep.status}`);
      console.log(`    Position: ${ep.position || 'N/A'}`);
      console.log(`    Department: ${ep.department || 'N/A'}`);
      console.log(`    Creado: ${ep.createdAt}`);
    });

    if (employeeProfiles.length === 0) {
      console.log('\n⚠️  No hay EmployeeProfiles en la base de datos');
    }

    // 4. Verificar correspondencia
    console.log('\n=== VERIFICACIÓN DE CORRESPONDENCIA ===');
    const customerIds = new Set(employeeCustomers.map(c => c._id.toString()));
    const profileCustomerIds = new Set(employeeProfiles.map(ep => ep.customerId.toString()));

    console.log(`Customers tipo employee: ${customerIds.size}`);
    console.log(`EmployeeProfiles: ${profileCustomerIds.size}`);

    // Customers SIN profile
    const customersWithoutProfile = employeeCustomers.filter(c =>
      !profileCustomerIds.has(c._id.toString())
    );

    if (customersWithoutProfile.length > 0) {
      console.log(`\n⚠️  ${customersWithoutProfile.length} customers SIN EmployeeProfile:`);
      customersWithoutProfile.forEach(c => {
        console.log(`  - ${c.name} (${c._id})`);
      });
    }

    // Profiles SIN customer válido
    const profilesWithoutCustomer = employeeProfiles.filter(ep =>
      !customerIds.has(ep.customerId.toString())
    );

    if (profilesWithoutCustomer.length > 0) {
      console.log(`\n⚠️  ${profilesWithoutCustomer.length} EmployeeProfiles sin customer válido:`);
      profilesWithoutCustomer.forEach(ep => {
        console.log(`  - Profile ${ep._id} apunta a customer ${ep.customerId}`);
      });
    }

    // 5. Todos los customers (para ver si existen pero con otro tipo)
    console.log('\n=== TODOS LOS CUSTOMERS DEL TENANT ===');
    const allCustomers = await db.collection('customers')
      .find({ tenantId })
      .project({ _id: 1, name: 1, customerType: 1 })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    console.log(`Total customers en el tenant: ${allCustomers.length} (mostrando últimos 20)`);
    allCustomers.forEach(c => {
      console.log(`  - ${c.name} (tipo: ${c.customerType})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

diagnose();
