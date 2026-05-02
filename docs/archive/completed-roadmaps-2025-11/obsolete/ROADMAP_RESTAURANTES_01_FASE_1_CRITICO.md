# FASE 1: FUNCIONALIDADES CRÍTICAS - ACTUALIZADO
## Basado en análisis REAL del código existente (68 módulos + 74 schemas)

**Fecha actualización**: 2025-01-17
**Prioridad**: CRÍTICA
**Duración REAL**: **6-8 semanas** (no 12 semanas)
**Inversión REAL**: **$95K** (no $190K)
**Equipo**: 2 backend + 2 frontend (no 4+3)

---

## ⚠️ IMPORTANTE: CAMBIOS VS VERSIÓN ANTERIOR

**LO QUE CAMBIÓ**:
- ✅ **Tips System**: YA EXISTE 90% (`/modules/tips/`) - Solo falta integración con payroll (2 días)
- ✅ **Reservations**: YA EXISTE 70% (`/modules/reservations/`) - Backend completo, falta frontend
- ✅ **Purchase Orders**: YA EXISTE 70% (`/modules/purchases/`) - Falta auto-generación y workflow
- ✅ **Storefront**: YA EXISTE 80% (`/modules/storefront/`) - Solo mejoras UX
- ❌ **Menu Engineering**: NO EXISTE - Hay que crear, pero reutilizar Analytics/BOM/Orders

**AHORRO TOTAL**: ~$95K (50%) y ~6 semanas

---

## MÓDULO 1.1: INGENIERÍA DE MENÚS

**Duración REAL**: **2-3 semanas** (no 4)
**Inversión**: $30K
**Equipo**: 1 backend dev + 1 frontend dev
**Prioridad**: MÁXIMA

### Estado Actual:
- ❌ NO EXISTE este módulo específico
- ✅ PERO puede reutilizar:
  - Analytics Module (`/modules/analytics/`) - Datos de ventas
  - BOM Schema (`/schemas/bill-of-materials.schema.ts`) - Costos de ingredientes
  - Orders Module (`/modules/orders/`) - Historial de ventas
  - Products Module (`/modules/products/`) - Info de platos
  - Reports Module (`/modules/reports/`) - Generación de PDFs

### Crear desde cero:

#### 1. Schema: MenuItemAnalytics
```typescript
// CREAR: /src/schemas/menu-item-analytics.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class MenuItemAnalytics extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Object, required: true })
  period: {
    start: Date;
    end: Date;
  };

  // Ventas (desde Orders)
  @Prop({ type: Number, default: 0 })
  totalSales: number;

  @Prop({ type: Number, default: 0 })
  unitsSold: number;

  @Prop({ type: Number, default: 0 })
  revenueGenerated: number;

  // Costos (desde BOM)
  @Prop({ type: Number, default: 0 })
  costPerUnit: number;

  @Prop({ type: Number, default: 0 })
  totalCost: number;

  // Métricas calculadas
  @Prop({ type: Number, default: 0 })
  grossProfit: number;

  @Prop({ type: Number, default: 0 })
  profitMargin: number; // %

  @Prop({ type: Number, default: 0 })
  contributionMargin: number;

  // Clasificación
  @Prop({ type: Number, min: 0, max: 100 })
  popularityScore: number;

  @Prop({ type: Number, min: 0, max: 100 })
  profitabilityScore: number;

  @Prop({
    type: String,
    enum: ['star', 'plow-horse', 'puzzle', 'dog'],
  })
  classification: string;

  // Comparativas
  @Prop({ type: Number })
  popularityRank: number;

  @Prop({ type: Number })
  profitabilityRank: number;
}

export const MenuItemAnalyticsSchema = SchemaFactory.createForClass(MenuItemAnalytics);
```

#### 2. Service: MenuEngineeringService

