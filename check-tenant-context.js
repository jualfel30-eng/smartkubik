// Check tenant context for the customer
const { MongoClient, ObjectId } = require('mongodb');

async function checkTenant() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB Atlas\n');

    const db = client.db('test');

    const customerId = '69646934105b0d9664fa113f';
    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(customerId)
    });

    console.log('Customer tenantId:', customer.tenantId);
    console.log('Customer tenantId type:', typeof customer.tenantId);
    console.log('Customer tenantId is ObjectId:', customer.tenantId instanceof ObjectId);

    // Find the tenant
    let tenant;
    if (customer.tenantId instanceof ObjectId) {
      tenant = await db.collection('tenants').findOne({
        _id: customer.tenantId
      });
    } else {
      tenant = await db.collection('tenants').findOne({
        _id: new ObjectId(customer.tenantId)
      });
    }

    if (tenant) {
      console.log('\n✅ Tenant encontrado:');
      console.log('Name:', tenant.name);
      console.log('ID:', tenant._id);
      console.log('ID type:', typeof tenant._id);
    } else {
      console.log('\n❌ Tenant no encontrado');
    }

    // Now try the exact query the backend uses
    console.log('\n=== SIMULANDO QUERY DEL BACKEND ===');

    // Try with ObjectId tenantId
    const testQuery1 = {
      _id: new ObjectId(customerId),
      tenantId: customer.tenantId instanceof ObjectId ? customer.tenantId : new ObjectId(customer.tenantId)
    };

    console.log('Query:', JSON.stringify(testQuery1, null, 2));

    const found = await db.collection('customers').findOne(testQuery1);

    if (found) {
      console.log('✅ Customer encontrado con query del backend');
    } else {
      console.log('❌ Customer NO encontrado con query del backend');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkTenant();
