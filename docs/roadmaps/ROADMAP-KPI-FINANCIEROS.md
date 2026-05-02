# ROADMAP: Implementacion de KPIs Financieros - Smartkubik ERP

> Documento de referencia para implementacion completa.
> Ultima actualizacion: 2026-02-02

---

## ARQUITECTURA DEL PROYECTO

### Tech Stack
- **Backend:** NestJS 10 + MongoDB (Mongoose ODM) + Redis + BullMQ
- **Frontend:** React 18 + Vite + Tailwind CSS 4 + Shadcn/ui + Recharts
- **Auth:** JWT con guards (JwtAuthGuard, TenantGuard, PermissionsGuard)
- **Multi-tenant:** Cada query filtrada por `tenantId`

### Archivos Clave (Backend)
| Archivo | Ruta | Descripcion |
|---------|------|-------------|
| Analytics Service | `src/modules/analytics/analytics.service.ts` | Servicio principal de analiticas. Aqui van los nuevos metodos de KPIs |
| Analytics Controller | `src/modules/analytics/analytics.controller.ts` | Endpoints REST. Agregar nuevos GET aqui |
| Analytics Module | `src/modules/analytics/analytics.module.ts` | Registra schemas de Mongoose y providers |
| Chart of Accounts Schema | `src/schemas/chart-of-accounts.schema.ts` | Plan de cuentas (tipos: Activo, Pasivo, Patrimonio, Ingreso, Gasto) |
| Order Schema | `src/schemas/order.schema.ts` | Ordenes con items, costPrice, totalAmount, margins |
| Inventory Schema | `src/schemas/inventory.schema.ts` | Stock con metrics.turnoverRate, daysOnHand |
| Payable Schema | `src/schemas/payable.schema.ts` | Cuentas por pagar (gastos) |
| Payment Schema | `src/schemas/payment.schema.ts` | Pagos recibidos |
| Journal Entry Schema | `src/schemas/journal-entry.schema.ts` | Asientos contables con debito/credito |
| Customer Schema | `src/schemas/customer.schema.ts` | Clientes con metrics.averageOrderValue, totalSpent |
| PayrollRun Schema | `src/schemas/payroll-run.schema.ts` | Corridas de nomina |

### Archivos Clave (Frontend)
| Archivo | Ruta | Descripcion |
|---------|------|-------------|
| API wrapper | `food-inventory-admin/src/lib/api.js` | `fetchApi(url, options)` - wrapper de fetch con JWT |
| Dashboard hook | `food-inventory-admin/src/hooks/use-dashboard-charts.js` | Hook que carga data de charts |
| DashboardView | `food-inventory-admin/src/components/DashboardView.jsx` | Vista principal del dashboard |
| Chart base | `food-inventory-admin/src/components/charts/BaseChart.jsx` | ChartCard, ChartSkeleton, ChartEmptyState |
| App/Router | `food-inventory-admin/src/App.jsx` | Router principal con todas las rutas |

### Patrones Criticos a Seguir

**Backend - Nuevo endpoint:**
```typescript
// En analytics.controller.ts
@Get("mi-nuevo-kpi")
@Permissions("reports_read")
async getMiNuevoKpi(@Req() req, @Query() query: AnalyticsPeriodQueryDto) {
  const data = await this.analyticsService.miNuevoMetodo(
    req.user.tenantId,
    query.period,
  );
  return { success: true, data };
}
```

**Backend - Nuevo metodo en service:**
```typescript
// En analytics.service.ts
async miNuevoMetodo(tenantId: string, period?: string) {
  const { objectId: tenantObjectId, key: tenantKey } =
    this.normalizeTenantIdentifiers(tenantId);
  const { from, to, groupBy } = this.buildDateRange(period);
  // ... logica de agregacion MongoDB
}
```

**Frontend - Consumir endpoint:**
```javascript
// Desde cualquier componente
import { fetchApi } from '@/lib/api';
const response = await fetchApi(`/analytics/mi-nuevo-kpi?period=${period}`);
const data = response.data; // El backend retorna { success: true, data: {...} }
```

**Agregar nuevo schema al module:**
```typescript
// En analytics.module.ts, dentro de MongooseModule.forFeature([...])
{ name: NuevoSchema.name, schema: NuevoSchemaSchema },
```

---