```typescript
// CREAR: /src/modules/menu-engineering/menu-engineering.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItemAnalytics } from '../../schemas/menu-item-analytics.schema';
import { AnalyticsService } from '../analytics/analytics.service'; // ← REUTILIZAR
import { OrdersService } from '../orders/orders.service'; // ← REUTILIZAR
import { BillOfMaterialsService } from '../bill-of-materials/bill-of-materials.service'; // ← REUTILIZAR

@Injectable()
export class MenuEngineeringService {
  constructor(
    @InjectModel(MenuItemAnalytics.name)
    private menuItemAnalyticsModel: Model<MenuItemAnalytics>,
    private analyticsService: AnalyticsService, // REUTILIZAR
    private ordersService: OrdersService, // REUTILIZAR
    private bomService: BillOfMaterialsService, // REUTILIZAR
  ) {}

  async analyzeMenu(tenantId: string, period: { start: Date; end: Date }) {
    // 1. REUTILIZAR: Obtener datos de ventas por producto
    const salesData = await this.analyticsService.getProductSales(
      tenantId,
      period,
    );

    // 2. REUTILIZAR: Obtener costos desde BOM
    const items = [];
    for (const sale of salesData) {
      const bom = await this.bomService.findByProduct(sale.productId);
      const costPerUnit = bom ? bom.totalCost : 0;

      items.push({
        productId: sale.productId,
        unitsSold: sale.quantity,
        revenueGenerated: sale.revenue,
        costPerUnit,
        totalCost: costPerUnit * sale.quantity,
      });
    }

    // 3. Calcular scores y clasificación
    const analyzedItems = this.calculateScores(items);
    const classified = this.classifyItems(analyzedItems);

    // 4. Guardar análisis
    await this.saveAnalysis(tenantId, period, classified);

    return {
      totalItems: classified.length,
      analyzed: classified.length,
      period,
      summary: this.getSummary(classified),
    };
  }

  private calculateScores(items: any[]) {
    const maxUnits = Math.max(...items.map((i) => i.unitsSold));
    const maxProfit = Math.max(
      ...items.map((i) => i.revenueGenerated - i.totalCost),
    );

    return items.map((item) => ({
      ...item,
      grossProfit: item.revenueGenerated - item.totalCost,
      profitMargin:
        item.revenueGenerated > 0
          ? ((item.revenueGenerated - item.totalCost) / item.revenueGenerated) *
            100
          : 0,
      popularityScore: (item.unitsSold / maxUnits) * 100,
      profitabilityScore:
        ((item.revenueGenerated - item.totalCost) / maxProfit) * 100,
    }));
  }

  private classifyItems(items: any[]) {
    // Calcular medianas
    const medianPopularity = this.calculateMedian(
      items.map((i) => i.popularityScore),
    );
    const medianProfitability = this.calculateMedian(
      items.map((i) => i.profitabilityScore),
    );

    return items.map((item) => {
      const isPopular = item.popularityScore >= medianPopularity;
      const isProfitable = item.profitabilityScore >= medianProfitability;

      let classification: string;
      if (isPopular && isProfitable) {
        classification = 'star';
      } else if (isPopular && !isProfitable) {
        classification = 'plow-horse';
      } else if (!isPopular && isProfitable) {
        classification = 'puzzle';
      } else {
        classification = 'dog';
      }

      return { ...item, classification };
    });
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private getSummary(items: any[]) {
    return {
      stars: items.filter((i) => i.classification === 'star').length,
      plowHorses: items.filter((i) => i.classification === 'plow-horse').length,
      puzzles: items.filter((i) => i.classification === 'puzzle').length,
      dogs: items.filter((i) => i.classification === 'dog').length,
    };
  }

  private async saveAnalysis(tenantId: string, period: any, items: any[]) {
    // Eliminar análisis anterior del mismo período
    await this.menuItemAnalyticsModel.deleteMany({
      tenantId,
      'period.start': period.start,
      'period.end': period.end,
    });

    // Crear nuevos
    const docs = items.map((item) => ({
      tenantId,
      productId: item.productId,
      period,
      ...item,
    }));

    await this.menuItemAnalyticsModel.insertMany(docs);
  }
}
```

#### 3. Controller

