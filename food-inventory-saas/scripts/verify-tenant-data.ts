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

async function verifyTenantData(tenantName: string) {
  if (!tenantName) {
    console.error('❌ ERROR: Debe proporcionar el nombre del tenant');
    console.log('📖 Uso: npm run verify-tenant NOMBRE_DEL_TENANT');
    console.log('📖 Ejemplo: npm run verify-tenant EARLYADOPTER');
    process.exit(1);
  }

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  
  try {
    // Step 1: Connect
    console.log('🔗 Conectando a la base de datos (modo solo lectura)...');
    await connect(MONGODB_URI);
    console.log(`✅ Conectado a: ${MONGODB_URI}`);

    // Step 2: Find and verify tenant
    console.log(`🔍 Buscando tenant '${tenantName}'...`);
    const TenantModel = model(Tenant.name, TenantSchema);
    const tenant = await TenantModel.findOne({ code: tenantName });

    if (!tenant) {
      console.error(`❌ ERROR: No se encontró ningún tenant con el nombre '${tenantName}'`);
      const allTenants = await TenantModel.find({}, { code: 1, name: 1 });
      console.log('🔍 Tenants disponibles:');
      allTenants.forEach(t => console.log(`   - ${t.code} (${t.name})`));
      process.exit(1);
    }

    const tenantId = tenant._id;
    console.log(`✅ Tenant encontrado: ${tenant.name} (ID: ${tenantId})`);
    console.log('\n🔬 MODO VERIFICACIÓN: No se eliminará ningún dato.\n');

    // Step 3: Proceed with filtered verification
    console.log('🔎 Iniciando verificación de datos a eliminar...\n');

    let totalDocsToClean = 0;
    const results: { collection: string; count: number; error?: string }[] = [];

    for (const collection of TENANT_COLLECTIONS) {
      try {
        const Model = model(collection.model.name, collection.schema);
        
        let filter: any;
        if (collection.tenantIdType === 'ObjectId') {
          filter = { tenantId: tenantId };
        } else {
          filter = { tenantId: tenantId.toString() };
        }

        // Use countDocuments instead of deleteMany
        const count = await Model.countDocuments(filter);

        console.log(`   - ${collection.name}: ${count} documentos para eliminar.`);
        
        totalDocsToClean += count;
        results.push({ collection: collection.name, count: count });

      } catch (error) {
        console.error(`   ❌ Error verificando ${collection.name}:`, error.message);
        results.push({ collection: collection.name, count: 0, error: error.message });
      }
    }

    // Step 4: Final report
    console.log('\n📊 REPORTE DE VERIFICACIÓN:');
    console.log('===========================');
    console.log(`🎯 Tenant a procesar: ${tenant.code} - ${tenant.name}`);
    console.log(`📁 Total de documentos a eliminar: ${totalDocsToClean}`);
    console.log('\n📋 Detalle por colección:');
    
    results.forEach(result => {
      if (result.error) {
        console.log(`   ❌ ${result.collection}: ERROR - ${result.error}`);
      } else {
        console.log(`   - ${result.collection}: ${result.count} documentos`);
      }
    });

    console.log('\n✅ Verificación completada. No se ha modificado ningún dato.');

  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO durante la verificación:', error);
    process.exit(1);
  } finally {
    // Step 5: Disconnect
    console.log('\n🔌 Desconectando de la base de datos...');
    await disconnect();
    console.log('✅ Desconectado exitosamente');
  }
}

const tenantName = process.argv[2];
verifyTenantData(tenantName);