## FASE 1: KPIs con Data Existente (Implementacion Directa)

### 1.1 Endpoint Unificado de KPIs Financieros

**Archivo a modificar:** `src/modules/analytics/analytics.service.ts`
**Endpoint:** `GET /analytics/financial-kpis?period=30d`

Este endpoint retorna TODOS los KPIs financieros en una sola llamada para minimizar requests.

### 1.2 Ticket Promedio

**Formula:** `totalRevenue / totalOrders` (por periodo)
**Tambien:** Por cliente: `customer.metrics.totalSpent / customer.metrics.totalOrders`

**Data disponible:**
- `Order.totalAmount` - monto de cada orden
- `Customer.metrics.averageOrderValue` - ya existe en el schema
- `Customer.metrics.totalSpent` y `Customer.metrics.totalOrders`

**Implementacion backend:**
```typescript
// Aggregation pipeline
const result = await this.orderModel.aggregate([
  { $match: { tenantId: tenantKey, status: { $nin: ['draft','cancelled','refunded'] }, createdAt: { $gte: from, $lte: to } } },
  { $group: {
    _id: null,
    totalRevenue: { $sum: '$totalAmount' },
    totalOrders: { $sum: 1 },
    avgTicket: { $avg: '$totalAmount' },
    maxTicket: { $max: '$totalAmount' },
    minTicket: { $min: '$totalAmount' },
  }},
]);
```

**Tambien por periodo (trend):**
```typescript
// Agrupar por dia/mes segun groupBy
{ $group: {
  _id: { $dateToString: { format, date: '$createdAt' } },
  avgTicket: { $avg: '$totalAmount' },
  orderCount: { $sum: 1 },
  totalRevenue: { $sum: '$totalAmount' },
}}
```

### 1.3 Margen Bruto

**Formula:** `((ingresos - costos_directos_variables) / ingresos) * 100`

**Data disponible:**
- `OrderItem.totalPrice` o `OrderItem.finalPrice` - precio de venta
- `OrderItem.costPrice` - costo directo del producto
- `Order.metrics.totalMargin` y `Order.metrics.marginPercentage` - YA EXISTEN

**Implementacion backend:**
```typescript
const result = await this.orderModel.aggregate([
  { $match: { tenantId: tenantKey, status: { $nin: ['draft','cancelled','refunded'] }, createdAt: { $gte: from, $lte: to } } },
  { $unwind: '$items' },
  { $group: {
    _id: null,
    totalRevenue: { $sum: { $ifNull: ['$items.finalPrice', '$items.totalPrice'] } },
    totalCost: { $sum: { $multiply: [{ $ifNull: ['$items.costPrice', 0] }, '$items.quantity'] } },
  }},
  { $project: {
    totalRevenue: 1,
    totalCost: 1,
    grossProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
    grossMarginPercent: {
      $cond: [{ $gt: ['$totalRevenue', 0] },
        { $multiply: [{ $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalRevenue'] }, 100] },
        0
      ]
    }
  }},
]);
```

### 1.4 Margen de Contribucion

**Formula:** `((ingresos - deducciones - costos_directos) / ingresos) * 100`

**Diferencia con Margen Bruto:** Incluye deducciones (descuentos, devoluciones).

**Data disponible:**
- `Order.discountAmount` - descuentos aplicados
- `Order.items[].discountAmount` - descuentos por item
- `OrderItem.costPrice` - costo directo

**Implementacion:** Igual que margen bruto pero restando `discountAmount` de los ingresos.

### 1.5 Rotacion de Inventario

**Formula:** `productos_vendidos / stock_promedio`

**Data disponible:**
- `Inventory.metrics.turnoverRate` - YA EXISTE en el schema
- `Inventory.metrics.daysOnHand` - YA EXISTE
- `Inventory.metrics.averageDailySales` - YA EXISTE
- `InventoryMovement` - movimientos IN/OUT con cantidades

**Implementacion:** Leer los metrics existentes del inventario y complementar con aggregation de movimientos.

