// Script para convertir tenantId y createdBy de string a ObjectId en customers
const { MongoClient, ObjectId } = require('mongodb');

async function fixObjectIds() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB Atlas\n');

    const db = client.db('test');

    // Buscar todos los customers con tenantId como string
    const customers = await db.collection('customers').find({}).toArray();

    console.log(`Total customers encontrados: ${customers.length}\n`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const customer of customers) {
      const needsUpdate = {};

      // Verificar tenantId
      if (typeof customer.tenantId === 'string') {
        console.log(`📝 ${customer.name} (${customer._id}) - tenantId es STRING`);
        needsUpdate.tenantId = new ObjectId(customer.tenantId);
      } else {
        alreadyCorrect++;
      }

      // Verificar createdBy
      if (customer.createdBy && typeof customer.createdBy === 'string') {
        console.log(`   - createdBy también es STRING`);
        needsUpdate.createdBy = new ObjectId(customer.createdBy);
      }

      // Si hay campos para actualizar, hacer el update
      if (Object.keys(needsUpdate).length > 0) {
        const result = await db.collection('customers').updateOne(
          { _id: customer._id },
          { $set: needsUpdate }
        );

        if (result.modifiedCount > 0) {
          console.log(`   ✅ Actualizado a ObjectId`);
          fixed++;
        } else {
          console.log(`   ❌ Error al actualizar`);
        }
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Total customers: ${customers.length}`);
    console.log(`Customers corregidos: ${fixed}`);
    console.log(`Customers que ya estaban correctos: ${alreadyCorrect}`);

    // Verificar algunos customers después del fix
    console.log('\n=== VERIFICACIÓN ===');
    const verifyCustomers = await db.collection('customers')
      .find({})
      .limit(3)
      .toArray();

    verifyCustomers.forEach(c => {
      console.log(`\n${c.name}:`);
      console.log(`  tenantId type: ${typeof c.tenantId} ${c.tenantId instanceof ObjectId ? '(ObjectId ✅)' : '(String ❌)'}`);
      if (c.createdBy) {
        console.log(`  createdBy type: ${typeof c.createdBy} ${c.createdBy instanceof ObjectId ? '(ObjectId ✅)' : '(String ❌)'}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fixObjectIds();
