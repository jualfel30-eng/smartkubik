
// food-inventory-saas/scripts/clean-by-id.js
// Este script limpia un tenant usando un ID específico para evitar ambigüedades.

require('dotenv').config({ path: './.env' });
const { MongoClient, ObjectId } = require('mongodb');

// --- CONFIGURACIÓN ---
const TARGET_TENANT_ID_STRING = '68d371dffdb57e5c800f2fcd'; // El ID correcto asociado al usuario
const DATABASE_NAME = 'test';
const COLLECTIONS_TO_CLEAN = [
  'roles', 'customers', 'orders', 'products', 'inventories', 
  'inventorymovements', 'purchaseorders', 'purchaseorderratings', 
  'suppliers', 'payments', 'payables', 'chartofaccounts', 
  'journalentries', 'performancekpis', 'shifts', 'events', 'todos'
];
// ---------------------

async function cleanTenantById() {
  console.log(`🔥 Iniciando limpieza quirúrgica para el Tenant ID: ${TARGET_TENANT_ID_STRING}`);

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in your .env file.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    console.log(`✅ Conectado a la base de datos: "${DATABASE_NAME}"`);

    // 1. Construir el filtro robusto con el ID específico
    const targetObjectId = new ObjectId(TARGET_TENANT_ID_STRING);
    const robustFilter = {
      $or: [
        { tenantId: targetObjectId }, // Búsqueda como ObjectId
        { tenantId: TARGET_TENANT_ID_STRING } // Búsqueda como String
      ]
    };
    console.log('🔬 Usando filtro por ID específico:', JSON.stringify(robustFilter));
    console.log('---\n');

    let totalDeleted = 0;

    // 2. Iterar y limpiar cada colección
    for (const collectionName of COLLECTIONS_TO_CLEAN) {
      try {
        const collection = db.collection(collectionName);
        const { deletedCount } = await collection.deleteMany(robustFilter);
        
        if (deletedCount > 0) {
          console.log(`✅ ${collectionName}: ${deletedCount} documentos eliminados.`);
          totalDeleted += deletedCount;
        } else {
          console.log(`- ${collectionName}: 0 documentos encontrados para eliminar.`);
        }
      } catch (error) {
        console.error(`⚠️ Error limpiando la colección ${collectionName}:`, error.message);
      }
    }

    console.log('---\n');
    console.log(`📊 TOTAL DE DOCUMENTOS ELIMINADOS: ${totalDeleted}`);
    console.log('✅ Limpieza del tenant correcto completada.');

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO durante la limpieza:', error);
  } finally {
    await client.close();
    console.log('🔌 Desconectado.');
  }
}

cleanTenantById();
