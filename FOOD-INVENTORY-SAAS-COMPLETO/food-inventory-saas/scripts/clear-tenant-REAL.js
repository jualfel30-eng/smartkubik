const { MongoClient, ObjectId } = require('mongodb');

async function clearTenantForReal() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // 1. Encontrar EARLYADOPTER
    const tenant = await db.collection('tenants').findOne({ code: 'EARLYADOPTER' });
    if (!tenant) {
      console.log('❌ Tenant EARLYADOPTER no encontrado');
      return;
    }

    const tenantId = tenant._id;
    const tenantIdString = tenantId.toString();

    console.log(`🎯 Limpiando tenant: ${tenant.name}`);
    console.log(`📋 ID como ObjectId: ${tenantId}`);
    console.log(`📋 ID como String: ${tenantIdString}`);

    // 2. Colecciones a limpiar - BUSCA EN AMBOS FORMATOS
    const collections = [
      'customers', 'orders', 'products', 'inventories', 'inventorymovements',
      'purchaseorders', 'purchaseorderratings', 'suppliers', 'payments', 
      'payables', 'chartofaccounts', 'journalentries', 'performancekpis', 
      'shifts', 'events', 'todos', 'roles'
    ];

    let totalDeleted = 0;

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);

        // Buscar con ObjectId
        const resultObjectId = await collection.deleteMany({ tenantId: tenantId });

        // Buscar con String          
        const resultString = await collection.deleteMany({ tenantId: tenantIdString });

        const deleted = resultObjectId.deletedCount + resultString.deletedCount;

        if (deleted > 0) {
          console.log(`✅ ${collectionName}: ${deleted} documentos eliminados`);
          totalDeleted += deleted;
        } else {
          console.log(`⚪ ${collectionName}: 0 documentos`);
        }      

      } catch (error) {
        console.log(`❌ Error en ${collectionName}: ${error.message}`);
      }
    }

    console.log(`
🔥 TOTAL ELIMINADO: ${totalDeleted} documentos`);

    if (totalDeleted > 0) {
      console.log('✅ LIMPIEZA COMPLETADA - DATOS REALMENTE BORRADOS');
    } else {
      console.log('⚠️  No se encontraron datos para eliminar');
    }      

  } catch (error) {
    console.error('💥 ERROR:', error);
  } finally {
    await client.close();
  }
}

clearTenantForReal();
