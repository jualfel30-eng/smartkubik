// food-inventory-saas/scripts/reset-tenant.js
// This script resets a tenant: first it cleans all its data and then seeds the chart of accounts.

require('dotenv').config({ path: './.env' });
const { MongoClient, ObjectId } = require('mongodb');

// --- CONFIGURATION ---
// The ID of the tenant to reset is now passed as a command-line argument.
const DATABASE_NAME = 'test'; // Or read from env if needed
const COLLECTIONS_TO_CLEAN = [
  'roles', 'customers', 'orders', 'products', 'inventories', 
  'inventorymovements', 'purchaseorders', 'purchaseorderratings', 
  'suppliers', 'payments', 'payables', 'chartofaccounts', 
  'journalentries', 'performancekpis', 'shifts', 'events', 'todos'
];

// Base structure for the new chart of accounts, tenantId will be added dynamically.
const BASE_CHART_OF_ACCOUNTS = [
  { code: '1101', name: 'Efectivo y Equivalentes', type: 'Activo' },
  { code: '1102', name: 'Cuentas por Cobrar', type: 'Activo' },
  { code: '1103', name: 'Inventario', type: 'Activo' },
  { code: '2101', name: 'Cuentas por Pagar', type: 'Pasivo' },
  { code: '2102', name: 'Impuestos por Pagar', type: 'Pasivo' },
  { code: '3101', name: 'Capital Social', type: 'Patrimonio' },
  { code: '3102', name: 'Resultados Acumulados', type: 'Patrimonio' },
  { code: '4101', name: 'Ingresos por Ventas', type: 'Ingreso' },
  { code: '4102', name: 'Devoluciones en Ventas', type: 'Ingreso' },
  { code: '5101', name: 'Costo de Mercancía Vendida', type: 'Gasto' },
  { code: '5201', name: 'Gastos de Sueldos y Salarios', type: 'Gasto' },
  { code: '5202', name: 'Gasto de Alquiler', type: 'Gasto' },
  { code: '5203', name: 'Imprevistos', type: 'Gasto' },
  { code: '5204', name: 'Inversión', type: 'Gasto' },
];
// --------------------- 

async function resetTenant(tenantIdArg) {
  if (!tenantIdArg) {
    console.error('❌ ERROR: Debe proporcionar el ID del tenant a resetear.');
    console.log('📖 Uso: node scripts/reset-tenant.js <tenant_id>');
    process.exit(1);
  }
  console.log(`🔥 Iniciando reseteo para el Tenant ID: ${tenantIdArg}`);

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

    let targetObjectId;
    try {
        targetObjectId = new ObjectId(tenantIdArg);
    } catch(e) {
        console.log(`❌ ERROR: El ID proporcionado "${tenantIdArg}" no es un ObjectId válido.`);
        process.exit(1);
    }

    // Verify tenant exists
    const tenant = await db.collection('tenants').findOne({ _id: targetObjectId });
    if (!tenant) {
        console.error(`❌ ERROR: No se encontró tenant con ID "${tenantIdArg}".`);
        return;
    }
    console.log(`✅ Tenant a resetear encontrado: ${tenant.name}`);


    // PARTE 1: LIMPIEZA
    console.log('\n--- PASO 1: Limpiando datos existentes ---');
    const robustFilter = {
      $or: [
        { tenantId: targetObjectId },
        { tenantId: tenantIdArg } // Check for both ObjectId and string representations
      ]
    };
    let totalDeleted = 0;
    for (const collectionName of COLLECTIONS_TO_CLEAN) {
      const collection = db.collection(collectionName);
      const { deletedCount } = await collection.deleteMany(robustFilter);
      if (deletedCount > 0) {
        console.log(`  - ${collectionName}: ${deletedCount} documentos eliminados.`);
        totalDeleted += deletedCount;
      }
    }
    console.log(`  -> Total de documentos eliminados: ${totalDeleted}`);

    // PARTE 2: SIEMBRA
    console.log('\n--- PASO 2: Sembrando nuevo plan de cuentas ---');
    
    // Dynamically add the correct tenantId to the chart of accounts
    const newChartOfAccounts = BASE_CHART_OF_ACCOUNTS.map(account => ({
        ...account,
        tenantId: tenantIdArg // Using string representation as in the original script
    }));

    const chartOfAccountsCollection = db.collection('chartofaccounts');
    const insertResult = await chartOfAccountsCollection.insertMany(newChartOfAccounts);
    console.log(`  ✅ ${insertResult.insertedCount} nuevas cuentas insertadas para el tenant ${tenant.name}.`);

    console.log('\n🎉 RESUMEN: Reseteo completado exitosamente.');

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO durante el reseteo:', error);
  } finally {
    await client.close();
    console.log('🔌 Desconectado.');
  }
}

const tenantIdArg = process.argv[2];
resetTenant(tenantIdArg);