import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartCard, ChartEmptyState, ChartSkeleton } from './BaseChart.jsx';
import { chartPalette, defaultTooltipProps } from './chart-theme.js';
import { ExpenseIncomeBreakdown } from './ExpenseIncomeBreakdown.jsx';
import { PeriodSelector, buildPeriods } from './PeriodSelector.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.jsx';
import { useFinancialKpis } from '@/hooks/use-financial-kpis';
import {
  TrendingUp,
  DollarSign,
  Droplets,
  Calculator,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Download,
} from 'lucide-react';

// ─── Formatters ──────────────────────────────────────────────
const fmt = (v, decimals = 2) => {
  if (v == null || isNaN(v)) return '--';
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
};

const fmtUsd = (v) => {
  if (v == null || isNaN(v)) return '--';
  return `$${fmt(v)}`;
};

const fmtPct = (v) => {
  if (v == null || isNaN(v)) return '--';
  return `${fmt(v)}%`;
};

// ─── Status helpers ──────────────────────────────────────────
const STATUS_COLORS = {
  good: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
  no_data: 'text-muted-foreground',
};

const STATUS_BG = {
  good: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  warning: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
  danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  no_data: 'bg-muted/50 border-border',
};

const STATUS_ICONS = {
  good: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  no_data: Info,
};

// ─── Delta badges ────────────────────────────────────────────
function DeltaBadge({ delta }) {
  if (!delta || delta.percentChange == null) return null;

  const isUp = delta.direction === 'up';
  const isDown = delta.direction === 'down';
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const color = isUp
    ? 'text-green-600 dark:text-green-400'
    : isDown
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground';

  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(delta.percentChange).toFixed(1)}%
    </span>
  );
}