```typescript
// Rotacion general del negocio
const inventoryMetrics = await this.inventoryModel.aggregate([
  { $match: { tenantId: tenantObjectId, isActive: true } },
  { $group: {
    _id: null,
    avgTurnoverRate: { $avg: '$metrics.turnoverRate' },
    avgDaysOnHand: { $avg: '$metrics.daysOnHand' },
    totalStockValue: { $sum: { $multiply: ['$totalQuantity', '$averageCostPrice'] } },
    totalItems: { $sum: '$totalQuantity' },
    lowStockCount: { $sum: { $cond: ['$alerts.lowStock', 1, 0] } },
    nearExpirationCount: { $sum: { $cond: ['$alerts.nearExpiration', 1, 0] } },
  }},
]);

// Rotacion por producto (top movers y slow movers)
const productRotation = await this.inventoryModel.aggregate([
  { $match: { tenantId: tenantObjectId, isActive: true } },
  { $project: {
    productName: 1, productSku: 1,
    turnoverRate: '$metrics.turnoverRate',
    daysOnHand: '$metrics.daysOnHand',
    totalQuantity: 1, averageCostPrice: 1,
    stockValue: { $multiply: ['$totalQuantity', '$averageCostPrice'] },
  }},
  { $sort: { turnoverRate: -1 } },
  { $limit: 20 },
]);
```

---

## FASE 2: KPIs que Requieren Ajustes Menores

### 2.1 Clasificacion Fijo/Variable en Chart of Accounts

**Archivo a modificar:** `src/schemas/chart-of-accounts.schema.ts`

**Cambio requerido:** Agregar campo `costBehavior` al schema.

```typescript
// AGREGAR al schema ChartOfAccounts:
@Prop({ type: String, enum: ['fixed', 'variable', 'mixed', null], default: null })
costBehavior?: string;

// AGREGAR campo para subcategorizar circulante/no circulante
@Prop({ type: String, enum: ['current', 'non_current', null], default: null })
liquidityClass?: string;
```

**IMPORTANTE:** Este cambio NO rompe nada existente porque:
- Ambos campos son opcionales (default: null)
- MongoDB es schemaless, los documentos existentes simplemente no tendran estos campos
- No se requiere migracion

### 2.2 Costos Fijos vs Variables

**Formula:** Sumar payables/journal entries agrupados por el `costBehavior` de su cuenta contable.

**Implementacion backend:**
```typescript
async getFixedVsVariableCosts(tenantId: string, period?: string) {
  const { objectId, key: tenantKey } = this.normalizeTenantIdentifiers(tenantId);
  const { from, to, groupBy } = this.buildDateRange(period);

  // Obtener cuentas de tipo Gasto con su clasificacion
  const expenseAccounts = await this.chartOfAccountsModel.find({
    tenantId: tenantKey, type: 'Gasto',
  }).lean();

  const fixedAccountIds = expenseAccounts
    .filter(a => a.costBehavior === 'fixed').map(a => a._id);
  const variableAccountIds = expenseAccounts
    .filter(a => a.costBehavior === 'variable').map(a => a._id);

  // Sumar journal entries por tipo
  const fixedCosts = await this.journalEntryModel.aggregate([
    { $match: { tenantId: tenantKey, date: { $gte: from, $lte: to } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: fixedAccountIds } } },
    { $group: { _id: null, total: { $sum: '$lines.debit' } } },
  ]);

  const variableCosts = await this.journalEntryModel.aggregate([
    { $match: { tenantId: tenantKey, date: { $gte: from, $lte: to } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: variableAccountIds } } },
    { $group: { _id: null, total: { $sum: '$lines.debit' } } },
  ]);

  // Alternativa: usar payables agrupados por tipo
  const payablesByType = await this.payableModel.aggregate([
    { $match: { tenantId: tenantKey, issueDate: { $gte: from, $lte: to },
      status: { $in: ['open','partially_paid','paid'] } } },
    { $group: {
      _id: '$type',
      total: { $sum: '$totalAmount' },
      count: { $sum: 1 },
    }},
  ]);

  return { fixedCosts, variableCosts, payablesByType };
}
```

### 2.3 Margen Neto

**Formula:** `(ingresos_netos / ventas_totales) * 100`

Donde ingresos_netos = ventas - TODOS los gastos (operativos + nomina + impuestos + etc.)

**Implementacion:** Cruzar datos de:
1. `Order` (ingresos totales)
2. `Payable` (gastos operativos)
3. `PayrollRun` (gastos de nomina)
4. `JournalEntry` (cualquier otro gasto contabilizado)

