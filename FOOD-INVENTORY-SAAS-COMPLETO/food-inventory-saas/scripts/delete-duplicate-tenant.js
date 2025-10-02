
// food-inventory-saas/scripts/delete-duplicate-tenant.js
// Este script elimina un único tenant duplicado por su ID específico.

require('dotenv').config({ path: './.env' });
const { MongoClient, ObjectId } = require('mongodb');

// --- CONFIGURACIÓN ---
const DUPLICATE_TENANT_ID_STRING = '68d1fa448a2bca277f47b5f4'; // El ID del tenant duplicado a eliminar
const DATABASE_NAME = 'test';
// ---------------------

async function deleteDuplicateTenant() {
  console.log(`🔥 Intentando eliminar el tenant duplicado con ID: ${DUPLICATE_TENANT_ID_STRING}`);

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

    const tenantObjectId = new ObjectId(DUPLICATE_TENANT_ID_STRING);

    const result = await db.collection('tenants').deleteOne({ _id: tenantObjectId });

    console.log('---');
    if (result.deletedCount === 1) {
      console.log('✅ ÉXITO: El tenant duplicado ha sido eliminado permanentemente.');
    } else {
      console.log('⚠️ ADVERTENCIA: No se encontró ningún tenant con ese ID para eliminar. Es posible que ya haya sido borrado.');
    }
    console.log('---');

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO durante la eliminación:', error);
  } finally {
    await client.close();
    console.log('🔌 Desconectado.');
  }
}

deleteDuplicateTenant();
