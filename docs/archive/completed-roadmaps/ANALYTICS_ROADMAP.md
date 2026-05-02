# 📊 Roadmap: Sistema de Analíticas Custom - Power BI Style

## 🎯 Objetivo General
Transformar el dashboard de analíticas de un sistema de gráficas fijas abrumadoras a un sistema flexible de análisis personalizado que permite a cada tenant seleccionar y visualizar solo las métricas que necesita.

---

## 📍 Estado Actual (Antes de comenzar)

### Archivo Principal
`food-inventory-admin/src/components/charts/FinancialKpisDashboard.jsx`

### Problemas Identificados
1. **Sobrecarga visual**: Demasiadas gráficas fijas (15+ KPIs, múltiples charts)
2. **No personalizable**: Todos ven lo mismo independientemente de su negocio
3. **Difícil de navegar**: Scroll infinito para encontrar la métrica que necesitas
4. **Performance**: Carga todos los datos aunque no se usen
5. **Redundancia**: Múltiples vistas de la misma información

### Componentes Actuales
- `FinancialKpisDashboard.jsx` - Dashboard principal con KPIs fijos
- `ExpenseIncomeBreakdown.jsx` - Desglose de gastos/ingresos (independiente)
- `PeriodSelector.jsx` - Selector de períodos unificado (ya funciona bien ✅)
- Hooks: `use-financial-kpis.js`, `use-expense-income-breakdown.js`

---

## 🎨 Arquitectura Propuesta: 3 Niveles

```
┌─────────────────────────────────────────────────────────────┐
│ NIVEL 1: KPIs Esenciales (siempre visibles)                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ [5-8 KPI Cards compactas - métricas críticas universales]  │
│ • Ingresos vs Gastos                                        │
│ • Margen Neto %                                             │
│ • Flujo de Caja                                             │
│ • Ticket Promedio                                           │
│ • Total Órdenes                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ NIVEL 2: Vistas Pre-configuradas (opcional, por vertical)  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ [Tabs/Accordion con templates según tipo de negocio]       │
│ 🍽️ Restaurante | 🛒 Retail | 💼 Servicios | 🏭 Manufactura │
│ Cada uno con métricas relevantes pre-seleccionadas         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ NIVEL 3: Constructor Custom (on-demand, power users)       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ [Selector de métricas dinámico + generación de gráficas]   │
│ • Selector multi-nivel de métricas                          │
│ • Tablas comparativas generadas dinámicamente              │
│ • Gráficas basadas en selección                            │
│ • Guardar vistas favoritas                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Plan de Implementación

### ✅ Pre-requisitos Completados
- [x] PeriodSelector unificado funcionando
- [x] Multi-year comparison working
- [x] Hooks refactorizados para períodos múltiples
- [x] Backend devolviendo estructura correcta de datos

---

## 🚀 FASE 1: Simplificación del Dashboard Actual

**Objetivo**: Reducir el dashboard actual a solo los KPIs esenciales + tabla comparación

### Paso 1.1: Identificar KPIs Esenciales
**Archivo**: `FinancialKpisDashboard.jsx`

**KPIs a MANTENER siempre visibles (5-8):**
```javascript
const ESSENTIAL_KPIS = [
  'avgTicket',           // Ticket Promedio
  'grossMargin',         // Margen Bruto %
  'netMargin',           // Margen Neto %
  'liquidity',           // Liquidez
  'ebitda'              // EBITDA
];
```

**Componentes a MANTENER:**
- KPI Cards (las 5 esenciales)
- MultiYearComparison (tabla comparativa - es muy útil)
- PeriodSelector (ya funciona perfecto)
- Export CSV button

**Componentes a MOVER a "Advanced/Detailed View" (colapsable):**
- Gráficas de tendencias (LineCharts)
- Break-even analysis
- Inventory turnover charts
- ROI detailed view
- Fixed vs Variable costs pie chart
- Contribution margin details

### Paso 1.2: Reestructurar el Layout
**Antes:**
```
[Header + PeriodSelector]
[10+ KPI Cards en grid]
[5+ Gráficas de barras/líneas]
[Tablas detalladas]
[Más gráficas]
[ExpenseIncomeBreakdown con controles propios]
```

**Después:**
```
[Header + PeriodSelector]
[5 KPI Cards esenciales - grid compacto]
[MultiYearComparison - tabla comparativa]
[Accordion: "Ver Análisis Detallado" (colapsado por default)]
  └─ [Gráficas y análisis adicionales]
