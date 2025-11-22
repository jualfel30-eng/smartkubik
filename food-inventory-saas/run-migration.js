const { MongoClient } = require('mongodb');

const newPermissions = [
  // Restaurant Module
  {
    name: 'restaurant_read',
    description: 'Ver módulo de restaurante',
    category: 'restaurant',
  },
  {
    name: 'restaurant_write',
    description: 'Gestionar módulo de restaurante',
    category: 'restaurant',
  },

  // Chat Module
  {
    name: 'chat_read',
    description: 'Ver conversaciones y mensajes',
    category: 'communication',
  },
  {
    name: 'chat_write',
    description: 'Enviar mensajes y gestionar conversaciones',
    category: 'communication',
  },

  // Marketing Module
  {
    name: 'marketing_read',
    description: 'Ver campañas de marketing y analíticas',
    category: 'marketing',
  },
  {
    name: 'marketing_write',
    description: 'Crear y gestionar campañas de marketing',
    category: 'marketing',
  },

  // Payroll Module
  {
    name: 'payroll_employees_read',
    description: 'Ver información de nómina de empleados',
    category: 'payroll',
  },
  {
    name: 'payroll_employees_write',
    description: 'Gestionar nómina de empleados',
    category: 'payroll',
  },
];

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';

  console.log('🔄 Connecting to MongoDB...');
  console.log(`   URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const permissionsCollection = db.collection('permissions');

    console.log('🔄 Starting marketing permissions migration...\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const permission of newPermissions) {
      const existing = await permissionsCollection.findOne({
        name: permission.name,
      });

      if (existing) {
        console.log(`⏭️  Permission already exists: ${permission.name}`);
        skippedCount++;
        continue;
      }

      await permissionsCollection.insertOne({
        ...permission,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Added permission: ${permission.name}`);
      addedCount++;
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Added: ${addedCount} permissions`);
    console.log(`   Skipped: ${skippedCount} permissions (already existed)\n`);

    // Verificar permisos de marketing
    const marketingPerms = await permissionsCollection.find({
      category: 'marketing'
    }).toArray();

    console.log('📊 Marketing permissions in database:');
    marketingPerms.forEach(p => {
      console.log(`   - ${p.name}: ${p.description}`);
    });

  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

runMigration();
