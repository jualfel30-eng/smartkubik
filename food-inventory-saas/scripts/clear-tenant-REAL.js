const { MongoClient, ObjectId } = require('mongodb');

async function clearTenantForReal() {
  const tenantIdArg = process.argv[2];

  if (!tenantIdArg) {
    console.error('❌ ERROR: Debe proporcionar el ID del tenant a limpiar.');
    console.log('📖 Uso: node scripts/clear-tenant-REAL.js <tenant_id>');
    console.log('📖 Ejemplo: node scripts/clear-tenant-REAL.js 60d21b4667d0d8992e610c85');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // 1. Encontrar el tenant por ID
    let tenant;
    try {
      tenant = await db.collection('tenants').findOne({ _id: new ObjectId(tenantIdArg) });
    } catch (e) {
      console.log(`❌ ERROR: El ID proporcionado "${tenantIdArg}" no es un ObjectId válido.`);
      process.exit(1);
    }
    
    if (!tenant) {
      console.log(`❌ Tenant con ID ${tenantIdArg} no encontrado`);
      return;
    }

    const tenantId = tenant._id;
    const tenantIdString = tenantId.toString();

    console.log(`🎯 Limpiando tenant: ${tenant.name}`);
    console.log(`📋 ID como ObjectId: ${tenantId}`);
    console.log(`📋 ID como String: ${tenantIdString}`);

    // 2. Colecciones a limpiar
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

        // Buscar con ObjectId y String
        const resultObjectId = await collection.deleteMany({ tenantId: tenantId });
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

    console.log(`\n🔥 TOTAL ELIMINADO: ${totalDeleted} documentos`);

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