[ExpenseIncomeBreakdown con controles propios]
```

### Paso 1.3: Código de Implementación

**Crear componente EssentialKpis:**
```javascript
// FinancialKpisDashboard.jsx - nuevo componente
function EssentialKpis({ primary, deltas }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiCard
        title="Ticket Promedio"
        value={fmtUsd(primary.avgTicket?.value)}
        trend={deltas.avgTicket}
        icon={DollarSign}
      />
      <KpiCard
        title="Margen Bruto"
        value={fmtPct(primary.grossMargin?.grossMarginPercent)}
        trend={deltas.grossMarginPercent}
        icon={TrendingUp}
        status={primary.grossMargin?.status}
      />
      <KpiCard
        title="Margen Neto"
        value={fmtPct(primary.netMargin?.netMarginPercent)}
        trend={deltas.netMarginPercent}
        icon={Calculator}
        status={primary.netMargin?.status}
      />
      <KpiCard
        title="EBITDA"
        value={fmtUsd(primary.ebitda?.ebitda)}
        trend={deltas.ebitda}
        icon={PiggyBank}
      />
      <KpiCard
        title="Liquidez"
        value={`${fmt(primary.liquidity?.liquidityRatio)}x`}
        icon={Droplets}
        status={primary.liquidity?.status}
      />
    </div>
  );
}
```

**Crear componente DetailedAnalysis (colapsable):**
```javascript
function DetailedAnalysis({ primary, ticketTrend, deltas }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="detailed">
        <AccordionTrigger className="text-base font-semibold">
          📊 Ver Análisis Detallado
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-4">
            {/* Row 2: Detailed Margin Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartCard title="Contribución Marginal">
                {/* Existing contribution margin chart */}
              </ChartCard>
              <ChartCard title="Punto de Equilibrio">
                {/* Existing break-even chart */}
              </ChartCard>
            </div>

            {/* Row 3: More detailed charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Inventory, ROI, etc */}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

**Actualizar el return principal:**
```javascript
return (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-lg font-semibold">KPIs Financieros</h3>
        <p className="text-sm text-muted-foreground">
          Indicadores clave de rendimiento financiero
        </p>
      </div>
      <div className="flex items-center gap-2">
        <PeriodSelector
          selectedYears={selectedYears}
          selectedMonths={selectedMonths}
          onYearsChange={setSelectedYears}
          onMonthsChange={setSelectedMonths}
        />
        <button onClick={() => exportKpisCsv(primary)} {...}>
          <Download /> CSV
        </button>
      </div>
    </div>

    {/* Essential KPIs - siempre visibles */}
    <EssentialKpis primary={primary} deltas={deltas} />

    {/* Multi-year comparison - siempre visible */}
    {isComparing && <MultiYearComparison results={results} />}

    {/* Detailed Analysis - colapsable */}
    <DetailedAnalysis primary={primary} deltas={deltas} />

    {/* Expense/Income Breakdown - independiente */}
    <ExpenseIncomeBreakdown />
  </div>
);
```

---

## 🚀 FASE 2: Constructor de Métricas Custom

**Objetivo**: Permitir selección dinámica de métricas para análisis personalizado

### Paso 2.1: Backend - Query Builder Dinámico

**Nuevo archivo**: `food-inventory-saas/src/modules/analytics/analytics.service.ts`

**Agregar método:**
```typescript
async getCustomMetrics(
  tenantId: string,
  metricIds: string[],
  fromDate: Date,
  toDate: Date,
  groupBy?: string,
  granularity?: string,
): Promise<CustomMetricsResponse> {
  // Mapeo de metric IDs a aggregation pipelines
  const METRIC_DEFINITIONS = {
    'revenue_by_channel': this.buildRevenueByChannelPipeline,
    'expenses_by_type': this.buildExpensesByTypePipeline,
    'payroll_detailed': this.buildPayrollDetailedPipeline,
    'gross_margin_by_product': this.buildGrossMarginByProductPipeline,
    // ... más métricas
  };

  const results = await Promise.all(
    metricIds.map(id => METRIC_DEFINITIONS[id]?.(tenantId, fromDate, toDate))
  );

  return { metrics: results, period: { from: fromDate, to: toDate } };
}
```

### Paso 2.2: Frontend - Selector de Métricas

**Nuevo archivo**: `food-inventory-admin/src/components/charts/MetricSelector.jsx`

```javascript
const METRIC_CATEGORIES = [
  {
    id: 'revenue',
    label: 'Ingresos',
    icon: TrendingUp,
    metrics: [
      { id: 'revenue_by_channel', label: 'Por Canal de Venta', description: 'Ventas desglosadas por canal (POS, online, delivery)' },
      { id: 'revenue_by_payment', label: 'Por Forma de Pago', description: 'Ingresos agrupados por método de pago' },
      { id: 'revenue_by_category', label: 'Por Categoría de Producto', description: 'Ventas por categoría' },
    ]
  },
  {
    id: 'expenses',
    label: 'Egresos',
    icon: ArrowDownRight,
    metrics: [
      { id: 'payroll_detailed', label: 'Nómina Detallada', description: 'Desglose completo de costos de nómina' },
      { id: 'expenses_operational', label: 'Gastos Operativos', description: 'Servicios, rentas, suministros' },
      { id: 'taxes_detailed', label: 'Impuestos y Retenciones', description: 'IVA, ISR, retenciones' },
      { id: 'commissions', label: 'Comisiones', description: 'Comisiones de venta y servicios' },
    ]
  },
  {
    id: 'margins',
    label: 'Márgenes',
    icon: Calculator,
    metrics: [
      { id: 'margin_by_product', label: 'Por Producto', description: 'Margen de cada producto/servicio' },
      { id: 'margin_by_category', label: 'Por Categoría', description: 'Margen por categoría de producto' },
    ]
  },
];

export function MetricSelector({ selectedMetrics, onMetricsChange }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Selecciona Métricas a Analizar</h4>

      {METRIC_CATEGORIES.map(category => (
        <div key={category.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <category.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{category.label}</span>
          </div>

          <div className="pl-6 space-y-1">
            {category.metrics.map(metric => (
              <label key={metric.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={selectedMetrics.includes(metric.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onMetricsChange([...selectedMetrics, metric.id]);
                    } else {
                      onMetricsChange(selectedMetrics.filter(id => id !== metric.id));
                    }
                  }}
                />
                <div className="flex-1">
                  <div className="text-sm">{metric.label}</div>
                  <div className="text-xs text-muted-foreground">{metric.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Paso 2.3: Componente Principal de Análisis Custom

**Nuevo archivo**: `food-inventory-admin/src/components/charts/CustomAnalytics.jsx`

```javascript
export function CustomAnalytics() {
  const now = new Date();
  const [selectedYears, setSelectedYears] = useState(() => new Set([now.getFullYear()]));
  const [selectedMonths, setSelectedMonths] = useState(() => new Set([now.getMonth()]));
  const [selectedMetrics, setSelectedMetrics] = useState([]);

  const periods = useMemo(
    () => buildPeriods([...selectedYears], [...selectedMonths]),
    [selectedYears, selectedMonths]
  );

  const { data, loading, error } = useCustomMetrics(selectedMetrics, periods);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Análisis Personalizado</h3>
        <PeriodSelector
          selectedYears={selectedYears}
          selectedMonths={selectedMonths}
          onYearsChange={setSelectedYears}
          onMonthsChange={setSelectedMonths}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar: Selector de métricas */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <MetricSelector
                selectedMetrics={selectedMetrics}
                onMetricsChange={setSelectedMetrics}
              />
            </CardContent>
          </Card>
        </div>

        {/* Main: Visualizaciones */}
        <div className="lg:col-span-3 space-y-4">
          {loading && <ChartSkeleton />}
          {error && <ErrorCard error={error} />}

          {data?.metrics.map(metric => (
            <Card key={metric.id}>
              <CardContent className="p-6">
                <h4 className="text-base font-semibold mb-4">{metric.label}</h4>

                {/* Tabla comparativa */}
                <MetricComparisonTable data={metric.data} periods={periods} />

                {/* Gráfica */}
                <MetricChart data={metric.data} type={metric.chartType} />
              </CardContent>
            </Card>
          ))}

          {selectedMetrics.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Selecciona métricas del panel izquierdo para comenzar tu análisis</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 FASE 3: Vistas Guardadas y Templates

**Objetivo**: Permitir guardar configuraciones favoritas y ofrecer templates por vertical

### Paso 3.1: Backend - Saved Views API

**Nuevo modelo**: `saved-analytics-view.model.ts`
```typescript
@Schema({ timestamps: true })
export class SavedAnalyticsView {
  @Prop({ required: true, ref: 'Tenant' })
  tenantId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], required: true })
  metricIds: string[];

  @Prop({ type: Object })
  periodConfig: {
    years: number[];
    months: number[];
  };

  @Prop({ default: false })
  isTemplate: boolean;

  @Prop()
  vertical?: string; // 'restaurant', 'retail', 'services', etc.
}
```

### Paso 3.2: Templates Pre-configurados

**Crear archivo**: `food-inventory-admin/src/config/analytics-templates.js`

```javascript
export const ANALYTICS_TEMPLATES = {
  restaurant: {
    label: '🍽️ Restaurante',
    description: 'Métricas clave para negocios de alimentos',
    metrics: [
      'revenue_by_channel',
      'food_costs_detailed',
      'payroll_by_position',
      'inventory_turnover',
      'table_turnover_rate',
    ]
  },
  retail: {
    label: '🛒 Retail',
    description: 'Análisis para tiendas y comercio',
    metrics: [
      'revenue_by_category',
      'top_products',
      'inventory_by_location',
      'margin_by_product',
      'customer_acquisition_cost',
    ]
  },
  services: {
    label: '💼 Servicios',
    description: 'Métricas para negocios de servicios',
    metrics: [
      'revenue_by_service_type',
      'employee_utilization',
      'recurring_revenue',
      'customer_lifetime_value',
    ]
  },
};
```

---

## 📝 Decisiones Técnicas Importantes

### 1. Por qué Accordion para "Detailed Analysis"
- **UX**: Progressive disclosure - no abrumar usuarios novatos
- **Performance**: Solo renderiza cuando se expande
- **Mantenible**: Fácil agregar/quitar secciones

### 2. Por qué Estado Independiente en ExpenseIncomeBreakdown
- Permite análisis de diferentes períodos simultáneamente
- Más flexible para usuarios avanzados
- Cada componente es autónomo

### 3. Por qué Constructor Custom en Fase 2 (no Fase 1)
- Fase 1 establece la base sólida
- Usuarios necesitan familiarizarse con el dashboard simplificado
- Backend requiere trabajo adicional para queries dinámicos

### 4. Estructura de Datos para Métricas Custom
```typescript
interface CustomMetricResult {
  id: string;
  label: string;
  chartType: 'bar' | 'line' | 'pie' | 'table';
  data: {
    labels: string[];
    values: number[];
    comparison?: {
      period: string;
      values: number[];
      deltas: number[];
    }
  };
}
```

---

## 🎯 KPIs de Éxito

### Fase 1
- [ ] Dashboard carga en < 2s
- [ ] Solo 5-8 KPIs visibles inicialmente
- [ ] Accordion con análisis detallado funcional
- [ ] Feedback positivo de usuarios sobre simplicidad

### Fase 2
- [ ] Backend responde custom queries en < 1s
- [ ] 10+ métricas disponibles para selección
- [ ] Usuarios pueden generar análisis custom
- [ ] Gráficas se generan dinámicamente

### Fase 3
- [ ] Usuarios pueden guardar vistas favoritas
- [ ] Templates por vertical funcionando
- [ ] Export de vistas custom a PDF/Excel

---

## ⚠️ Warnings para Gemini (el retrasado mental)

1. **NO elimines PeriodSelector** - ya funciona perfecto, úsalo tal cual
2. **NO cambies la estructura de buildPeriods** - el backend depende de ella
3. **NO mezcles state de períodos** - mantén separado KPIs vs ExpenseIncomeBreakdown
4. **Lee el código actual antes de modificar** - hay lógica importante en hooks
5. **Usa los tipos correctos**: `Set<number>` para años/meses, NO arrays
6. **Respeta las props de PeriodSelector**: selectedYears, selectedMonths son Sets
7. **NO rompas MultiYearComparison** - la tabla comparativa es muy útil

---

## 📚 Referencias de Código Existente

- **PeriodSelector (funciona perfecto)**: `food-inventory-admin/src/components/charts/PeriodSelector.jsx`
- **Hooks de analytics**: `food-inventory-admin/src/hooks/use-financial-kpis.js`
- **Backend analytics service**: `food-inventory-saas/src/modules/analytics/analytics.service.ts`
- **Acordeón de shadcn**: Ya está importado, úsalo para "Detailed Analysis"

---

## 🚀 Siguiente Paso Inmediato

**COMENZAR CON FASE 1, PASO 1.2**: Reestructurar FinancialKpisDashboard.jsx
1. Crear componente `EssentialKpis`
2. Crear componente `DetailedAnalysis` con Accordion
3. Actualizar el return principal para usar los nuevos componentes
4. Mover gráficas no esenciales dentro del Accordion

**Archivos a modificar**:
- `food-inventory-admin/src/components/charts/FinancialKpisDashboard.jsx`

**Importar adicionales necesarios**:
```javascript
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.jsx';
```

---

**Documento creado**: 2026-02-09
**Última actualización**: 2026-02-09
**Estado**: Listo para implementación Fase 1