```typescript
async getNetMargin(tenantId: string, period?: string) {
  const { key: tenantKey } = this.normalizeTenantIdentifiers(tenantId);
  const { from, to } = this.buildDateRange(period);

  // 1. Ingresos totales (ordenes completadas)
  const [revenueResult] = await this.orderModel.aggregate([
    { $match: { tenantId: tenantKey, status: { $nin: ['draft','cancelled','refunded'] },
      createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  // 2. Gastos operativos (payables)
  const [expenseResult] = await this.payableModel.aggregate([
    { $match: { tenantId: tenantKey,
      status: { $in: ['open','partially_paid','paid'] },
      issueDate: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  // 3. Gastos de nomina (payroll runs)
  const [payrollResult] = await this.payrollRunModel.aggregate([
    { $match: { tenantId: tenantKey,
      periodStart: { $gte: from }, periodEnd: { $lte: to } } },
    { $group: { _id: null, total: { $sum: '$summary.totalNetPay' } } },
  ]);

  const totalRevenue = revenueResult?.total ?? 0;
  const totalExpenses = (expenseResult?.total ?? 0) + (payrollResult?.total ?? 0);
  const netIncome = totalRevenue - totalExpenses;
  const netMarginPercent = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  return { totalRevenue, totalExpenses, netIncome, netMarginPercent };
}
```

**NOTA:** Para agregar PayrollRun al analytics module:
```typescript
// En analytics.module.ts, agregar:
import { PayrollRun, PayrollRunSchema } from '../../schemas/payroll-run.schema';
// En MongooseModule.forFeature([...]):
{ name: PayrollRun.name, schema: PayrollRunSchema },
// En analytics.service.ts constructor:
@InjectModel(PayrollRun.name) private readonly payrollRunModel: Model<PayrollRunDocument>,
```

### 2.4 Punto de Equilibrio

**Formula:** `gastos_fijos / margen_de_contribucion_porcentual`

Resultado = monto en USD que la empresa necesita vender para cubrir costos.

```typescript
async getBreakEvenPoint(tenantId: string, period?: string) {
  // Reutilizar los metodos anteriores
  const costs = await this.getFixedVsVariableCosts(tenantId, period);
  const margins = await this.getContributionMargin(tenantId, period);

  const fixedCosts = costs.fixedCosts;
  const contributionMarginPercent = margins.contributionMarginPercent;

  const breakEvenRevenue = contributionMarginPercent > 0
    ? fixedCosts / (contributionMarginPercent / 100)
    : 0;

  // Tambien calcular en unidades (ticket promedio)
  const ticketData = await this.getAverageTicket(tenantId, period);
  const breakEvenUnits = ticketData.avgTicket > 0
    ? Math.ceil(breakEvenRevenue / ticketData.avgTicket)
    : 0;

  return {
    breakEvenRevenue,
    breakEvenUnits,
    fixedCosts,
    contributionMarginPercent,
    currentRevenue: margins.totalRevenue,
    surplusOrDeficit: margins.totalRevenue - breakEvenRevenue,
    isAboveBreakEven: margins.totalRevenue >= breakEvenRevenue,
  };
}
```

### 2.5 Liquidez Actual

**Formula:** `activos_circulantes / pasivos_circulantes`

**Implementacion:** Requiere el campo `liquidityClass` agregado en 2.1.

```typescript
async getCurrentLiquidity(tenantId: string) {
  const { key: tenantKey } = this.normalizeTenantIdentifiers(tenantId);

  // Activos circulantes: cuentas tipo 'Activo' con liquidityClass 'current'
  const currentAssetAccounts = await this.chartOfAccountsModel.find({
    tenantId: tenantKey, type: 'Activo', liquidityClass: 'current',
  }).lean();

  // Pasivos circulantes: cuentas tipo 'Pasivo' con liquidityClass 'current'
  const currentLiabilityAccounts = await this.chartOfAccountsModel.find({
    tenantId: tenantKey, type: 'Pasivo', liquidityClass: 'current',
  }).lean();

  // Sumar saldos desde journal entries
  // ... (aggregation similar a costos fijos/variables)

  // Alternativa practica: usar datos operativos directos
  // Activos circulantes = efectivo en caja + cuentas por cobrar + inventario valorado
  // Pasivos circulantes = cuentas por pagar pendientes

  const [cashAndReceivables] = await this.orderModel.aggregate([
    { $match: { tenantId: tenantKey, paymentStatus: { $in: ['pending','partial'] } } },
    { $group: { _id: null, totalReceivable: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } },
  ]);

  const [inventoryValue] = await this.inventoryModel.aggregate([
    { $match: { tenantId: tenantObjectId, isActive: true } },
    { $group: { _id: null, total: { $sum: { $multiply: ['$totalQuantity', '$averageCostPrice'] } } } },
  ]);

  const [currentPayables] = await this.payableModel.aggregate([
    { $match: { tenantId: tenantKey, status: { $in: ['open','partially_paid'] },
      dueDate: { $lte: oneYearFromNow } } },
    { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } },
  ]);

  const currentAssets = (cashAndReceivables?.totalReceivable ?? 0) + (inventoryValue?.total ?? 0);
  const currentLiabilities = currentPayables?.total ?? 0;
  const liquidityRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : null;

  return { currentAssets, currentLiabilities, liquidityRatio };
}
```

