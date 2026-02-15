// Verificar empleados en Early Adopter
const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB Atlas\n');

    const db = client.db('test');

    // Buscar tenant Early Adopter
    const tenant = await db.collection('tenants').findOne({ name: /early adopter/i });
    if (!tenant) {
      console.log('❌ Tenant Early Adopter no encontrado');
      return;
    }

    console.log(`Tenant: ${tenant.name} (${tenant._id})\n`);
    const tenantId = tenant._id;

    // Buscar TODOS los customers tipo employee
    const employees = await db.collection('customers').find({
      tenantId,
      customerType: 'employee'
    }).sort({ createdAt: -1 }).toArray();

    console.log(`=== CUSTOMERS TIPO EMPLOYEE ===`);
    console.log(`Total: ${employees.length}\n`);

    if (employees.length === 0) {
      console.log('❌ NO HAY CUSTOMERS CON customerType="employee"');

      // Buscar los últimos 10 customers creados
      console.log('\n=== ÚLTIMOS 10 CUSTOMERS CREADOS ===');
      const recent = await db.collection('customers').find({ tenantId })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      recent.forEach(c => {
        console.log(`- ${c.name} (${c.customerType}) - ${c.createdAt}`);
      });
    } else {
      for (const emp of employees) {
        console.log(`📋 ${emp.name} (${emp._id})`);
        console.log(`   customerType: ${emp.customerType}`);
        console.log(`   tenantId: ${emp.tenantId} (${emp.tenantId instanceof ObjectId ? 'ObjectId ✅' : 'String ❌'})`);
        console.log(`   createdAt: ${emp.createdAt}`);

        // Verificar EmployeeProfile
        const profile = await db.collection('employeeprofiles').findOne({
          customerId: emp._id
        });

        if (profile) {
          console.log(`   ✅ Tiene EmployeeProfile (${profile._id})`);
        } else {
          console.log(`   ❌ NO tiene EmployeeProfile`);
        }
        console.log('');
      }
    }

    // Verificar EmployeeProfiles del tenant
    console.log('\n=== EMPLOYEE PROFILES ===');
    const profiles = await db.collection('employeeprofiles').find({ tenantId }).toArray();
    console.log(`Total: ${profiles.length}\n`);

    profiles.forEach(p => {
      console.log(`Profile ${p._id} -> customerId: ${p.customerId}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

check();
