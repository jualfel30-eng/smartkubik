import { connect, disconnect, model } from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';

// Importar todos los schemas necesarios
import { Role, RoleSchema } from '../src/schemas/role.schema';
import { Customer, CustomerSchema } from '../src/schemas/customer.schema';
import { Order, OrderSchema } from '../src/schemas/order.schema';
import { Product, ProductSchema } from '../src/schemas/product.schema';
import { Inventory, InventorySchema, InventoryMovement, InventoryMovementSchema } from '../src/schemas/inventory.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../src/schemas/purchase-order.schema';
import { PurchaseOrderRating, PurchaseOrderRatingSchema } from '../src/schemas/purchase-order-rating.schema';
import { Supplier, SupplierSchema } from '../src/schemas/supplier.schema';
import { Payment, PaymentSchema } from '../src/schemas/payment.schema';
import { Payable, PayableSchema } from '../src/schemas/payable.schema';
import { ChartOfAccounts, ChartOfAccountsSchema } from '../src/schemas/chart-of-accounts.schema';
import { JournalEntry, JournalEntrySchema } from '../src/schemas/journal-entry.schema';
import { PerformanceKpi, PerformanceKpiSchema } from '../src/schemas/performance-kpi.schema';
import { Shift, ShiftSchema } from '../src/schemas/shift.schema';
import { Event, EventSchema } from '../src/schemas/event.schema';
import { Todo, TodoSchema } from '../src/schemas/todo.schema';

// Interfaz para definir las colecciones a limpiar
interface CollectionConfig {
  name: string;
  model: any;
  schema: any;
  tenantIdType: 'ObjectId' | 'string';
}

// Lista de colecciones que contienen datos por tenant
// IMPORTANTE: Esta lista NO incluye 'users' ni 'tenants' por seguridad
const TENANT_COLLECTIONS: CollectionConfig[] = [
  { name: 'roles', model: Role, schema: RoleSchema, tenantIdType: 'ObjectId' },
  { name: 'customers', model: Customer, schema: CustomerSchema, tenantIdType: 'ObjectId' },
  { name: 'orders', model: Order, schema: OrderSchema, tenantIdType: 'ObjectId' },
  { name: 'products', model: Product, schema: ProductSchema, tenantIdType: 'ObjectId' },
  { name: 'inventories', model: Inventory, schema: InventorySchema, tenantIdType: 'ObjectId' },
  { name: 'inventorymovements', model: InventoryMovement, schema: InventoryMovementSchema, tenantIdType: 'ObjectId' },
  { name: 'purchaseorders', model: PurchaseOrder, schema: PurchaseOrderSchema, tenantIdType: 'ObjectId' },
  { name: 'purchaseorderratings', model: PurchaseOrderRating, schema: PurchaseOrderRatingSchema, tenantIdType: 'ObjectId' },
  { name: 'suppliers', model: Supplier, schema: SupplierSchema, tenantIdType: 'string' },
  { name: 'payments', model: Payment, schema: PaymentSchema, tenantIdType: 'ObjectId' },
  { name: 'payables', model: Payable, schema: PayableSchema, tenantIdType: 'ObjectId' },
  { name: 'chartofaccounts', model: ChartOfAccounts, schema: ChartOfAccountsSchema, tenantIdType: 'string' },
  { name: 'journalentries', model: JournalEntry, schema: JournalEntrySchema, tenantIdType: 'ObjectId' },
  { name: 'performancekpis', model: PerformanceKpi, schema: PerformanceKpiSchema, tenantIdType: 'ObjectId' },
  { name: 'shifts', model: Shift, schema: ShiftSchema, tenantIdType: 'ObjectId' },
  { name: 'events', model: Event, schema: EventSchema, tenantIdType: 'ObjectId' },
  { name: 'todos', model: Todo, schema: TodoSchema, tenantIdType: 'ObjectId' },
];