---

## FASE 3: KPIs que Requieren Modelo Nuevo

### 3.1 EBITDA - Crear schema de Activos Fijos

**Archivo nuevo:** `src/schemas/fixed-asset.schema.ts`

```typescript
@Schema({ timestamps: true })
export class FixedAsset {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: String, required: true, enum: ['equipment','vehicle','furniture','building','technology','other'] })
  assetType: string;

  @Prop({ type: Number, required: true })
  acquisitionCost: number;

  @Prop({ type: Date, required: true })
  acquisitionDate: Date;

  @Prop({ type: Number, required: true })
  usefulLifeMonths: number;

  @Prop({ type: Number, default: 0 })
  residualValue: number;

  @Prop({ type: String, enum: ['straight_line','declining_balance'], default: 'straight_line' })
  depreciationMethod: string;

  @Prop({ type: Number, default: 0 })
  accumulatedDepreciation: number;

  @Prop({ type: String, enum: ['active','disposed','fully_depreciated'], default: 'active' })
  status: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;
}
```

**Formula EBITDA:**
```
EBITDA = Utilidad Operativa + Depreciacion + Amortizacion
       = (Ingresos - Gastos Operativos) + Depreciacion Mensual
```

**Implementacion:**
```typescript
async getEbitda(tenantId: string, period?: string) {
  // 1. Utilidad operativa (ya la tenemos del P&L)
  const pnl = await this.getProfitAndLoss(tenantId, period);

  // 2. Depreciacion del periodo
  const assets = await this.fixedAssetModel.find({
    tenantId, status: 'active',
  }).lean();

  let totalMonthlyDepreciation = 0;
  for (const asset of assets) {
    if (asset.depreciationMethod === 'straight_line') {
      const depreciable = asset.acquisitionCost - asset.residualValue;
      totalMonthlyDepreciation += depreciable / asset.usefulLifeMonths;
    }
  }

  const months = periodToMonths(period); // helper
  const periodDepreciation = totalMonthlyDepreciation * months;

  const operatingIncome = pnl.summary.netIncome;
  const ebitda = operatingIncome + periodDepreciation;
  const ebitdaMargin = pnl.summary.revenueTotal > 0
    ? (ebitda / pnl.summary.revenueTotal) * 100 : 0;

  return { ebitda, ebitdaMargin, operatingIncome, periodDepreciation };
}
```

### 3.2 ROI - Crear schema de Inversiones

**Archivo nuevo:** `src/schemas/investment.schema.ts`

```typescript
@Schema({ timestamps: true })
export class Investment {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: String, required: true, enum: ['marketing','equipment','technology','expansion','inventory','other'] })
  category: string;

  @Prop({ type: Number, required: true })
  investedAmount: number;

  @Prop({ type: Date, required: true })
  investmentDate: Date;

  @Prop({ type: Date })
  expectedReturnDate: Date;

  @Prop({ type: Number, default: 0 })
  expectedReturn: number;

  @Prop({ type: Number, default: 0 })
  actualReturn: number;

  @Prop({ type: String, enum: ['active','completed','cancelled'], default: 'active' })
  status: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;
}
```

**Formula ROI:**
```
ROI = ((ganancias - valor_inversion) / valor_inversion) * 100
```

---

## FASE 4: Frontend - Dashboard de KPIs Financieros

### 4.1 Hook de KPIs Financieros

