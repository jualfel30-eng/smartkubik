import { connect, disconnect } from 'mongoose';
import { addProductionModulePermissions } from '../src/database/migrations/add-production-module-permissions';

async function runMigration() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';

  try {
    console.log(`🔌 Conectando a MongoDB: ${MONGODB_URI}`);
    const connection = await connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    await addProductionModulePermissions(connection.connection);

    await disconnect();
    console.log('\n✅ Migración completada y desconectado de MongoDB');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error(error.stack);
    await disconnect();
    process.exit(1);
  }
}

runMigration();