async function clearTenantData(tenantIdArg: string) {
  if (!tenantIdArg) {
    console.error('❌ ERROR: Debe proporcionar el ID del tenant');
    console.log('📖 Uso: npm run clear-tenant <tenant_id>');
    console.log('📖 Ejemplo: npm run clear-tenant 60d21b4667d0d8992e610c85');
    process.exit(1);
  }

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  
  try {
    // Paso 1: Conectar a la base de datos
    console.log('🔗 Conectando a la base de datos...');
    await connect(MONGODB_URI);
    console.log(`✅ Conectado a: ${MONGODB_URI}`);

    // Paso 2: Buscar y verificar el tenant
    console.log(`🔍 Buscando tenant con ID '${tenantIdArg}'...`);
    const TenantModel = model(Tenant.name, TenantSchema);
    const tenant = await TenantModel.findById(tenantIdArg);

    if (!tenant) {
      console.error(`❌ ERROR: No se encontró ningún tenant con el ID '${tenantIdArg}'`);
      process.exit(1);
    }

    const tenantId = tenant._id;
    console.log(`✅ Tenant encontrado: ${tenant.name} (ID: ${tenantId})`);

    // Paso 3: Confirmación de seguridad
    console.log('\n⚠️  ADVERTENCIA: Esta operación eliminará TODOS los datos del tenant especificado');
    console.log(`📊 Tenant a limpiar: ${tenant.name} (ID: ${tenantId})`);
    console.log('🛡️  Los datos de otros tenants permanecerán intactos');
    console.log('🔐 Las credenciales de usuarios y definiciones de tenants se preservarán\n');

    // En producción, aquí se podría agregar una confirmación interactiva
    // console.log('⏳Continuando en 5 segundos... (Ctrl+C para cancelar)');
    // await new Promise(resolve => setTimeout(resolve, 5000));

    // Paso 4: Proceder con la limpieza filtrada
    console.log('🧹 Iniciando limpieza de datos...\n');

    let totalDeleted = 0;
    const results: { collection: string; deleted: number; error?: string }[] = [];

    for (const collection of TENANT_COLLECTIONS) {
      try {
        console.log(`📂 Procesando colección: ${collection.name}`);
        
        // Crear el modelo de MongoDB
        const Model = model(collection.model.name, collection.schema);
        
        // Preparar el filtro según el tipo de tenantId
        let filter: any;
        if (collection.tenantIdType === 'ObjectId') {
          filter = { tenantId: tenantId };
        } else {
          filter = { tenantId: tenantId.toString() };
        }

        // Ejecutar operación de borrado filtrada
        const deleteResult = await Model.deleteMany(filter);
        const deletedCount = deleteResult.deletedCount || 0;

        console.log(`   ✅ ${deletedCount} documentos eliminados de ${collection.name}`);
        
        totalDeleted += deletedCount;
        results.push({ collection: collection.name, deleted: deletedCount });

      } catch (error) {
        console.error(`   ❌ Error en ${collection.name}:`, error.message);
        results.push({ collection: collection.name, deleted: 0, error: error.message });
      }
    }

    // Paso 5: Reporte final
    console.log('\n📊 REPORTE FINAL:');
    console.log('================');
    console.log(`🎯 Tenant procesado: ${tenant.name} (ID: ${tenantId})`);
    console.log(`📁 Total de documentos eliminados: ${totalDeleted}`);
    console.log('\n📋 Detalle por colección:');
    
    results.forEach(result => {
      if (result.error) {
        console.log(`   ❌ ${result.collection}: ERROR - ${result.error}`);
      } else {
        console.log(`   ✅ ${result.collection}: ${result.deleted} eliminados`);
      }
    });

    console.log('\n🛡️  VERIFICACIÓN DE SEGURIDAD:');
    console.log('   ✅ Colección "users": NO TOCADA (credenciales preservadas)');
    console.log('   ✅ Colección "tenants": NO TOCADA (definiciones preservadas)');
    console.log('   ✅ Otros tenants: NO AFECTADOS (datos intactos)');

    console.log('\n🎉 Limpieza completada exitosamente!');

  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO durante la limpieza:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Paso 6: Desconectar de la base de datos
    console.log('\n🔌 Desconectando de la base de datos...');
    await disconnect();
    console.log('✅ Desconectado exitosamente');
  }
}

// Obtener el ID del tenant desde argumentos de línea de comandos
const tenantIdArg = process.argv[2];

// Ejecutar el script
clearTenantData(tenantIdArg).catch(err => {
  console.error('💥 Error fatal ejecutando el script:', err);
  process.exit(1);
});