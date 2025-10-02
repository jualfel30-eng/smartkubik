
// food-inventory-saas/scripts/reset-tenant.js
// Este script resetea un tenant: primero limpia todos sus datos y luego siembra el plan de cuentas.

require('dotenv').config({ path: './.env' });
const { MongoClient, ObjectId } = require('mongodb');

// --- CONFIGURACIÓN ---
const TARGET_TENANT_ID_STRING = '68d371dffdb57e5c800f2fcd'; // El ID del tenant a resetear
const DATABASE_NAME = 'test';
const COLLECTIONS_TO_CLEAN = [
  'roles', 'customers', 'orders', 'products', 'inventories', 
  'inventorymovements', 'purchaseorders', 'purchaseorderratings', 
  'suppliers', 'payments', 'payables', 'chartofaccounts', 
  'journalentries', 'performancekpis', 'shifts', 'events', 'todos'
];
const NEW_CHART_OF_ACCOUNTS = [
  { code: '1101', name: 'Efectivo y Equivalentes', type: 'Activo', tenantId: TARGET_TENANT_ID_STRING },
  { code: '1102', name: 'Cuentas por Cobrar', type: 'Activo', tenantId: TARGET_TENANT_ID_STRING },
  { code: '1103', name: 'Inventario', type: 'Activo', tenantId: TARGET_TENANT_ID_STRING },
  { code: '2101', name: 'Cuentas por Pagar', type: 'Pasivo', tenantId: TARGET_TENANT_ID_STRING },
  { code: '2102', name: 'Impuestos por Pagar', type: 'Pasivo', tenantId: TARGET_TENANT_ID_STRING },
  { code: '3101', name: 'Capital Social', type: 'Patrimonio', tenantId: TARGET_TENANT_ID_STRING },
  { code: '3102', name: 'Resultados Acumulados', type: 'Patrimonio', tenantId: TARGET_TENANT_ID_STRING },
  { code: '4101', name: 'Ingresos por Ventas', type: 'Ingreso', tenantId: TARGET_TENANT_ID_STRING },
  { code: '4102', name: 'Devoluciones en Ventas', type: 'Ingreso', tenantId: TARGET_TENANT_ID_STRING },
  { code: '5101', name: 'Costo de Mercancía Vendida', type: 'Gasto', tenantId: TARGET_TENANT_ID_STRING },
  { code: '5201', name: 'Gastos de Sueldos y Salarios', type: 'Gasto', tenantId: TARGET_TENANT_ID_STRING },
  { code: '5202', name: 'Gasto de Alquiler', type: 'Gasto', tenantId: TARGET_TENANT_ID_STRING },
  { code: '5203', name: 'Imprevistos', type: 'Gasto', tenantId: TARGET_TENANT_ID_STRING },
  { code: '5204', name: 'Inversión', type: 'Gasto', tenantId: TARGET_TENANT_ID_STRING },
];
// --------------------- 

async function resetTenant() {
  console.log(`🔥 Iniciando reseteo para el Tenant ID: ${TARGET_TENANT_ID_STRING}`);

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

    // PARTE 1: LIMPIEZA
    console.log('\n--- PASO 1: Limpiando datos existentes ---');
    const targetObjectId = new ObjectId(TARGET_TENANT_ID_STRING);
    const robustFilter = {
      $or: [
        { tenantId: targetObjectId },
        { tenantId: TARGET_TENANT_ID_STRING }
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
    const chartOfAccountsCollection = db.collection('chartofaccounts');
    const insertResult = await chartOfAccountsCollection.insertMany(NEW_CHART_OF_ACCOUNTS);
    console.log(`  ✅ ${insertResult.insertedCount} nuevas cuentas insertadas.`);

    console.log('\n🎉 RESUMEN: Reseteo completado exitosamente.');

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO durante el reseteo:', error);
  } finally {
    await client.close();
    console.log('🔌 Desconectado.');
  }
}

resetTenant();
