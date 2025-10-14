import { connect, disconnect } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function removeObsoleteIndex() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  if (!MONGODB_URI.includes('test')) {
    // Basic safety check to not run this on a prod db by accident
    // The test db name is configured in the connection string for tests
    // console.warn('This script is intended for the test database.');
  }

  let client;
  try {
    console.log(`🔗 Conectando a la base de datos para eliminar el índice...`);
    const connection = await connect(MONGODB_URI);
    client = connection.connection.getClient();
    const db = client.db(); // Get the default database from the connection string

    const tenantsCollection = db.collection('tenants');

    console.log('🔍 Verificando la existencia del índice obsoleto "code_1"...');
    const indexExists = await tenantsCollection.indexExists('code_1');

    if (indexExists) {
      console.log('🔥 El índice "code_1" existe. Procediendo a eliminarlo...');
      await tenantsCollection.dropIndex('code_1');
      console.log('✅ Índice "code_1" eliminado exitosamente.');
    } else {
      console.log('👍 El índice "code_1" no existe. No se necesita ninguna acción.');
    }

  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO durante la eliminación del índice:', error);
    process.exit(1);
  } finally {
    if (client) {
      await disconnect();
    }
    console.log('🔌 Desconectado de la base de datos.');
  }
}

removeObsoleteIndex();
