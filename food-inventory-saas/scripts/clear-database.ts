import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno desde el archivo .env en la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function clearCollections() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: La variable de entorno MONGODB_URI no está definida en tu archivo .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  // Colecciones que NO se deben borrar
  const collectionsToPreserve = ['users', 'tenants'];

  try {
    await client.connect();
    console.log('Conectado exitosamente al servidor de MongoDB.');

    const db = client.db();
    const dbName = db.databaseName;

    console.log(`ADVERTENCIA: Estás a punto de borrar el contenido de TODAS las colecciones en "${dbName}" EXCEPTO: ${collectionsToPreserve.join(', ')}`);
    
    // Pausa para que el usuario pueda cancelar
    await new Promise(resolve => setTimeout(resolve, 4000));

    const collections = await db.listCollections().toArray();

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      if (collectionsToPreserve.includes(collectionName)) {
        console.log(`- Preservando la colección: "${collectionName}"`);
        continue;
      }
      
      // No borrar colecciones del sistema
      if (collectionName.startsWith('system.')) {
        continue;
      }

      try {
        console.log(`- Vaciando la colección: "${collectionName}"...`);
        await db.collection(collectionName).deleteMany({});
        console.log(`  Colección "${collectionName}" vaciada con éxito.`);
      } catch (err) {
        console.error(`  Error al vaciar la colección "${collectionName}":`, err.message);
      }
    }

    console.log('\nLimpieza de colecciones completada.');

  } catch (err) {
    console.error('Ocurrió un error durante el proceso:', err);
  } finally {
    await client.close();
    console.log('Conexión cerrada.');
  }
}

clearCollections();