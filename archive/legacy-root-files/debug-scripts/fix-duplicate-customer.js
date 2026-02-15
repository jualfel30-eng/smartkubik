// Eliminar customer huérfano CLI-000002
const { MongoClient, ObjectId } = require('mongodb');

async function fix() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB Atlas\n');

    const db = client.db('test');
    const tenantId = new ObjectId('68d371dffdb57e5c800f2fcd');

    // Buscar CLI-000002
    const customer = await db.collection('customers').findOne({
      customerNumber: 'CLI-000002',
      tenantId: tenantId
    });

    if (!customer) {
      console.log('❌ Customer CLI-000002 no encontrado');
      return;
    }

    console.log('📋 Customer encontrado:');
    console.log('  ID:', customer._id);
    console.log('  Nombre:', customer.name);
    console.log('  Tipo:', customer.customerType);
    console.log('  Creado:', customer.createdAt);

    // Verificar si tiene EmployeeProfile
    const profile = await db.collection('employeeprofiles').findOne({
      customerId: customer._id
    });

    console.log('  EmployeeProfile:', profile ? '✅ SÍ' : '❌ NO');

    // Si no tiene profile, es huérfano - eliminarlo
    if (!profile) {
      console.log('\n⚠️  Customer huérfano detectado (sin EmployeeProfile)');
      const result = await db.collection('customers').deleteOne({ _id: customer._id });
      console.log('✅ Customer eliminado:', result.deletedCount, 'documento(s)');
    } else {
      console.log('\n⚠️  Customer tiene EmployeeProfile - NO se eliminará');
      console.log('   Usa la UI para gestionar este empleado');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fix();
