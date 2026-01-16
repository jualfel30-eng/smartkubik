// Check if specific customer exists
const { MongoClient, ObjectId } = require('mongodb');

async function checkCustomer() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB Atlas\n');

    const db = client.db('test');

    // Customer ID from logs
    const customerId = '69646934105b0d9664fa113f';

    console.log(`Buscando customer con ID: ${customerId}\n`);

    // Try to find the customer
    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(customerId)
    });

    if (customer) {
      console.log('✅ CUSTOMER ENCONTRADO:');
      console.log(JSON.stringify(customer, null, 2));

      // Check if it has an EmployeeProfile
      const profile = await db.collection('employeeprofiles').findOne({
        customerId: new ObjectId(customerId)
      });

      if (profile) {
        console.log('\n✅ TIENE EmployeeProfile:');
        console.log(JSON.stringify(profile, null, 2));
      } else {
        console.log('\n❌ NO tiene EmployeeProfile');
      }
    } else {
      console.log('❌ CUSTOMER NO ENCONTRADO');

      // Check all recent customers
      console.log('\nÚltimos 5 customers creados:');
      const recent = await db.collection('customers')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      recent.forEach(c => {
        console.log(`- ${c.name} (${c._id}) - ${c.customerType} - ${c.createdAt}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkCustomer();