```typescript
// CREAR: /src/modules/menu-engineering/menu-engineering.controller.ts

import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MenuEngineeringService } from './menu-engineering.service';

@ApiTags('Menu Engineering')
@Controller('menu-engineering')
export class MenuEngineeringController {
  constructor(private readonly menuEngineeringService: MenuEngineeringService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analizar menú para período' })
  async analyze(
    @Body() body: { startDate: string; endDate: string; categoryId?: string },
  ) {
    const period = {
      start: new Date(body.startDate),
      end: new Date(body.endDate),
    };

    return this.menuEngineeringService.analyzeMenu('tenant-id', period);
  }

  @Get('items')
  @ApiOperation({ summary: 'Obtener items clasificados' })
  async getItems(
    @Query('period') period: string,
    @Query('classification') classification?: string,
  ) {
    // Implementar lógica de query
    return [];
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Obtener recomendaciones de optimización' })
  async getRecommendations() {
    // Implementar lógica de recomendaciones
    return [];
  }
}
```

#### 4. Frontend Components

```tsx
// CREAR: /src/components/menu-engineering/MenuEngineeringDashboard.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const MenuEngineeringDashboard = () => {
  const [period, setPeriod] = React.useState('last-30-days');
  const [data, setData] = React.useState(null);

  const handleAnalyze = async () => {
    // Llamar a API
    const response = await fetch('/api/menu-engineering/analyze', {
      method: 'POST',
      body: JSON.stringify({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      }),
    });
    const result = await response.json();
    setData(result);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ingeniería de Menús</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAnalyze}>Analizar Menú</Button>

          {data && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              <MetricCard
                title="Estrellas"
                value={data.summary.stars}
                color="gold"
              />
              <MetricCard
                title="Vacas Lecheras"
                value={data.summary.plowHorses}
                color="green"
              />
              <MetricCard
                title="Enigmas"
                value={data.summary.puzzles}
                color="blue"
              />
              <MetricCard
                title="Perros"
                value={data.summary.dogs}
                color="red"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const MetricCard = ({ title, value, color }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{title}</div>
    </CardContent>
  </Card>
);
```

### Esfuerzo estimado:
- Backend: **5 días** (con reutilización de Analytics/BOM/Orders)
- Frontend: **5 días** (dashboard + gráficos)
- Testing: **2 días**
- **Total: 2-3 semanas**

---

## MÓDULO 1.2: GESTIÓN DE PROPINAS

**Duración REAL**: **2 días** (no 2 semanas)
**Inversión**: $0 (ya implementado 90%)
**Prioridad**: ✅ COMPLETO

### Estado Actual:
- ✅ **YA IMPLEMENTADO 90%**
- ✅ Ubicación: `/modules/tips/`
- ✅ Schemas: `tips-distribution-rule.schema.ts`, `tips-report.schema.ts`
- ✅ Order.schema incluye campos de propinas

### Lo que falta (opcional - 2 días):

1. **Integración con Payroll** (1 día):
```typescript
// MODIFICAR: /src/modules/payroll-runs/payroll-runs.service.ts
// Agregar en método calculatePayroll():

const tipsReport = await this.tipsService.getReportForPeriod(
  employee.id,
  payrollRun.periodStart,
  payrollRun.periodEnd,
);

employee.earnings.push({
  conceptId: 'tips',
  amount: tipsReport.totalTips,
  description: `Propinas período ${formatPeriod(period)}`,
});
```

2. **Job automático** (1 día):
```typescript
// CREAR: /src/jobs/distribute-tips-weekly.job.ts
@Cron('0 9 * * 1') // Lunes 9am
async distributeTips() {
  const lastWeek = getLastWeekDates();
  await this.tipsService.distributeForPeriod(lastWeek.start, lastWeek.end);
}
```

**Esfuerzo: 2 días**

---

## MÓDULO 1.3: SISTEMA DE RESERVAS COMPLETO

**Duración REAL**: **1 semana** (no 4 semanas)
**Inversión**: $20K
**Equipo**: 1 frontend dev
**Prioridad**: MEDIA

### Estado Actual:
- ✅ **YA EXISTE 70%**
- ✅ Backend COMPLETO: `/modules/reservations/reservations.service.ts`
- ✅ Schemas COMPLETOS: `reservation.schema.ts`, `reservation-settings.schema.ts`
- ✅ Integración con Tables module

### ⚠️ IMPORTANTE: NO duplicar con Appointments
- ❌ NO usar `/modules/appointments/` (es para vertical de Servicios)
- ✅ Usar `/modules/reservations/` (específico para restaurantes)

### Lo que falta crear:

