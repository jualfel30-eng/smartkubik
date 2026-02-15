// Verificar el último empleado creado
const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB Atlas\n');

    const db = client.db('test');

    // Buscar el último customer tipo employee creado
    const lastEmployee = await db.collection('customers')
      .find({ customerType: 'employee' })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (lastEmployee.length === 0) {
      console.log('❌ No hay employees en la BD');
      return;
    }

    const employee = lastEmployee[0];
    console.log('=== ÚLTIMO EMPLOYEE CREADO ===');
    console.log(`Nombre: ${employee.name}`);
    console.log(`ID: ${employee._id}`);
    console.log(`customerType: ${employee.customerType}`);
    console.log(`tenantId: ${employee.tenantId}`);
    console.log(`tenantId type: ${typeof employee.tenantId} ${employee.tenantId instanceof ObjectId ? '(ObjectId ✅)' : '(String ❌)'}`);
    console.log(`createdAt: ${employee.createdAt}`);

    // Buscar si tiene EmployeeProfile
    const profile = await db.collection('employeeprofiles').findOne({
      customerId: employee._id
    });

    console.log('\n=== EMPLOYEE PROFILE ===');
    if (profile) {
      console.log('✅ TIENE EmployeeProfile');
      console.log(`Profile ID: ${profile._id}`);
      console.log(`employeeNumber: ${profile.employeeNumber}`);
      console.log(`status: ${profile.status}`);
      console.log(`createdAt: ${profile.createdAt}`);
    } else {
      console.log('❌ NO TIENE EmployeeProfile');
      console.log('\n¿Por qué no se creó?');
      console.log('1. Backend antiguo ejecutándose (sin el fix)');
      console.log('2. Error al crear el profile (revisar logs)');
      console.log('3. Build no se desplegó correctamente');
    }

    // Buscar tenant
    const tenant = await db.collection('tenants').findOne({
      _id: employee.tenantId instanceof ObjectId ? employee.tenantId : new ObjectId(employee.tenantId)
    });

    console.log(`\nTenant: ${tenant?.name || 'No encontrado'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

check();
