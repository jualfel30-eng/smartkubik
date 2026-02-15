const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');
    const tenantId = new ObjectId('68d371dffdb57e5c800f2fcd');

    const customers = await db.collection('customers')
      .find({ tenantId })
      .sort({ customerNumber: -1 })
      .limit(10)
      .toArray();

    console.log('=== CUSTOMERS (últimos 10, ordenados por customerNumber desc) ===\n');
    customers.forEach(c => {
      console.log(`${c.customerNumber} - ${c.name} (${c.customerType})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

check();