**Archivo nuevo:** `food-inventory-admin/src/hooks/use-financial-kpis.js`

```javascript
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

const EMPTY_STATE = {
  avgTicket: null,
  grossMargin: null,
  contributionMargin: null,
  netMargin: null,
  inventoryTurnover: null,
  fixedVsVariable: null,
  breakEven: null,
  liquidity: null,
  ebitda: null,
  roi: null,
};

export function useFinancialKpis(period = '30d') {
  const [data, setData] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetchApi(`/analytics/financial-kpis?period=${period}`);
        if (active) setData(res.data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [period]);

  return { data, loading, error };
}
```

### 4.2 Componente FinancialKpisDashboard

**Archivo nuevo:** `food-inventory-admin/src/components/charts/FinancialKpisDashboard.jsx`

Este componente muestra cards con cada KPI y charts de tendencia.

**Estructura del componente:**
```
FinancialKpisDashboard
  +-- KpiSummaryCards (cards superiores con numeros grandes)
  |     +-- AvgTicketCard
  |     +-- GrossMarginCard
  |     +-- NetMarginCard
  |     +-- LiquidityCard
  +-- MarginsTrendChart (LineChart con margen bruto, contribucion, neto en el tiempo)
  +-- CostBreakdownChart (PieChart costos fijos vs variables)
  +-- BreakEvenGauge (indicador visual de punto de equilibrio vs ventas actuales)
  +-- InventoryTurnoverTable (tabla de rotacion por producto)
```

**Patron de card KPI:**
```jsx
import { ChartCard } from './BaseChart';
// Cada KPI card muestra:
// - Nombre del KPI
// - Valor grande
// - Indicador de status (good/warning/danger)
// - Trend vs periodo anterior (flecha arriba/abajo)
// - Mini sparkline opcional
```

### 4.3 Integracion con Router

**Archivo a modificar:** `food-inventory-admin/src/App.jsx`

Agregar ruta nueva o tab dentro del dashboard existente.

**Opcion recomendada:** Agregar como tab dentro de `AccountingDashboard.jsx` o como seccion del `DashboardView.jsx`.

---

## ORDEN DE IMPLEMENTACION (Paso a Paso)

### Paso 1: Backend - Servicio de KPIs Financieros
1. Modificar `chart-of-accounts.schema.ts` - agregar campos `costBehavior` y `liquidityClass`
2. Crear nuevo metodo `getFinancialKpis()` en `analytics.service.ts` que calcule todos los KPIs
3. Agregar endpoint `GET /analytics/financial-kpis` en `analytics.controller.ts`
4. Registrar schemas adicionales en `analytics.module.ts` (ChartOfAccounts, JournalEntry, PayrollRun)

### Paso 2: Backend - Modelos Nuevos (EBITDA y ROI)
5. Crear `fixed-asset.schema.ts`
6. Crear `investment.schema.ts`
7. Crear `fixed-assets.module.ts` con CRUD basico
8. Crear `investments.module.ts` con CRUD basico
9. Integrar en analytics para calculos de EBITDA y ROI

### Paso 3: Frontend - Visualizacion
10. Crear hook `use-financial-kpis.js`
11. Crear componente `FinancialKpisDashboard.jsx`
12. Integrar con el router/dashboard existente
13. Agregar al `use-dashboard-charts.js` si se quiere como seccion del dashboard principal

---

## NOTAS PARA CONTINUACION CON OTRA IA

Si necesitas continuar la implementacion con Gemini u otra IA:

1. **SIEMPRE lee el archivo completo antes de modificarlo.** No asumas el contenido.
2. **El backend usa NestJS con Mongoose.** No uses TypeORM, Prisma, ni SQL.
3. **Cada query DEBE filtrar por `tenantId`.** Es un sistema multi-tenant.
4. **Los endpoints requieren `@Permissions("reports_read")`** y los tres guards.
5. **El frontend usa `fetchApi()` de `@/lib/api`**, no axios directamente.
6. **Los charts usan Recharts** (LineChart, BarChart, PieChart, etc.)
7. **Los componentes UI base estan en `@/components/ui/`** y siguen el patron Shadcn/ui.
8. **MongoDB ObjectId:** El tenantId a veces es string, a veces ObjectId. Usa `normalizeTenantIdentifiers()` para obtener ambos formatos.
9. **Feature flags:** Los reportes avanzados requieren `ADVANCED_REPORTS` o `DASHBOARD_CHARTS` habilitado.
10. **Moneda:** El sistema maneja USD como moneda principal, VES como secundaria. Los montos se guardan en USD.

