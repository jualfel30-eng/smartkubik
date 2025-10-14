import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function removeTestDbObsoleteIndex() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const DB_NAME = 'test';

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log(`🔗 Conectado a MongoDB. Base de datos seleccionada: "${DB_NAME}"`);
    const db = client.db(DB_NAME);

    const tenantsCollection = db.collection('tenants');

    console.log('🔥 Intentando eliminar el índice "code_1" directamente...');
    try {
      await tenantsCollection.dropIndex('code_1');
      console.log('✅ Éxito: El índice "code_1" fue eliminado.');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('👍 El índice "code_1" no existía, lo cual es bueno.');
      } else {
        // Re-throw other errors
        throw err;
      }
    }

  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO durante la eliminación del índice:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Desconectado de la base de datos.');
  }
}

removeTestDbObsoleteIndex();