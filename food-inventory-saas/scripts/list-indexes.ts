import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function listTenantIndexes() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const DB_NAME = 'test';

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const tenantsCollection = db.collection('tenants');

    console.log(`🔍 Listando índices para la colección "${DB_NAME}.tenants"...`);
    const indexes = await tenantsCollection.indexes();
    console.log('📋 Índices encontrados:');
    console.log(JSON.stringify(indexes, null, 2));

  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Desconectado.');
  }
}

listTenantIndexes();