### Archivos que se modificaron/crearon en esta implementacion:

**ESTADO: IMPLEMENTACION COMPLETA (Fase 1-3 backend + frontend)**

**Backend (en `FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src/`):**
- `schemas/chart-of-accounts.schema.ts` - MODIFICADO: campos `costBehavior` (fixed/variable/mixed) y `liquidityClass` (current/non_current) agregados
- `schemas/fixed-asset.schema.ts` - NUEVO: schema para activos fijos con depreciacion (straight_line/declining_balance)
- `schemas/investment.schema.ts` - NUEVO: schema para inversiones por categoria con ROI tracking
- `modules/analytics/analytics.service.ts` - MODIFICADO: metodo `getFinancialKpis()` que calcula los 10 KPIs en paralelo con 14 aggregations MongoDB. Tambien `groupInvestmentsByCategory()` helper
- `modules/analytics/analytics.controller.ts` - MODIFICADO: endpoint `GET /analytics/financial-kpis` con permission `reports_read`
- `modules/analytics/analytics.module.ts` - MODIFICADO: 6 nuevos schemas registrados (ChartOfAccounts, JournalEntry, PayrollRun, FixedAsset, Investment, Payment)

**Frontend (en `FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/`):**
- `hooks/use-financial-kpis.js` - NUEVO: hook con `useFinancialKpis(period)` que retorna {data, loading, error, reload}
- `components/charts/FinancialKpisDashboard.jsx` - NUEVO: componente completo con:
  - 5 KpiCards (Ticket Promedio, Margen Bruto, Margen Neto, Liquidez, EBITDA)
  - MarginsComparison (BarChart horizontal)
  - CostBreakdownPie (PieChart costos fijos vs variables)
  - BreakEvenGauge (barra de progreso visual con punto de equilibrio)
  - TicketTrendChart (LineChart de tendencia)
  - InventoryTurnoverTable (tabla con top 10 productos)
  - ROI card con desglose por categoria
- `components/DashboardView.jsx` - MODIFICADO: import + `<FinancialKpisDashboard period={period} />` integrado despues de la seccion ADVANCED_REPORTS

**Endpoint API creado:**
```
GET /api/v1/analytics/financial-kpis?period=30d
Authorization: Bearer <token>

Response: {
  success: true,
  data: {
    period: { from, to, days, label },
    avgTicket: { value, totalRevenue, orderCount, maxTicket, minTicket, trend[] },
    grossMargin: { totalRevenue, totalDirectCost, grossProfit, grossMarginPercent, status },
    contributionMargin: { totalRevenue, totalDiscounts, totalDirectCost, contributionMargin, contributionMarginPercent },
    fixedVsVariable: { fixedCosts, variableCosts, unclassifiedCosts, totalCosts, breakdown, payrollDetail },
    netMargin: { totalRevenue, totalExpenses, operationalExpenses, payrollExpenses, netIncome, netMarginPercent, status },
    breakEven: { breakEvenRevenue, breakEvenUnits, fixedCosts, contributionMarginPercent, currentRevenue, surplusOrDeficit, isAboveBreakEven, coveragePercent },
    inventoryTurnover: { avgTurnoverRate, avgDaysOnHand, totalStockValue, totalItems, productCount, lowStockCount, nearExpirationCount, topProducts[] },
    liquidity: { currentAssets, currentLiabilities, liquidityRatio, components, status },
    ebitda: { ebitda, ebitdaMargin, operatingIncome, periodDepreciation, monthlyDepreciation, assetsCount, totalAssetValue, hasFixedAssets },
    roi: { totalInvested, totalReturn, netGain, roiPercent, investmentCount, hasInvestments, byCategory[] },
  }
}
```

### Actualizacion 2026-02-02 (v2.1):

