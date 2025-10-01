
// food-inventory-saas/scripts/verify-final.js
// Este script es de SOLO LECTURA. No modifica nada.
// Su único propósito es contar documentos para una verificación final.

require('dotenv').config({ path: './.env' });
const { MongoClient } = require('mongodb');

const TENANT_CODE = 'EARLYADOPTER';
const COLLECTION_TO_CHECK = 'customers';
const DATABASE_NAME = 'test'; // Conectando explícitamente a la DB 'test'

async function finalVerification() {
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

    // 1. Encontrar el tenant para obtener el ID
    const tenant = await db.collection('tenants').findOne({ code: TENANT_CODE });
    if (!tenant) {
      console.error(`❌ ERROR: No se encontró el tenant con código '${TENANT_CODE}'`);
      return;
    }

    const tenantId = tenant._id;
    console.log(`🔬 Verificando para el tenant: ${tenant.name} (ID: ${tenantId})`);

    // 2. Construir el filtro robusto
    const robustFilter = {
      $or: [
        { tenantId: tenantId }, // Búsqueda como ObjectId
        { tenantId: tenantId.toString() } // Búsqueda como String
      ]
    };

    // 3. Contar los documentos en la colección especificada
    const count = await db.collection(COLLECTION_TO_CHECK).countDocuments(robustFilter);

    console.log('---');
    console.log('📊 RESULTADO DE LA VERIFICACIÓN FINAL:');
    console.log(`   Colección verificada: "${COLLECTION_TO_CHECK}"`);
    console.log(`   Documentos encontrados: ${count}`);
    console.log('---');

    if (count > 0) {
      console.log('🔴 CONCLUSIÓN: Los datos SÍ existen en la base de datos.');
    } else {
      console.log('🟢 CONCLUSIÓN: Los datos NO existen en la base de datos. El borrado fue exitoso.');
    }

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO durante la verificación:', error);
  } finally {
    await client.close();
    console.log('🔌 Desconectado.');
  }
}

finalVerification();
