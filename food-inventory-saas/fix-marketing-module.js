const { MongoClient } = require('mongodb');

async function fixMarketingModule() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    console.log('🔧 Agregando campo module a permisos de marketing\n');

    // Actualizar ambos permisos
    const result = await db.collection('permissions').updateMany(
      { name: { $in: ['marketing_read', 'marketing_write'] } },
      { $set: { module: 'marketing' } }
    );

    console.log(`✅ ${result.modifiedCount} permisos de marketing actualizados\n`);

    // Verificar
    const marketingPerms = await db.collection('permissions').find({
      name: { $in: ['marketing_read', 'marketing_write'] }
    }).toArray();

    console.log('📋 Verificación Final:');
    marketingPerms.forEach(p => {
      console.log(`   ✅ ${p.name}`);
      console.log(`      _id: ${p._id}`);
      console.log(`      module: ${p.module}`);
      console.log(`      action: ${p.action}`);
      console.log(`      description: ${p.description}`);
      console.log('');
    });

    // Contar total de permisos
    const total = await db.collection('permissions').countDocuments();
    console.log(`📊 Total de permisos en Atlas: ${total}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

fixMarketingModule();