**Completado:**
- KPIs Financieros movidos arriba de "Insights del negocio" en DashboardView
- KPIs Financieros ahora tienen su propio selector de periodo (independiente del selector de Insights)
- Backend soporta `compare=true` que calcula KPIs del periodo anterior y devuelve deltas (absoluteChange, percentChange, direction)
- Frontend muestra flechas de delta verde/roja en cada KPI card cuando comparacion esta activa
- Fila de comparacion detallada con Ingresos, Egresos, Ingreso Neto y EBITDA (valores actuales vs anteriores)
- `FinancialKpisDashboard` ya no depende del feature flag `DASHBOARD_CHARTS` (siempre visible)
- DTO actualizado con campo `compare?: string` (IsBooleanString)
- Metodo `computeKpiSummaryForRange()` en analytics.service.ts para calcular KPIs resumidos de cualquier rango

**Archivos modificados en v2.1:**
- `src/dto/analytics.dto.ts` - campo `compare` agregado
- `src/modules/analytics/analytics.controller.ts` - pasa `compare` al service
- `src/modules/analytics/analytics.service.ts` - parametro `compare` en `getFinancialKpis()`, metodo `computeKpiSummaryForRange()`, logica de deltas
- `food-inventory-admin/src/hooks/use-financial-kpis.js` - acepta `compare` como segundo parametro
- `food-inventory-admin/src/components/charts/FinancialKpisDashboard.jsx` - selector de periodo propio, boton "Comparar", DeltaBadge/DeltaBadgeInverse, fila de comparacion, PeriodControls
- `food-inventory-admin/src/components/DashboardView.jsx` - `<FinancialKpisDashboard />` movido arriba y fuera del bloque DASHBOARD_CHARTS

### Pendientes para futuras iteraciones:

#### Prioridad ALTA (impacto directo en demo para inversores):

1. **Comparacion avanzada de periodos** - Selector visual de mes/ano donde el usuario puede elegir explicitamente dos periodos para contrastar (ej: "Enero 2025 vs Enero 2024", "Q1 vs Q2"). El boton "Comparar" actual compara automaticamente contra el periodo inmediatamente anterior; la version avanzada permitira seleccion manual. Backend: nuevo endpoint `GET /analytics/financial-kpis/compare?fromA=2025-01-01&toA=2025-01-31&fromB=2024-01-01&toB=2024-01-31`. Frontend: componente PeriodComparisonPicker con modo "mes" y modo "trimestre/ano".

2. **UI de costBehavior en Plan de Cuentas** - Agregar dropdown en el formulario existente de Chart of Accounts para que el contador clasifique cada cuenta como "Fijo", "Variable" o "Mixto". Esto mejora la precision de los KPIs de costos fijos vs variables, punto de equilibrio y margen de contribucion. Cambio minimo (~30 lineas en el componente existente).

#### Prioridad MEDIA (funcionalidad operativa):

3. **CRUD de Activos Fijos** - Crear modulo NestJS completo (`fixed-assets.module.ts`, controller, service) con las 5 operaciones CRUD. Vista React con tabla + formulario para registrar equipos, vehiculos, tecnologia. Schema ya existe (`fixed-asset.schema.ts`). Patron identico al CRUD de productos/payables existente.

4. **CRUD de Inversiones** - Igual que activos fijos. Schema existe (`investment.schema.ts`). Formulario con campos: nombre, categoria, monto invertido, retorno esperado/actual, fecha. Vista con tabla y totales por categoria.

5. **Exportacion PDF/CSV de KPIs** - CSV: serializar datos a texto (trivial). PDF: usar `pdfmake` o `@react-pdf/renderer`. Layout con header de empresa, tabla de KPIs, graficas exportadas como imagen. Boton "Exportar" en PeriodControls.

#### Prioridad BAJA (mejoras incrementales):

6. **Cron de snapshots diarios** - Guardar un snapshot de los KPIs cada dia a medianoche para tener historico rapido sin recalcular. Nuevo schema `KpiSnapshot`. Cron con `@nestjs/schedule`.

7. **UI de liquidityClass en Plan de Cuentas** - Similar a costBehavior: dropdown para clasificar cuentas como "Circulante" o "No circulante". Mejora precision de KPI de liquidez.

8. **Dashboard de KPIs para IA** - Endpoint optimizado que retorna KPIs historicos en formato que la IA pueda consumir para generar insights predictivos automaticos. Requiere snapshots diarios (punto 6).

---

*Documento creado por Claude Opus 4.5 para Smartkubik ERP*
*Roadmap version 2.1 - 2026-02-02 - Comparacion de periodos + costBehavior UI en progreso*