function DeltaBadgeInverse({ delta }) {
  if (!delta || delta.percentChange == null) return null;

  const isUp = delta.direction === 'up';
  const isDown = delta.direction === 'down';
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const color = isDown
    ? 'text-green-600 dark:text-green-400'
    : isUp
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground';

  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(delta.percentChange).toFixed(1)}%
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────
function computeDelta(current, previous) {
  if (current == null || previous == null) return null;
  const change = current - previous;
  const pct = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
  return {
    current,
    previous,
    absoluteChange: change,
    percentChange: Math.round(pct * 10) / 10,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
  };
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, status, icon: Icon, detail, delta, inverseDelta }) {
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.no_data;
  const statusBg = STATUS_BG[status] || STATUS_BG.no_data;
  const StatusIcon = STATUS_ICONS[status] || Info;

  return (
    <Card className={`border ${statusBg} transition-colors`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-2xl font-bold ${statusColor}`}>{value}</p>
              {delta && !inverseDelta && <DeltaBadge delta={delta} />}
              {delta && inverseDelta && <DeltaBadgeInverse delta={delta} />}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
            {Icon && (
              <div className="p-2 rounded-lg bg-background/80">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
          </div>
        </div>
        {detail && (
          <p className="text-[11px] text-muted-foreground mt-2 border-t pt-2 border-border/50">
            {detail}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Break Even Gauge ────────────────────────────────────────
function BreakEvenGauge({ data }) {
  if (!data) return null;

  const pct = data.coveragePercent ?? 0;
  const clampedPct = Math.min(pct, 200);
  const barWidth = `${Math.min(clampedPct, 100)}%`;

  return (
    <ChartCard
      title="Punto de Equilibrio"
      description={`Necesitas vender ${fmtUsd(data.breakEvenRevenue)} para cubrir costos fijos`}
    >
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Ventas actuales</span>
          <span className="font-semibold">{fmtUsd(data.currentRevenue)}</span>
        </div>
        <div className="relative h-6 bg-muted rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${
              data.isAboveBreakEven
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : 'bg-gradient-to-r from-red-500 to-yellow-500'
            }`}
            style={{ width: barWidth }}
          />
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground/60"
            style={{ left: `${Math.min((100 / Math.max(clampedPct, 100)) * 100, 100)}%` }}
            title="Punto de equilibrio"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>$0</span>
          <span className="font-medium">
            PE: {fmtUsd(data.breakEvenRevenue)}
          </span>
          {data.isAboveBreakEven && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              +{fmtUsd(data.surplusOrDeficit)} excedente
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Costos Fijos</p>
            <p className="font-semibold">{fmtUsd(data.fixedCosts)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Margen Contrib.</p>
            <p className="font-semibold">{fmtPct(data.contributionMarginPercent)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Unidades PE</p>
            <p className="font-semibold">{fmt(data.breakEvenUnits, 0)}</p>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

// ─── Cost Breakdown Pie ──────────────────────────────────────
function CostBreakdownPie({ data }) {
  if (!data) return null;

  const pieData = [
    { name: 'Costos Fijos', value: data.fixedCosts, color: chartPalette[0] },
    { name: 'Costos Variables', value: data.variableCosts, color: chartPalette[2] },
  ];
  if (data.unclassifiedCosts > 0) {
    pieData.push({ name: 'Sin Clasificar', value: data.unclassifiedCosts, color: '#94a3b8' });
  }

  const total = pieData.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <ChartCard title="Costos Fijos vs Variables">
        <ChartEmptyState message="No hay gastos registrados en este periodo." />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Costos Fijos vs Variables"
      description={`Total: ${fmtUsd(data.totalCosts)}`}
    >
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {pieData.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            {...defaultTooltipProps}
            formatter={(val) => fmtUsd(val)}
          />
        </PieChart>
      </ResponsiveContainer>
      {data.note && (
        <p className="text-[10px] text-muted-foreground mt-1 italic">{data.note}</p>
      )}
    </ChartCard>
  );
}

// ─── Ticket Trend Chart ──────────────────────────────────────
function TicketTrendChart({ trend }) {
  if (!trend?.length) {
    return (
      <ChartCard title="Tendencia Ticket Promedio">
        <ChartEmptyState message="No hay datos de tendencia disponibles." />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Tendencia Ticket Promedio"
      description="Valor promedio por transaccion en el periodo"
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
          <XAxis dataKey="period" stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <Tooltip
            {...defaultTooltipProps}
            formatter={(val, name) => [
              fmtUsd(val),
              name === 'avgTicket' ? 'Ticket Promedio' : name,
            ]}
          />
          <Line
            type="monotone"
            dataKey="avgTicket"
            stroke={chartPalette[0]}
            strokeWidth={2.5}
            dot={{ r: 3, fill: chartPalette[0] }}
            name="Ticket Promedio"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Inventory Turnover Table ────────────────────────────────
function InventoryTurnoverTable({ data }) {
  if (!data?.topProducts?.length) {
    return (
      <ChartCard title="Rotacion de Inventario">
        <ChartEmptyState message="No hay datos de rotacion disponibles." />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Rotacion de Inventario"
      description={`Promedio: ${fmt(data.avgTurnoverRate)}x | ${fmt(data.avgDaysOnHand, 0)} dias en stock`}
      actions={
        <span className="text-xs text-muted-foreground">
          Valor total: {fmtUsd(data.totalStockValue)}
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Producto</th>
              <th className="pb-2 font-medium text-right">Rotacion</th>
              <th className="pb-2 font-medium text-right">Dias Stock</th>
              <th className="pb-2 font-medium text-right">Venta/Dia</th>
              <th className="pb-2 font-medium text-right">Valor Stock</th>
            </tr>
          </thead>
          <tbody>
            {data.topProducts.slice(0, 10).map((p, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0">
                <td className="py-2 max-w-[180px] truncate" title={p.productName}>
                  {p.productName}
                </td>
                <td className="py-2 text-right font-mono">{fmt(p.turnoverRate)}x</td>
                <td className="py-2 text-right font-mono">{fmt(p.daysOnHand, 0)}</td>
                <td className="py-2 text-right font-mono">{fmt(p.averageDailySales)}</td>
                <td className="py-2 text-right font-mono">{fmtUsd(p.stockValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

// ─── Margins Comparison Chart ────────────────────────────────
function MarginsComparison({ grossMargin, contributionMargin, netMargin }) {
  const bars = [
    { name: 'Margen Bruto', value: grossMargin?.grossMarginPercent ?? 0, fill: chartPalette[1] },
    { name: 'Margen Contrib.', value: contributionMargin?.contributionMarginPercent ?? 0, fill: chartPalette[0] },
    { name: 'Margen Neto', value: netMargin?.netMarginPercent ?? 0, fill: chartPalette[4] },
  ];

  return (
    <ChartCard
      title="Comparacion de Margenes"
      description="Bruto vs Contribucion vs Neto"
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={bars} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
          <XAxis type="number" domain={[0, 100]} unit="%" stroke="#94a3b8" />
          <YAxis type="category" dataKey="name" width={110} stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <Tooltip
            {...defaultTooltipProps}
            formatter={(val) => `${fmt(val)}%`}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
            {bars.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Multi-Year KPI Comparison ───────────────────────────────
function MultiYearComparison({ results }) {
  if (results.length < 2) return null;

  const validResults = results.filter((r) => r.data);
  if (validResults.length < 2) return null;

  const indicators = [
    // Usamos netMargin como fuente única para garantizar: netIncome = totalRevenue - totalExpenses
    { key: 'revenue', label: 'Ingresos', extract: (d) => d?.netMargin?.totalRevenue, format: fmtUsd },
    { key: 'expenses', label: 'Gastos', extract: (d) => d?.netMargin?.totalExpenses, format: fmtUsd },
    { key: 'netIncome', label: 'Ingreso Neto', extract: (d) => d?.netMargin?.netIncome, format: fmtUsd },
    { key: 'avgTicket', label: 'Ticket Promedio', extract: (d) => d?.avgTicket?.value, format: fmtUsd },
    { key: 'orders', label: 'Ordenes', extract: (d) => d?.avgTicket?.orderCount, format: (v) => fmt(v, 0) },
    { key: 'grossMargin', label: 'Margen Bruto', extract: (d) => d?.grossMargin?.grossMarginPercent, format: fmtPct },
    { key: 'contribMargin', label: 'Margen Contrib.', extract: (d) => d?.contributionMargin?.contributionMarginPercent, format: fmtPct },
    { key: 'netMargin', label: 'Margen Neto', extract: (d) => d?.netMargin?.netMarginPercent, format: fmtPct },
    { key: 'ebitda', label: 'EBITDA', extract: (d) => d?.ebitda?.ebitda, format: fmtUsd },
    { key: 'liquidity', label: 'Liquidez', extract: (d) => d?.liquidity?.liquidityRatio, format: (v) => v != null && v < 1000000 ? `${fmt(v)}x` : '--' },
  ];

  return (
    <ChartCard
      title="Comparacion Multi-Periodo"
      description={`${validResults.length} periodos seleccionados`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="pb-2 text-left font-medium">Indicador</th>
              {validResults.map((r) => (
                <th key={r.year} className="pb-2 text-right font-medium">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {indicators.map((ind) => (
              <tr key={ind.key} className="border-b border-border/30 last:border-0">
                <td className="py-2 font-medium">{ind.label}</td>
                {validResults.map((r) => (
                  <td key={r.year} className="py-2 text-right font-mono">
                    {ind.format(ind.extract(r.data))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

// ─── Essential KPIs Component ────────────────────────────────
function EssentialKpis({ primary, deltas }) {
  const { avgTicket, grossMargin, netMargin, liquidity, ebitda } = primary;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiCard
        title="Ticket Promedio"
        value={fmtUsd(avgTicket?.value)}
        subtitle={`${fmt(avgTicket?.orderCount, 0)} ordenes`}
        status={avgTicket?.value > 0 ? 'good' : 'no_data'}
        icon={DollarSign}
        delta={deltas?.avgTicket}
      />
      <KpiCard
        title="Margen Bruto"
        value={fmtPct(grossMargin?.grossMarginPercent)}
        subtitle={`Ganancia: ${fmtUsd(grossMargin?.grossProfit)}`}
        status={grossMargin?.status || 'no_data'}
        icon={TrendingUp}
        delta={deltas?.grossMarginPercent}
      />
      <KpiCard
        title="Margen Neto"
        value={fmtPct(netMargin?.netMarginPercent)}
        subtitle={`Ingreso neto: ${fmtUsd(netMargin?.netIncome)}`}
        status={netMargin?.status || 'no_data'}
        icon={PiggyBank}
        delta={deltas?.netMarginPercent}
      />
      <KpiCard
        title="Liquidez"
        value={liquidity?.liquidityRatio != null ? `${fmt(liquidity.liquidityRatio)}x` : '--'}
        subtitle={`Activos: ${fmtUsd(liquidity?.currentAssets)}`}
        status={liquidity?.status || 'no_data'}
        icon={Droplets}
        delta={deltas?.liquidityRatio}
      />
      <KpiCard
        title="EBITDA"
        value={fmtUsd(ebitda?.ebitda)}
        subtitle={`Margen: ${fmtPct(ebitda?.ebitdaMargin)}`}
        status={
          ebitda?.ebitda > 0 ? 'good' : ebitda?.ebitda === 0 ? 'warning' : 'danger'
        }
        icon={Calculator}
        delta={deltas?.ebitda}
      />
    </div>
  );
}

// ─── Detailed Analysis Component ─────────────────────────────
function DetailedAnalysis({ primary, results, deltas, isComparing }) {
  const {
    avgTicket,
    grossMargin,
    contributionMargin,
    fixedVsVariable,
    netMargin,
    breakEven,
    inventoryTurnover,
    roi,
  } = primary;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="detailed" className="border rounded-lg px-4">
        <AccordionTrigger className="text-base font-semibold hover:no-underline">
          📊 Ver Análisis Detallado
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          {/* Revenue vs Expenses summary when comparing */}
          {isComparing && deltas?.avgTicket && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="border bg-background">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold">{fmtUsd(primary?.grossMargin?.revenue)}</p>
                    <DeltaBadge delta={computeDelta(
                      results[0]?.data?.grossMargin?.revenue,
                      results[1]?.data?.grossMargin?.revenue,
                    )} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {results[1]?.label}: {fmtUsd(results[1]?.data?.grossMargin?.revenue)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border bg-background">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Egresos</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold">{fmtUsd(primary?.netMargin?.totalExpenses)}</p>
                    <DeltaBadgeInverse delta={deltas?.totalExpenses} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {results[1]?.label}: {fmtUsd(results[1]?.data?.netMargin?.totalExpenses)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border bg-background">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Ingreso Neto</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-lg font-bold ${(primary?.netMargin?.netIncome ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtUsd(primary?.netMargin?.netIncome)}
                    </p>
                    <DeltaBadge delta={computeDelta(
                      results[0]?.data?.netMargin?.netIncome,
                      results[1]?.data?.netMargin?.netIncome,
                    )} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {results[1]?.label}: {fmtUsd(results[1]?.data?.netMargin?.netIncome)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border bg-background">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">EBITDA</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-lg font-bold ${(primary?.ebitda?.ebitda ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtUsd(primary?.ebitda?.ebitda)}
                    </p>
                    <DeltaBadge delta={deltas?.ebitda} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {results[1]?.label}: {fmtUsd(results[1]?.data?.ebitda?.ebitda)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Row 2: Margin Analysis Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MarginsComparison
              grossMargin={grossMargin}
              contributionMargin={contributionMargin}
              netMargin={netMargin}
            />
            <CostBreakdownPie data={fixedVsVariable} />
          </div>

          {/* Row 3: Break Even + Ticket Trend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BreakEvenGauge data={breakEven} />
            <TicketTrendChart trend={avgTicket?.trend} />
          </div>

          {/* Row 4: Inventory Turnover + ROI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InventoryTurnoverTable data={inventoryTurnover} />

            {roi?.hasInvestments ? (
              <ChartCard
                title="Retorno de Inversion (ROI)"
                description={`${roi.investmentCount} inversiones registradas`}
              >
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <p className={`text-4xl font-bold ${roi.roiPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {fmtPct(roi.roiPercent)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">ROI Global</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs border-t pt-3">
                    <div>
                      <p className="text-muted-foreground">Invertido</p>
                      <p className="font-semibold">{fmtUsd(roi.totalInvested)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Retorno</p>
                      <p className="font-semibold">{fmtUsd(roi.totalReturn)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ganancia Neta</p>
                      <p className={`font-semibold ${roi.netGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmtUsd(roi.netGain)}
                      </p>
                    </div>
                  </div>
                  {roi.byCategory?.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Por Categoria</p>
                      {roi.byCategory.map((cat, i) => (
                        <div key={i} className="flex justify-between text-xs py-1">
                          <span className="capitalize">{cat.category}</span>
                          <span className={cat.roi >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {cat.roi != null ? fmtPct(cat.roi) : '--'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ChartCard>
            ) : (
              <ChartCard title="Retorno de Inversion (ROI)">
                <ChartEmptyState message="Registra inversiones para calcular el ROI. Este modulo permite rastrear inversiones en marketing, equipos, tecnologia y expansion." />
              </ChartCard>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// ─── CSV Export ──────────────────────────────────────────────
function exportKpisCsv(data) {
  if (!data?.avgTicket) return;
  const { avgTicket, grossMargin, contributionMargin, fixedVsVariable, netMargin, breakEven, inventoryTurnover, liquidity, ebitda, roi, period } = data;
  const periodLabel = period ? `${new Date(period.from).toLocaleDateString('es-VE')} - ${new Date(period.to).toLocaleDateString('es-VE')}` : '';

  const rows = [
    ['KPI', 'Valor', 'Detalle', 'Periodo'],
    ['Ticket Promedio', avgTicket?.value ?? '', `${avgTicket?.totalOrders ?? 0} ordenes`, periodLabel],
    ['Margen Bruto', grossMargin?.percent != null ? `${grossMargin.percent}%` : '', `Ingresos: ${grossMargin?.revenue ?? 0} / COGS: ${grossMargin?.cogs ?? 0}`, periodLabel],
    ['Margen de Contribución', contributionMargin?.percent != null ? `${contributionMargin.percent}%` : '', `Variable: ${contributionMargin?.variableCosts ?? 0}`, periodLabel],
    ['Costos Fijos vs Variables', '', `Fijos: ${fixedVsVariable?.fixed ?? 0} / Variables: ${fixedVsVariable?.variable ?? 0}`, periodLabel],
    ['Margen Neto', netMargin?.percent != null ? `${netMargin.percent}%` : '', `Ingresos: ${netMargin?.revenue ?? 0} / Gastos: ${netMargin?.totalExpenses ?? 0}`, periodLabel],
    ['Punto de Equilibrio', breakEven?.breakEvenRevenue ?? '', `Ratio: ${breakEven?.ratio ?? ''}`, periodLabel],
    ['Rotación de Inventario', inventoryTurnover?.turns ?? '', `COGS: ${inventoryTurnover?.cogs ?? 0} / Inv. Prom: ${inventoryTurnover?.avgInventory ?? 0}`, periodLabel],
    ['Liquidez', liquidity?.currentRatio ?? '', `Circulante: ${liquidity?.currentAssets ?? 0} / Pasivo: ${liquidity?.currentLiabilities ?? 0}`, periodLabel],
    ['EBITDA', ebitda?.value ?? '', `Ingresos: ${ebitda?.revenue ?? 0}`, periodLabel],
    ['ROI', roi?.percent != null ? `${roi.percent}%` : '', `Ganancia: ${roi?.netGain ?? 0} / Inversión: ${roi?.totalInvestment ?? 0}`, periodLabel],
  ];

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kpis-financieros-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Dashboard ──────────────────────────────────────────
export function FinancialKpisDashboard() {
  const now = new Date();
  const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // State for period selector
  const [selectedYears, setSelectedYears] = useState(() => new Set([now.getFullYear()]));
  const [selectedMonths, setSelectedMonths] = useState(() => new Set([now.getMonth()]));

  // Build periods from selected years and months
  const periods = useMemo(
    () => buildPeriods([...selectedYears], [...selectedMonths]),
    [selectedYears, selectedMonths]
  );

  const { results, primary, loading, error } = useFinancialKpis(periods);

  const isComparing = results.filter((r) => r.data).length > 1;

  // Compute deltas between the two most recent periods
  const deltas = useMemo(() => {
    if (results.length < 2) return {};
    const a = results[0]?.data;
    const b = results[1]?.data;
    if (!a || !b) return {};

    return {
      avgTicket: computeDelta(a?.avgTicket?.value, b?.avgTicket?.value),
      grossMarginPercent: computeDelta(a?.grossMargin?.grossMarginPercent, b?.grossMargin?.grossMarginPercent),
      netMarginPercent: computeDelta(a?.netMargin?.netMarginPercent, b?.netMargin?.netMarginPercent),
      ebitda: computeDelta(a?.ebitda?.ebitda, b?.ebitda?.ebitda),
      liquidityRatio: computeDelta(a?.liquidity?.liquidityRatio, b?.liquidity?.liquidityRatio),
      totalExpenses: computeDelta(a?.netMargin?.totalExpenses, b?.netMargin?.totalExpenses),
    };
  }, [results]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">KPIs Financieros</h3>
          <PeriodSelector
            selectedYears={selectedYears}
            selectedMonths={selectedMonths}
            onYearsChange={setSelectedYears}
            onMonthsChange={setSelectedMonths}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><ChartSkeleton /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">KPIs Financieros</h3>
          <PeriodSelector
            selectedYears={selectedYears}
            selectedMonths={selectedMonths}
            onYearsChange={setSelectedYears}
            onMonthsChange={setSelectedMonths}
          />
        </div>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!primary?.avgTicket) {
    return (
      <div className="space-y-4">
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
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay datos financieros disponibles para este periodo.</p>
          </CardContent>
        </Card>
        <ExpenseIncomeBreakdown />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with PeriodSelector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">KPIs Financieros</h3>
          <p className="text-sm text-muted-foreground">
            Indicadores clave de rendimiento financiero
            {primary.period && (
              <span className="ml-1">
                ({new Date(primary.period.from).toLocaleDateString('es-VE')} - {new Date(primary.period.to).toLocaleDateString('es-VE')})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector
            selectedYears={selectedYears}
            selectedMonths={selectedMonths}
            onYearsChange={setSelectedYears}
            onMonthsChange={setSelectedMonths}
          />
          <button
            type="button"
            onClick={() => exportKpisCsv(primary)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border bg-background text-muted-foreground border-border hover:bg-muted transition-colors"
            title="Exportar KPIs a CSV"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Essential KPIs */}
      <EssentialKpis primary={primary} deltas={deltas} />

      {/* Multi-period comparison table */}
      {isComparing && <MultiYearComparison results={results} />}

      {/* Detailed Analysis (collapsible) */}
      <DetailedAnalysis
        primary={primary}
        results={results}
        deltas={deltas}
        isComparing={isComparing}
      />

      {/* Expense/Income Drill-Down */}
      <ExpenseIncomeBreakdown />
    </div>
  );
}
