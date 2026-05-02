# PLAN DE MIGRACIÓN - MÓDULO FISCAL
## Migración Gradual Sin Downtime

**Fecha**: 14 de Noviembre de 2025
**Versión**: 1.0

---

## ÍNDICE

1. [Estrategia de Migración](#estrategia-de-migración)
2. [Preparación Pre-Migración](#preparación-pre-migración)
3. [Migración de Datos](#migración-de-datos)
4. [Activación Gradual](#activación-gradual)
5. [Rollback Plan](#rollback-plan)
6. [Monitoreo Post-Migración](#monitoreo-post-migración)

---

## ESTRATEGIA DE MIGRACIÓN

### Principio: Blue-Green Deployment

Sistema nuevo convive con sistema legacy usando **feature flags**. Migración por tenant, no todo a la vez.

```
┌─────────────────────────────────────────────────────────────┐
│                    ESTRATEGIA GENERAL                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Semana 1-2: Deploy código nuevo (flags OFF)                │
│              Sistema funciona 100% como antes                │
│                                                              │
│  Semana 3-4: Migrar datos históricos                        │
│              TaxConfigurations + backfill TaxTransactions   │
│                                                              │
│  Semana 5-6: Pilot con 3 tenants pequeños                   │
│              Activar flags, monitorear, ajustar             │
│                                                              │
│  Semana 7-8: Migración gradual (10% tenants/semana)        │
│              Monitoreo continuo, rollback si falla          │
│                                                              │
│  Semana 9-10: Migración masiva (resto de tenants)          │
│               Desactivar código legacy después             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Feature Flags

**En tenant.schema.ts**:
```typescript
featureFlags: {
  useNewTaxModule: boolean,       // Usar TaxCalculationService
  enableWithholdings: boolean,    // Calcular retenciones
  enableFiscalReports: boolean,   // Generar reportes SENIAT
}
```

**Control granular**:
- Tenant A: todos flags OFF → sistema legacy
- Tenant B: useNewTaxModule ON → cálculo nuevo, sin retenciones
- Tenant C: todos flags ON → funcionalidad completa

---

## PREPARACIÓN PRE-MIGRACIÓN

### Fase 0: Auditoría del Sistema Actual (Semana -2)

#### 1. Inventario de Datos

**Script**: `scripts/audit-current-tax-data.js`

```javascript
// Ejecutar en MongoDB

const tenants = db.tenants.find({}).toArray();
const results = [];

for (const tenant of tenants) {
  const orders = db.orders.count({ tenantId: tenant._id });
  const withIVA = db.orders.count({
    tenantId: tenant._id,
    ivaTotal: { $gt: 0 }
  });
  const withIGTF = db.orders.count({
    tenantId: tenant._id,
    igtfTotal: { $gt: 0 }
  });

  results.push({
    tenantId: tenant._id,
    tenantName: tenant.name,
    totalOrders: orders,
    ordersWithIVA: withIVA,
    ordersWithIGTF: withIGTF,
    taxRate: tenant.settings?.taxes?.ivaRate || 0.16,
  });
}

// Guardar resultados
fs.writeFileSync('audit-results.json', JSON.stringify(results, null, 2));

console.log(`✅ Auditados ${tenants.length} tenants`);
```

**Output esperado**:
```json
[
  {
    "tenantId": "507f1f77bcf86cd799439011",
    "tenantName": "Restaurant ABC",
    "totalOrders": 1250,
    "ordersWithIVA": 1200,
    "ordersWithIGTF": 45,
    "taxRate": 0.16
  }
]
```

#### 2. Backup Completo

```bash
# Backup de colecciones críticas
mongodump \
  --uri="mongodb://localhost:27017/erp" \
  --out="/backups/pre-tax-migration-$(date +%Y%m%d)" \
  --gzip

# Backup específico de colecciones fiscales
mongodump \
  --uri="mongodb://localhost:27017/erp" \
  --collection=orders \
  --collection=payments \
  --collection=products \
  --collection=tenants \
  --out="/backups/fiscal-data-$(date +%Y%m%d)" \
  --gzip
```

#### 3. Tests de Regresión

**Capturar estado actual**:

```typescript
// test/fixtures/capture-current-state.ts
import { OrdersService } from '../src/modules/orders/orders.service';

const orders = await ordersService.findAll(tenantId, { limit: 100 });

const fixtures = orders.map(order => ({
  input: {
    items: order.items,
    customerId: order.customerId,
    // ...
  },
  expectedOutput: {
    subtotal: order.subtotal,
    ivaTotal: order.ivaTotal,
    igtfTotal: order.igtfTotal,
    totalAmount: order.totalAmount,
  },
}));

fs.writeFileSync('fixtures/legacy-orders.json', JSON.stringify(fixtures, null, 2));
```

**Checklist Pre-Migración**:
- [ ] Backup completo realizado
- [ ] Audit script ejecutado
- [ ] Fixtures de regresión capturados
- [ ] Plan de rollback documentado
- [ ] Equipo de soporte notificado

---

## MIGRACIÓN DE DATOS

### Fase 1: Deploy de Código Nuevo (Semana 1)

#### Deploy Steps

```bash
# 1. Deploy backend con flags OFF
git checkout main
git pull origin main
npm install
npm run build

# 2. Correr migraciones de schemas
npm run migration:tax-schemas

# 3. Restart sin downtime (PM2)
pm2 reload ecosystem.config.js --update-env
```

#### Migration Script: Crear Schemas Nuevos

**Archivo**: `migrations/001-create-tax-schemas.ts`

```typescript
import { Connection } from 'mongoose';

export async function up(connection: Connection): Promise<void> {
  const db = connection.db;

  // Crear colecciones
  await db.createCollection('taxconfigurations');
  await db.createCollection('taxtransactions');
  await db.createCollection('withholdings');
  await db.createCollection('taxauditlogs');

  // Crear índices (mismo contenido que create-tax-indexes.js)
  await db.collection('taxconfigurations').createIndex({
    tenantId: 1,
    country: 1,
    taxType: 1,
  });
  // ... resto de índices

  console.log('✅ Tax schemas created');
}

export async function down(connection: Connection): Promise<void> {
  const db = connection.db;

  await db.dropCollection('taxconfigurations');
  await db.dropCollection('taxtransactions');
  await db.dropCollection('withholdings');
  await db.dropCollection('taxauditlogs');

  console.log('✅ Tax schemas dropped');
}
```

**Ejecutar**:
```bash
npm run migration:run
```

**Validación**:
```bash
# Verificar que sistema sigue funcionando igual
npm run test:e2e

# Verificar que nuevas colecciones existen
mongo erp --eval "db.getCollectionNames()"
```

---

### Fase 2: Seed de Configuraciones (Semana 2)

#### Script de Seed

**Archivo**: `scripts/seed-tax-configurations.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TaxConfigurationService } from '../src/modules/tax/tax-configuration.service';
import { TenantModel } from '../src/schemas/tenant.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const taxConfigService = app.get(TaxConfigurationService);
  const tenantModel = app.get('TenantModel');

  const tenants = await tenantModel.find({}).exec();

  console.log(`Seeding tax configurations for ${tenants.length} tenants...`);

  for (const tenant of tenants) {
    try {
      // Seed configuraciones default de Venezuela
      await taxConfigService.seedVenezuelaDefaults(
        tenant._id.toString(),
        tenant.ownerId.toString(),
      );

      console.log(`✅ Seeded tenant: ${tenant.name}`);
    } catch (error) {
      console.error(`❌ Error seeding tenant ${tenant.name}:`, error.message);
    }
  }

  console.log('✅ All tenants seeded');
  await app.close();
}

bootstrap();
```

**Ejecutar**:
```bash
npm run seed:tax-configs
```

**Resultado esperado**:
- Cada tenant tiene 5 configuraciones:
  - VE-IVA-GENERAL (16%)
  - VE-IVA-REDUCIDO (8%)
  - VE-IGTF-3 (3%)
  - VE-RET-IVA-75 (75%)
  - VE-RET-IVA-100 (100%)

---

### Fase 3: Backfill de Datos Históricos (Semana 3)

#### Backfill TaxTransactions desde Orders

**Archivo**: `scripts/backfill-tax-transactions.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OrderModel } from '../src/schemas/order.schema';
import { TaxTransactionModel } from '../src/schemas/tax-transaction.schema';
import { TaxConfigurationService } from '../src/modules/tax/tax-configuration.service';

async function backfillTaxTransactions() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const orderModel = app.get('OrderModel');
  const taxTransactionModel = app.get('TaxTransactionModel');
  const taxConfigService = app.get(TaxConfigurationService);

  // Procesar en batches de 100
  const batchSize = 100;
  let skip = 0;
  let processed = 0;

  while (true) {
    const orders = await orderModel
      .find({})
      .skip(skip)
      .limit(batchSize)
      .exec();

    if (orders.length === 0) break;

    for (const order of orders) {
      try {
        // Crear TaxTransaction para IVA
        if (order.ivaTotal > 0) {
          const ivaConfig = await taxConfigService.getActiveConfiguration(
            order.tenantId,
            'IVA',
            order.orderDate,
          );

          if (ivaConfig) {
            await taxTransactionModel.create({
              taxConfigurationId: ivaConfig._id,
              taxType: 'IVA',
              taxCode: ivaConfig.code,
              transactionType: 'sale',
              sourceDocumentId: order._id,
              sourceDocumentType: 'Order',
              sourceDocumentNumber: order.orderNumber,
              baseAmount: order.subtotal,
              taxRate: order.appliedIVARate || 0.16,
              taxAmount: order.ivaTotal,
              taxDate: order.orderDate,
              taxPeriod: `${order.orderDate.getFullYear()}-${(order.orderDate.getMonth() + 1).toString().padStart(2, '0')}`,
              status: 'declared', // Ya fue procesado en el pasado
              customerId: order.customerId,
              customerTaxId: order.taxInfo?.customerTaxId,
              customerName: order.customerName,
              invoiceNumber: order.taxInfo?.invoiceNumber,
              tenantId: order.tenantId,
              createdBy: order.createdBy,
            });
          }
        }

        // Crear TaxTransaction para IGTF
        if (order.igtfTotal > 0) {
          const igtfConfig = await taxConfigService.getActiveConfiguration(
            order.tenantId,
            'IGTF',
            order.orderDate,
          );

          if (igtfConfig) {
            await taxTransactionModel.create({
              taxConfigurationId: igtfConfig._id,
              taxType: 'IGTF',
              taxCode: igtfConfig.code,
              transactionType: 'financial',
              sourceDocumentId: order._id,
              sourceDocumentType: 'Order',
              sourceDocumentNumber: order.orderNumber,
              baseAmount: order.totalAmount - order.igtfTotal,
              taxRate: order.appliedIGTFRate || 0.03,
              taxAmount: order.igtfTotal,
              taxDate: order.orderDate,
              taxPeriod: `${order.orderDate.getFullYear()}-${(order.orderDate.getMonth() + 1).toString().padStart(2, '0')}`,
              status: 'declared',
              customerId: order.customerId,
              tenantId: order.tenantId,
              createdBy: order.createdBy,
            });
          }
        }

        processed++;
      } catch (error) {
        console.error(`Error processing order ${order.orderNumber}:`, error.message);
      }
    }

    skip += batchSize;
    console.log(`Processed ${processed} orders...`);
  }

  console.log(`✅ Backfill complete: ${processed} orders processed`);
  await app.close();
}

backfillTaxTransactions();
```

**Ejecutar**:
```bash
npm run backfill:tax-transactions
```

**Validación**:
```javascript
// Verificar que cantidades cuadran
const totalIVAOrders = db.orders.aggregate([
  { $group: { _id: null, total: { $sum: '$ivaTotal' } } }
]);

const totalIVATaxTransactions = db.taxtransactions.aggregate([
  { $match: { taxType: 'IVA' } },
  { $group: { _id: null, total: { $sum: '$taxAmount' } } }
]);

// Deben ser iguales
console.assert(
  totalIVAOrders[0].total === totalIVATaxTransactions[0].total,
  'IVA totals mismatch!'
);
```

---

## ACTIVACIÓN GRADUAL

### Fase 4: Pilot (Semana 5-6)

#### Selección de Tenants Pilot

**Criterios**:
- Volumen bajo-medio (< 100 órdenes/mes)
- Operaciones simples (sin casos edge)
- Usuario técnico disponible para feedback

**Script de Activación**:

```typescript
// scripts/enable-pilot-tenants.ts
const pilotTenants = [
  'tenant-restaurant-1',
  'tenant-retail-1',
  'tenant-services-1',
];

for (const tenantId of pilotTenants) {
  await db.tenants.updateOne(
    { _id: ObjectId(tenantId) },
    {
      $set: {
        'featureFlags.useNewTaxModule': true,
        'featureFlags.enableWithholdings': false,  // Aún no
        'featureFlags.enableFiscalReports': false,
      }
    }
  );
}

console.log(`✅ Pilot enabled for ${pilotTenants.length} tenants`);
```

#### Monitoreo Intensivo

**Dashboard de Pilot** (Grafana + Prometheus):

Métricas a monitorear:
- Latencia de cálculo de impuestos (p50, p95, p99)
- Errores en TaxCalculationService
- Diferencias entre cálculo legacy vs nuevo
- Quejas de usuarios

**Script de Comparación**:

```typescript
// Comparar resultados cada hora
setInterval(async () => {
  const recentOrders = await orderModel
    .find({ tenantId: { $in: pilotTenants }, createdAt: { $gte: new Date(Date.now() - 3600000) } })
    .exec();

  for (const order of recentOrders) {
    // Recalcular con ambos métodos
    const legacyIVA = order.subtotal * 0.16;
    const newIVA = order.ivaTotal; // Ya calculado con nuevo sistema

    if (Math.abs(legacyIVA - newIVA) > 0.01) {
      console.error(`⚠️ Mismatch en orden ${order.orderNumber}: legacy=${legacyIVA}, new=${newIVA}`);
      // Alertar equipo
    }
  }
}, 3600000);
```

**Criterios de Éxito Pilot**:
- [ ] 0 errores fatales en 2 semanas
- [ ] Diferencias <0.01 en 99.9% de órdenes
- [ ] Performance aceptable (<100ms overhead)
- [ ] Feedback positivo de usuarios

---

### Fase 5: Migración Gradual (Semana 7-10)

#### Estrategia: 10% por Semana

```
Semana 7:  10% de tenants (los más pequeños)
Semana 8:  +20% de tenants (pequeños-medianos)
Semana 9:  +30% de tenants (medianos)
Semana 10: +40% restante (incluye grandes)
```

**Script de Migración Batch**:

```typescript
// scripts/migrate-batch.ts
async function migrateBatch(percentage: number) {
  // Obtener tenants que aún usan legacy
  const legacyTenants = await tenantModel
    .find({ 'featureFlags.useNewTaxModule': { $ne: true } })
    .sort({ 'metrics.monthlyOrders': 1 })  // Empezar por los pequeños
    .exec();

  const count = Math.ceil(legacyTenants.length * (percentage / 100));
  const batch = legacyTenants.slice(0, count);

  console.log(`Migrating ${batch.length} tenants (${percentage}%)...`);

  for (const tenant of batch) {
    await tenantModel.updateOne(
      { _id: tenant._id },
      { $set: { 'featureFlags.useNewTaxModule': true } }
    );

    console.log(`✅ Migrated: ${tenant.name}`);

    // Esperar 5 segundos entre migraciones para no saturar
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log(`✅ Batch migration complete`);
}

// Ejecutar
migrateBatch(10);
```

**Monitoreo Continuo**:
- Error rate por tenant
- Si error rate de un tenant >1%, pausar migración
- Revisar logs, corregir, reintentar

---

## ROLLBACK PLAN

### Trigger de Rollback

**Rollback automático si**:
- Error rate >5% en cualquier tenant
- Diferencia >1% en totales fiscales
- Más de 3 quejas de usuarios en 1 hora

### Procedimiento de Rollback

#### Opción 1: Rollback de Feature Flag (Inmediato)

```typescript
// Desactivar para un tenant específico
await tenantModel.updateOne(
  { _id: tenantId },
  { $set: { 'featureFlags.useNewTaxModule': false } }
);

// Desactivar para TODOS (emergencia)
await tenantModel.updateMany(
  {},
  { $set: { 'featureFlags.useNewTaxModule': false } }
);
```

**Efecto**: Sistema vuelve a lógica legacy inmediatamente, sin restart.

#### Opción 2: Rollback de Código (1 hora)

```bash
# Rollback a versión anterior
git revert HEAD~3
npm install
npm run build
pm2 reload all
```

#### Opción 3: Restaurar desde Backup (2 horas)

```bash
# Restaurar colecciones
mongorestore \
  --uri="mongodb://localhost:27017/erp" \
  --gzip \
  --drop \
  /backups/pre-tax-migration-20250114/

# Verificar integridad
mongo erp --eval "db.orders.count()"
```

---

## MONITOREO POST-MIGRACIÓN

### Métricas Clave (Primeros 30 Días)

#### 1. Performance

```sql
-- Prometheus queries
histogram_quantile(0.95, rate(tax_calculation_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(tax_calculation_duration_seconds_bucket[5m]))
```

**Alertas**:
- P95 > 500ms: Warning
- P99 > 1000ms: Critical

#### 2. Accuracy

```typescript
// Script diario de reconciliación
const differences = await db.orders.aggregate([
  {
    $lookup: {
      from: 'taxtransactions',
      localField: '_id',
      foreignField: 'sourceDocumentId',
      as: 'taxTransactions'
    }
  },
  {
    $project: {
      orderNumber: 1,
      ivaTotal: 1,
      calculatedIVA: { $sum: '$taxTransactions.taxAmount' },
      diff: { $abs: { $subtract: ['$ivaTotal', { $sum: '$taxTransactions.taxAmount' }] } }
    }
  },
  { $match: { diff: { $gt: 0.01 } } }
]);

if (differences.length > 0) {
  console.error(`⚠️ Found ${differences.length} orders with tax mismatches`);
  // Alertar
}
```

#### 3. Errores

```typescript
// Logs de errores fiscales
const errorRate = await db.taxauditlogs
  .count({
    timestamp: { $gte: new Date(Date.now() - 86400000) },
    severity: { $in: ['error', 'critical'] }
  });

if (errorRate > 10) {
  console.error(`⚠️ High error rate: ${errorRate} errors in last 24h`);
}
```

### Dashboard Post-Migración

**Grafana Dashboard**: Tax Module Health

Panels:
1. Tenants migrados vs legacy (gauge)
2. Tax calculation latency (graph)
3. Error rate por tenant (heatmap)
4. Diferencias detected (counter)
5. Audit log volume (graph)

---

## CHECKLIST COMPLETO

### Pre-Migración
- [ ] Backup completo realizado
- [ ] Audit de datos actual ejecutado
- [ ] Fixtures de regresión capturados
- [ ] Tests de regresión pasan 100%
- [ ] Plan de rollback documentado
- [ ] Equipo notificado

### Migración
- [ ] Deploy de código (flags OFF)
- [ ] Schemas creados
- [ ] Índices creados
- [ ] Seed de configuraciones
- [ ] Backfill de datos históricos
- [ ] Validación de backfill OK

### Pilot
- [ ] 3 tenants pilot seleccionados
- [ ] Feature flags activados para pilot
- [ ] Monitoreo intensivo configurado
- [ ] 2 semanas sin errores críticos
- [ ] Feedback positivo de usuarios

### Migración Gradual
- [ ] Semana 1: 10% migrados
- [ ] Semana 2: 30% migrados
- [ ] Semana 3: 60% migrados
- [ ] Semana 4: 100% migrados

### Post-Migración
- [ ] Monitoreo configurado
- [ ] Dashboard operativo
- [ ] Alertas funcionando
- [ ] Documentación actualizada
- [ ] Código legacy deprecado

---

**Siguiente**: [ROADMAP_TESTING_STRATEGY.md](./ROADMAP_TESTING_STRATEGY.md)