1. **Frontend components** (5 días):
```tsx
// CREAR:
- /src/components/reservations/ReservationCalendar.tsx
- /src/components/reservations/ReservationForm.tsx
- /src/components/reservations/AvailabilityChecker.tsx
- /src/components/reservations/ReservationList.tsx
- /src/components/reservations/FloorPlanWithReservations.tsx
```

2. **Jobs automáticos** (2 días):
```typescript
// CREAR:
- /src/jobs/send-reservation-confirmations.job.ts
- /src/jobs/send-reservation-reminders.job.ts
- /src/jobs/mark-no-show.job.ts
```

3. **Widget para website** (opcional - 2 días):
```tsx
// CREAR: /src/components/reservations/ReservationWidget.tsx
// Widget embebible en sitio web del restaurante
```

**Esfuerzo: 1 semana**

---

## MÓDULO 1.4: PURCHASE ORDERS AUTOMATIZADAS

**Duración REAL**: **1.5 semanas** (no 3 semanas)
**Inversión**: $30K
**Equipo**: 1 backend + 1 frontend
**Prioridad**: MEDIA

### Estado Actual:
- ✅ **YA EXISTE 70%**
- ✅ CRUD completo: `/modules/purchases/purchases.service.ts`
- ✅ Schema completo: `purchase-order.schema.ts` con approval fields
- ✅ Supplier schema con métricas: `supplier.schema.ts`

### Lo que YA funciona:
- ✅ Crear/editar/eliminar Purchase Orders
- ✅ Gestión de proveedores
- ✅ Estados (draft, approved, received, etc.)
- ✅ Campos para approval workflow

### Lo que falta crear:

1. **Auto-generación** (3 días):
```typescript
// CREAR: /src/jobs/auto-generate-pos.job.ts

@Cron('0 9 * * 1') // Lunes 9am
async autoGeneratePOs() {
  const settings = await this.getSettings();
  if (!settings.autoGenerateEnabled) return;

  // 1. REUTILIZAR: Obtener productos con stock bajo
  const lowStock = await this.inventoryService.findLowStock();

  // 2. Agrupar por proveedor preferido
  const grouped = this.groupByPreferredSupplier(lowStock);

  // 3. Crear PO draft por cada proveedor
  for (const [supplierId, products] of grouped) {
    await this.purchasesService.create({
      supplierId,
      items: products.map((p) => ({
        productId: p.id,
        quantity: p.reorderQuantity,
        unitPrice: p.preferredSupplierPrice,
      })),
      status: 'pending-approval',
      creationType: 'automatic',
    });
  }
}
```

2. **Workflow de aprobación** (2 días):
```typescript
// EXTENDER: /src/modules/purchases/purchases.service.ts

async approve(poId: string, userId: string) {
  const po = await this.findOne(poId);
  po.status = 'approved';
  po.approvedBy = userId; // campo ya existe en schema
  po.approvedAt = new Date(); // campo ya existe
  await po.save();

  // Notificar
  await this.notificationService.send({
    type: 'po-approved',
    poId,
  });
}
```

3. **Recepción e integración** (3 días):
```typescript
async receivePO(poId: string, receivedItems: ReceivedItem[]) {
  // 1. Actualizar PO
  const po = await this.findOne(poId);
  po.receivedItems = receivedItems;
  po.status = 'received';
  po.receivedDate = new Date();

  // 2. REUTILIZAR: Inventory service para sumar stock
  for (const item of receivedItems) {
    await this.inventoryService.addStock({
      productId: item.productId,
      quantity: item.quantityReceived,
      reason: `PO ${po.poNumber} received`,
    });
  }

  // 3. REUTILIZAR: Accounting para journal entry
  await this.accountingService.createJournalEntry({
    type: 'purchase',
    debit: { account: 'inventory', amount: po.total },
    credit: { account: 'accounts-payable', amount: po.total },
  });

  await po.save();
}
```

**Esfuerzo: 1.5 semanas**

---

## MÓDULO 1.5: MEJORAS A PEDIDOS ONLINE PROPIOS

**Duración REAL**: **1 semana** (no 2 semanas)
**Inversión**: $15K
**Equipo**: 1 fullstack dev
**Prioridad**: BAJA

