const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function checkCustomerTypes() {
  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB\n');

    const db = client.db('test');
    const customers = db.collection('customers');

    console.log('📊 ANÁLISIS DE TIPOS DE CLIENTES\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get all unique customerType values
    const customerTypes = await customers.distinct('customerType');
    console.log('🏷️  Tipos de cliente encontrados:');
    customerTypes.forEach(type => {
      console.log(`   • ${type || '(vacío/null)'}`);
    });
    console.log('');

    // Count by customerType
    const pipeline = [
      {
        $group: {
          _id: '$customerType',
          count: { $sum: 1 },
          names: { $push: '$name' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];

    const counts = await customers.aggregate(pipeline).toArray();

    console.log('📈 Cantidad por tipo:\n');
    for (const item of counts) {
      const type = item._id || '(vacío/null)';
      console.log(`━━━ ${type} (${item.count} registros) ━━━`);

      // Show first 5 names
      const sampleNames = item.names.slice(0, 5);
      sampleNames.forEach(name => {
        console.log(`   • ${name}`);
      });

      if (item.names.length > 5) {
        console.log(`   ... y ${item.names.length - 5} más`);
      }
      console.log('');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ANÁLISIS COMPLETADO\n');

    // Check specific problematic records
    console.log('🔍 VERIFICANDO CLIENTES Y EMPLEADOS:\n');

    const businessCustomers = await customers.find({ customerType: 'business' }).limit(5).toArray();
    console.log(`📊 Primeros 5 clientes con tipo "business":`);
    if (businessCustomers.length === 0) {
      console.log('   ❌ NO SE ENCONTRARON CLIENTES CON TIPO "business"');
    } else {
      businessCustomers.forEach(c => {
        console.log(`   • ${c.name} (${c.customerNumber})`);
      });
    }
    console.log('');

    const individualCustomers = await customers.find({ customerType: 'individual' }).limit(5).toArray();
    console.log(`📊 Primeros 5 clientes con tipo "individual":`);
    if (individualCustomers.length === 0) {
      console.log('   ❌ NO SE ENCONTRARON CLIENTES CON TIPO "individual"');
    } else {
      individualCustomers.forEach(c => {
        console.log(`   • ${c.name} (${c.customerNumber})`);
      });
    }
    console.log('');

    const employees = await customers.find({ customerType: 'employee' }).limit(5).toArray();
    console.log(`👥 Primeros 5 empleados:`);
    if (employees.length === 0) {
      console.log('   ❌ NO SE ENCONTRARON EMPLEADOS');
    } else {
      employees.forEach(e => {
        console.log(`   • ${e.name} (${e.customerNumber})`);
      });
    }
    console.log('');

    const suppliers = await customers.find({ customerType: 'supplier' }).limit(5).toArray();
    console.log(`📦 Primeros 5 proveedores:`);
    if (suppliers.length === 0) {
      console.log('   ❌ NO SE ENCONTRARON PROVEEDORES');
    } else {
      suppliers.forEach(s => {
        console.log(`   • ${s.name} (${s.customerNumber})`);
      });
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

checkCustomerTypes();
