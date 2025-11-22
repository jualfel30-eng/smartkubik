const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugCustomerTiers() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db('test');
    const customersCollection = db.collection('customers');

    // Buscar todos los valores únicos de tier
    const tierValues = await customersCollection.distinct('tier');
    console.log('\n📊 Valores únicos de tier en la BD:');
    console.log(JSON.stringify(tierValues, null, 2));

    // Contar clientes por tier
    const tierCounts = await customersCollection.aggregate([
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    console.log('\n📈 Conteo de clientes por tier:');
    tierCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id || '(null/undefined)'}: ${count} clientes`);
    });

    // Mostrar 5 clientes de ejemplo con sus tiers
    const sampleCustomers = await customersCollection.find({
      tier: { $exists: true, $ne: null }
    })
      .limit(10)
      .project({ name: 1, tier: 1, 'metrics.totalSpent': 1 })
      .toArray();

    console.log('\n👥 Muestra de 10 clientes con tier:');
    sampleCustomers.forEach(customer => {
      console.log(`  - ${customer.name}: tier="${customer.tier}" (gasto: $${customer.metrics?.totalSpent || 0})`);
    });

    // Buscar clientes con cada tier específico
    console.log('\n🔍 Verificando filtros específicos:');

    const tiersToTest = ['diamante', 'oro', 'plata', 'bronce', 'Diamante', 'Oro', 'Plata', 'Bronce'];

    for (const tierValue of tiersToTest) {
      const count = await customersCollection.countDocuments({ tier: tierValue });
      console.log(`  tier="${tierValue}": ${count} clientes`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Conexión cerrada');
  }
}

debugCustomerTiers();