### Estado Actual:
- ✅ **YA EXISTE 80%**
- ✅ Storefront básico: `/modules/storefront/`
- ✅ Modifiers completos: `/modules/modifier-groups/`
- ✅ Integración con Orders
- ✅ Categorías de productos

### Lo que falta (mejoras UX):

1. **Categorización visual mejorada** (2 días)
2. **Sticky cart sidebar** (1 día)
3. **Order tracking en tiempo real** (2 días)
4. **Guest checkout** (1 día)
5. **Admin panel para storefront** (2 días)

**Esfuerzo: 1 semana**

---

## CRONOGRAMA FASE 1 CORREGIDO

```
SEMANA 1-2: Menu Engineering
├─ Backend (5 días) - REUTILIZAR Analytics/BOM/Orders
├─ Frontend (5 días)
└─ Testing (2 días)

SEMANA 3: Reservations Frontend + Jobs
├─ Frontend components (3 días)
├─ Jobs automáticos (2 días)
└─ Widget (opcional)

SEMANA 4-5: Purchase Orders
├─ Auto-generación (3 días)
├─ Workflow aprobación (2 días)
├─ Recepción + Inventory (3 días)
└─ Frontend (2 días)

SEMANA 6: Storefront Mejoras + Tips
├─ Storefront UX (3 días)
├─ Tips-Payroll integration (2 días)
└─ Testing final

SEMANA 7-8: Testing integración + Documentación
```

---

## RECURSOS NECESARIOS - CORREGIDO

### Equipo (Reducido):
- **2 Senior Backend Developers** (no 4) ← 50% ahorro
- **2 Senior Frontend Developers** (no 3) ← 33% ahorro
- **1 QA Engineer** (part-time)
- **1 PM** (part-time 20%)

### Infraestructura:
- ✅ **Todo ya existe** - No se requiere nueva infraestructura
- MongoDB Atlas: ya configurado
- Redis Cloud: ya configurado
- SendGrid/Twilio: ya configurado

---

## INVERSIÓN CORREGIDA

| Concepto | Original | Corregido | Ahorro |
|----------|----------|-----------|--------|
| **Menu Engineering** | $48K | $30K | $18K |
| **Tips** | $21K | $0 | $21K |
| **Reservations** | $48K | $20K | $28K |
| **Purchase Orders** | $36K | $30K | $6K |
| **Storefront** | $21K | $15K | $6K |
| **PM Overhead** | $16K | $0 | $16K |
| **TOTAL** | **$190K** | **$95K** | **$95K (50%)** |

---

## MÉTRICAS DE ÉXITO - MISMO OBJETIVO

Al finalizar Fase 1:
- ✅ 100% de gaps críticos cerrados
- ✅ Paridad funcional con top 3 competidores
- ✅ NPS ≥ 40
- ✅ 5+ demos exitosos
- ✅ 2+ nuevos clientes firmados

**PERO con 50% menos inversión y tiempo** 🎉

---

## RIESGOS ELIMINADOS

**Riesgos eliminados por código existente**:
- ✅ No hay que crear Tips desde cero (ya existe 90%)
- ✅ No hay que crear Reservations desde cero (backend 70%)
- ✅ No hay que crear Purchase Orders desde cero (CRUD 70%)
- ✅ No duplicar Appointments vs Reservations
- ✅ No recrear Analytics/BOM/Orders

**Nuevo riesgo**:
- ⚠️ Integración de módulos existentes puede tener bugs - Mitigar con testing exhaustivo

---

## SIGUIENTE FASE

Ver: `ROADMAP_RESTAURANTES_02_FASE_2_OPTIMIZACION.md`

---

**RESUMEN DE CAMBIOS:**
1. ✅ Identificados 68 módulos + 74 schemas existentes
2. ✅ Duración reducida: 12 semanas → 6-8 semanas (50%)
3. ✅ Inversión reducida: $190K → $95K (50%)
4. ✅ Equipo reducido: 7 devs → 4 devs (43%)
5. ✅ Eliminada duplicación (Appointments vs Reservations)
6. ✅ Plan basado en ANÁLISIS REAL del código

*Última actualización: 2025-01-17*
*Basado en análisis exhaustivo de código existente*
