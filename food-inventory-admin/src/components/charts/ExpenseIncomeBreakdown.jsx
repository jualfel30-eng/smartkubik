import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { ChartCard, ChartEmptyState, ChartSkeleton } from './BaseChart.jsx';
import { chartPalette, defaultTooltipProps } from './chart-theme.js';
import { MultiMonthPicker, CustomRangeIndicator } from './MultiMonthPicker.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.jsx';
import { useExpenseIncomeBreakdown } from '@/hooks/use-expense-income-breakdown';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  XCircle,
  Info,
  GitCompareArrows,
  CalendarRange,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { value: '7d', label: '7 dias' },
  { value: '14d', label: '14 dias' },
  { value: '30d', label: '30 dias' },
  { value: '60d', label: '60 dias' },
  { value: '90d', label: '90 dias' },
  { value: '180d', label: '180 dias' },
  { value: '365d', label: '1 ano' },
];

const GRANULARITY_OPTIONS = [
  { value: 'month', label: 'Mensual' },
  { value: 'quarter', label: 'Trimestral' },
  { value: 'year', label: 'Anual' },
];

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
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${color}`}
    >
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
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${color}`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(delta.percentChange).toFixed(1)}%
    </span>
  );
}

// ─── Chart sub-components ────────────────────────────────────
function GroupHorizontalBar({ groups, palette }) {
  if (!groups?.length) return null;

  const chartData = groups.map((g, i) => ({
    name: g.label,
    total: g.total,
    percentage: g.percentage,
    fill: palette[i % palette.length],
  }));

  return (
    <ResponsiveContainer
      width="100%"
      height={Math.max(200, groups.length * 48)}
    >
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 20, right: 60 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="rgba(148, 163, 184, 0.35)"
        />
        <XAxis
          type="number"
          tickFormatter={(v) =>
            v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
          }
          stroke="#94a3b8"
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={180}
          stroke="#94a3b8"
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          {...defaultTooltipProps}
          formatter={(value, name, props) => [
            `${fmtUsd(value)} (${props.payload.percentage}%)`,
            'Total',
          ]}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={28}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function GroupTrendChart({ trend, label, color }) {
  if (!trend?.length || trend.length < 2) {
    return (
      <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">
        No hay suficientes datos temporales.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={trend}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(148, 163, 184, 0.35)"
        />
        <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <YAxis
          tickFormatter={(v) =>
            v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
          }
          stroke="#94a3b8"
          tick={{ fontSize: 10 }}
        />
        <Tooltip
          {...defaultTooltipProps}
          formatter={(v) => [fmtUsd(v), label]}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DrillDownTable({ items }) {
  if (!items?.length) {
    return (
      <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">
        Sin datos de detalle.
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b sticky top-0 bg-background">
          <tr>
            <th className="text-left py-2 pr-4 font-medium">Nombre</th>
            <th className="text-right py-2 px-2 font-medium">Total</th>
            <th className="text-right py-2 px-2 font-medium">Cant.</th>
            <th className="text-right py-2 pl-2 font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border/30 last:border-0">
              <td
                className="py-1.5 pr-4 truncate max-w-[200px]"
                title={item.name}
              >
                {item.name}
              </td>
              <td className="py-1.5 px-2 text-right font-medium font-mono">
                {fmtUsd(item.total)}
              </td>
              <td className="py-1.5 px-2 text-right text-muted-foreground font-mono">
                {fmt(item.count, 0)}
              </td>
              <td className="py-1.5 pl-2 text-right text-muted-foreground font-mono">
                {fmtPct(item.percentage)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupAccordion({ groups, palette, isExpense }) {
  if (!groups?.length) return null;

  return (
    <Accordion type="multiple" className="space-y-2">
      {groups.map((group, i) => (
        <AccordionItem
          key={group.key}
          value={group.key}
          className="border rounded-lg px-4"
        >
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{
                    backgroundColor: palette[i % palette.length],
                  }}
                />
                <span className="font-medium text-sm text-left">
                  {group.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground text-xs">
                  {fmtPct(group.percentage)}
                </span>
                <span className="font-semibold">{fmtUsd(group.total)}</span>
                {group.delta &&
                  (isExpense ? (
                    <DeltaBadgeInverse delta={group.delta} />
                  ) : (
                    <DeltaBadge delta={group.delta} />
                  ))}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Tendencia Temporal
                </p>
                <GroupTrendChart
                  trend={group.trend}
                  label={group.label}
                  color={palette[i % palette.length]}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Desglose ({group.drillDown?.length ?? 0} items)
                </p>
                <DrillDownTable items={group.drillDown} />
              </div>
            </div>
            {group.delta && (
              <div className="border-t pt-2 pb-1 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Periodo anterior: {fmtUsd(group.delta.previous)}</span>
                <span>
                  Cambio: {group.delta.absoluteChange > 0 ? '+' : ''}
                  {fmtUsd(group.delta.absoluteChange)}
                </span>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// ─── Controls bar ────────────────────────────────────────────
function BreakdownControls({
  period,
  setPeriod,
  granularity,
  setGranularity,
  compare,
  setCompare,
  groupBy,
  setGroupBy,
  showDatePanel,
  setShowDatePanel,
  customRange,
  dataPeriod,
}) {
  const periodLabel = customRange
    ? `${new Date(customRange.from).toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })} - ${new Date(customRange.to).toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })}`
    : null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-lg font-semibold">
          Desglose de Gastos e Ingresos
        </h3>
        <p className="text-sm text-muted-foreground">
          Analisis drill-down por {groupBy === 'account' ? 'cuenta contable' : 'tipo'}
          {dataPeriod && (
            <span className="ml-1">
              ({new Date(dataPeriod.from).toLocaleDateString('es-VE')} -{' '}
              {new Date(dataPeriod.to).toLocaleDateString('es-VE')})
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* GroupBy toggle */}
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setGroupBy('type')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              groupBy === 'type'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            Por Tipo
          </button>
          <button
            type="button"
            onClick={() => setGroupBy('account')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-border ${
              groupBy === 'account'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            Por Cuenta
          </button>
        </div>

        {/* Compare button */}
        <button
          type="button"
          onClick={() => setCompare((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            compare
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:bg-muted'
          }`}
          title="Comparar vs periodo anterior"
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          vs Anterior
        </button>

        {/* Granularity */}
        <Select value={granularity} onValueChange={setGranularity}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRANULARITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range picker toggle */}
        <button
          type="button"
          onClick={() => setShowDatePanel((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            showDatePanel || customRange
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:bg-muted'
          }`}
          title="Seleccionar mes/trimestre/ano"
        >
          <CalendarRange className="h-3.5 w-3.5" />
          {periodLabel || 'Periodo'}
        </button>

        {/* Quick period selector (only shown when no custom range) */}
        {!customRange && (
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────
export function ExpenseIncomeBreakdown() {
  const [period, setPeriod] = useState('90d');
  const [granularity, setGranularity] = useState('month');
  const [compare, setCompare] = useState(false);
  const [groupBy, setGroupBy] = useState('type');
  const [showDatePanel, setShowDatePanel] = useState(false);
  const [customRange, setCustomRange] = useState(null);

  const fromDate = customRange?.from ?? null;
  const toDate = customRange?.to ?? null;

  const { data, loading, error } = useExpenseIncomeBreakdown(
    period,
    granularity,
    compare,
    groupBy,
    fromDate,
    toDate,
  );

  const handleDateApply = (from, to) => {
    setCustomRange({ from, to });
    setShowDatePanel(false);
  };

  const handleClearCustomRange = () => {
    setCustomRange(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Desglose de Gastos e Ingresos
          </h3>
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const expenses = data?.expenses;
  const income = data?.income;

  if (!expenses?.groups?.length && !income?.groups?.length) {
    return (
      <div className="space-y-4">
        <BreakdownControls
          period={period}
          setPeriod={setPeriod}
          granularity={granularity}
          setGranularity={setGranularity}
          compare={compare}
          setCompare={setCompare}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          showDatePanel={showDatePanel}
          setShowDatePanel={setShowDatePanel}
          customRange={customRange}
          dataPeriod={data?.period}
        />
        {showDatePanel && (
          <MultiMonthPicker
            onApply={handleDateApply}
            onClose={() => setShowDatePanel(false)}
          />
        )}
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              No hay datos de gastos ni ingresos disponibles para este periodo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const netResult = (income?.total ?? 0) - (expenses?.total ?? 0);

  return (
    <div className="space-y-4">
      <BreakdownControls
        period={period}
        setPeriod={(v) => {
          setPeriod(v);
          setCustomRange(null);
        }}
        granularity={granularity}
        setGranularity={setGranularity}
        compare={compare}
        setCompare={setCompare}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        showDatePanel={showDatePanel}
        setShowDatePanel={setShowDatePanel}
        customRange={customRange}
        dataPeriod={data?.period}
      />

      {/* Date range panel */}
      {showDatePanel && (
        <MultiMonthPicker
          onApply={handleDateApply}
          onClose={() => setShowDatePanel(false)}
        />
      )}

      {/* Custom range indicator */}
      {customRange && !showDatePanel && (
        <CustomRangeIndicator
          customRange={customRange}
          onClear={handleClearCustomRange}
        />
      )}

      {/* Summary totals */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Gastos
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {fmtUsd(expenses?.total)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses?.groups?.length ?? 0} grupos
            </p>
          </CardContent>
        </Card>
        <Card className="border bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Ingresos
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {fmtUsd(income?.total)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {income?.groups?.length ?? 0} categorias
            </p>
          </CardContent>
        </Card>
        <Card
          className={`border ${
            netResult >= 0
              ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
              : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          }`}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Resultado Neto
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${
                netResult >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {fmtUsd(netResult)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ingresos - Gastos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed view */}
      <Tabs defaultValue="expenses">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">
            Gastos ({expenses?.groups?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="income">
            Ingresos ({income?.groups?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          {expenses?.groups?.length > 0 ? (
            <>
              <ChartCard
                title={
                  groupBy === 'account'
                    ? 'Gastos por Cuenta Contable'
                    : 'Gastos por Grupo'
                }
                description="Haz clic en un grupo abajo para ver el desglose detallado"
              >
                <GroupHorizontalBar
                  groups={expenses.groups}
                  palette={chartPalette}
                />
              </ChartCard>
              <GroupAccordion
                groups={expenses.groups}
                palette={chartPalette}
                isExpense
              />
            </>
          ) : (
            <ChartEmptyState message="No hay gastos registrados en este periodo." />
          )}
        </TabsContent>

        <TabsContent value="income" className="space-y-4 mt-4">
          {income?.groups?.length > 0 ? (
            <>
              <ChartCard
                title="Ingresos por Categoria"
                description="Haz clic en una categoria abajo para ver el desglose detallado"
              >
                <GroupHorizontalBar
                  groups={income.groups}
                  palette={chartPalette}
                />
              </ChartCard>
              <GroupAccordion
                groups={income.groups}
                palette={chartPalette}
                isExpense={false}
              />
            </>
          ) : (
            <ChartEmptyState message="No hay ingresos registrados en este periodo." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
