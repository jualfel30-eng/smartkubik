// Script para sincronizar TODOS los employees de TODOS los tenants
const { MongoClient } = require('mongodb');

async function syncAllEmployees() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB Atlas\n');

    const db = client.db('test');

    // Obtener todos los tenants
    const tenants = await db.collection('tenants').find({}).toArray();
    console.log(`Total tenants a procesar: ${tenants.length}\n`);

    let totalCustomersProcessed = 0;
    let totalProfilesCreated = 0;

    for (const tenant of tenants) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Procesando tenant: ${tenant.name}`);
      console.log(`${'='.repeat(60)}`);

      const tenantId = tenant._id;

      // 1. Buscar todos los customers tipo employee de este tenant
      const employeeCustomers = await db.collection('customers')
        .find({ tenantId, customerType: 'employee' })
        .toArray();

      if (employeeCustomers.length === 0) {
        console.log(`   ⏭️  Sin employees en este tenant`);
        continue;
      }

      console.log(`   Encontrados ${employeeCustomers.length} customers tipo employee`);

      // 2. Buscar EmployeeProfiles existentes
      const existingProfiles = await db.collection('employeeprofiles')
        .find({ tenantId })
        .toArray();

      const profileCustomerIds = new Set(
        existingProfiles.map(ep => ep.customerId.toString())
      );

      // 3. Identificar customers sin profile
      const customersWithoutProfile = employeeCustomers.filter(c =>
        !profileCustomerIds.has(c._id.toString())
      );

      if (customersWithoutProfile.length === 0) {
        console.log(`   ✅ Todos los employees tienen EmployeeProfile`);
        continue;
      }

      console.log(`   ⚠️  ${customersWithoutProfile.length} employees SIN EmployeeProfile:\n`);

      // 4. Generar employeeNumber único para evitar duplicate key error
      const existingNumbers = existingProfiles
        .map(p => p.employeeNumber)
        .filter(n => n && n.startsWith('EMP-'))
        .map(n => parseInt(n.split('-')[1]))
        .filter(n => !isNaN(n));

      let nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      // 5. Crear profiles faltantes
      for (const customer of customersWithoutProfile) {
        console.log(`   📝 Creando EmployeeProfile para: ${customer.name}`);

        const employeeNumber = `EMP-${String(nextNumber).padStart(6, '0')}`;

        const newProfile = {
          tenantId: tenantId,
          customerId: customer._id,
          employeeNumber: employeeNumber,
          status: 'active',
          hireDate: customer.createdAt || new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        nextNumber++;

        try {
          const result = await db.collection('employeeprofiles').insertOne(newProfile);

          if (result.acknowledged) {
            console.log(`      ✓ Profile creado (ID: ${result.insertedId})`);
            totalProfilesCreated++;
          } else {
            console.log(`      ❌ Error al crear profile`);
          }
        } catch (error) {
          console.log(`      ❌ Error: ${error.message}`);
        }

        totalCustomersProcessed++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 RESUMEN FINAL`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total tenants procesados: ${tenants.length}`);
    console.log(`Total customers procesados: ${totalCustomersProcessed}`);
    console.log(`Total EmployeeProfiles creados: ${totalProfilesCreated}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

syncAllEmployees();
