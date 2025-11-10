const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function checkEmployeeDetails() {
  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB\n');

    const db = client.db('test');
    const customers = db.collection('customers');

    // Get all employees
    const employees = await customers.find({ customerType: 'employee' }).toArray();

    console.log(`👥 EMPLEADOS ENCONTRADOS: ${employees.length}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    employees.forEach((emp, index) => {
      console.log(`📋 Empleado ${index + 1}:`);
      console.log(`   Nombre: ${emp.name}`);
      console.log(`   Número: ${emp.customerNumber}`);
      console.log(`   Tipo: ${emp.customerType}`);
      console.log(`   Estado: ${emp.status || '(no definido)'}`);
      console.log(`   Tenant ID: ${emp.tenantId}`);
      console.log(`   Creado: ${emp.createdAt}`);
      console.log(`   Actualizado: ${emp.updatedAt}`);

      if (emp.status === 'inactive') {
        console.log(`   ⚠️  ESTADO INACTIVO - Razón: ${emp.inactiveReason || 'No especificada'}`);
      }

      console.log('');
    });

    // Check all active customers
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN POR ESTADO:\n');

    const statusPipeline = [
      {
        $group: {
          _id: { status: '$status', customerType: '$customerType' },
          count: { $sum: 1 },
          names: { $push: '$name' }
        }
      },
      {
        $sort: { '_id.customerType': 1, '_id.status': 1 }
      }
    ];

    const statusCounts = await customers.aggregate(statusPipeline).toArray();

    statusCounts.forEach(item => {
      const status = item._id.status || '(sin estado)';
      const type = item._id.customerType;
      console.log(`${type} - ${status}: ${item.count}`);

      if (item.count <= 3) {
        item.names.forEach(name => console.log(`   • ${name}`));
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

checkEmployeeDetails();
