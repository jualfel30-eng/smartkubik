import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
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
import { Card, CardContent } from '@/components/ui/card.jsx';
import { ChartCard, ChartSkeleton } from './BaseChart.jsx';
import { chartPalette, defaultTooltipProps } from './chart-theme.js';
import { PeriodSelector, buildPeriods } from './PeriodSelector.jsx';
import { MetricSelector } from './MetricSelector.jsx';
import { SavedViewsManager } from './SavedViewsManager.jsx';
import { useCustomMetrics } from '@/hooks/use-custom-metrics';
import { Info, XCircle } from 'lucide-react';

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

// ─── Metric Visualizations ──────────────────────────────────
function BarChartMetric({ data }) {
  if (!data?.labels?.length) return null;

  const chartData = data.labels.map((label, idx) => ({
    name: label,
    value: data.values[idx] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <Tooltip
          {...defaultTooltipProps}
          formatter={(val) => fmtUsd(val)}
        />
        <Bar dataKey="value" fill={chartPalette[0]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartMetric({ data }) {
  if (!data?.labels?.length) return null;

  const chartData = data.labels.map((label, idx) => ({
    name: label,
    value: data.values[idx] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={chartPalette[idx % chartPalette.length]} />
          ))}
        </Pie>
        <Tooltip
          {...defaultTooltipProps}
          formatter={(val) => fmtUsd(val)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function TableMetric({ data }) {
  if (!data?.rows?.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Concepto</th>
            <th className="pb-2 font-medium text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, idx) => (
            <tr key={idx} className="border-b border-border/30 last:border-0">
              <td className="py-2">{row.label}</td>
              <td className="py-2 text-right font-mono">
                {typeof row.value === 'number' ? fmtUsd(row.value) : row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarginByProductTable({ data }) {
  if (!data?.rows?.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Producto</th>
            <th className="pb-2 font-medium text-right">Ingresos</th>
            <th className="pb-2 font-medium text-right">Costo</th>
            <th className="pb-2 font-medium text-right">Margen</th>
            <th className="pb-2 font-medium text-right">Margen %</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, idx) => (
            <tr key={idx} className="border-b border-border/30 last:border-0">
              <td className="py-2 max-w-[200px] truncate" title={row.product}>
                {row.product}
              </td>
              <td className="py-2 text-right font-mono">{fmtUsd(row.revenue)}</td>
              <td className="py-2 text-right font-mono">{fmtUsd(row.cost)}</td>
              <td className={`py-2 text-right font-mono font-semibold ${
                row.margin >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {fmtUsd(row.margin)}
              </td>
              <td className="py-2 text-right font-mono">{fmtPct(row.marginPercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryValueTable({ data }) {
  if (!data?.rows?.length) return null;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Producto</th>
              <th className="pb-2 font-medium text-right">Cantidad</th>
              <th className="pb-2 font-medium text-right">Costo Unit.</th>
              <th className="pb-2 font-medium text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className="border-b border-border/30 last:border-0">
                <td className="py-2 max-w-[200px] truncate" title={row.product}>
                  {row.product}
                </td>
                <td className="py-2 text-right font-mono">{fmt(row.quantity, 0)}</td>
                <td className="py-2 text-right font-mono">{fmtUsd(row.costPrice)}</td>
                <td className="py-2 text-right font-mono font-semibold">
                  {fmtUsd(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.totalValue != null && (
        <div className="flex justify-between items-center pt-2 border-t font-semibold">
          <span>Valor Total de Inventario</span>
          <span className="text-lg">{fmtUsd(data.totalValue)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Metric Renderer ────────────────────────────────────
function MetricCard({ metric }) {
  const { id, label, chartType, data, error } = metric;

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-4 text-center">
          <XCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <Info className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  // Special renderers for specific metrics
  if (id === 'margin_by_product') {
    return (
      <ChartCard title={label}>
        <MarginByProductTable data={data} />
      </ChartCard>
    );
  }

  if (id === 'inventory_value') {
    return (
      <ChartCard title={label}>
        <InventoryValueTable data={data} />
      </ChartCard>
    );
  }

  // Generic renderers based on chartType
  return (
    <ChartCard title={label}>
      {chartType === 'bar' && <BarChartMetric data={data} />}
      {chartType === 'pie' && <PieChartMetric data={data} />}
      {chartType === 'table' && <TableMetric data={data} />}
      {!['bar', 'pie', 'table'].includes(chartType) && (
        <p className="text-sm text-muted-foreground">Tipo de gráfica no soportado</p>
      )}
    </ChartCard>
  );
}

// ─── Main Component ──────────────────────────────────────────
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

  // Handler for loading saved views (Phase 3)
  const handleLoadView = (view) => {
    if (view.metrics) {
      setSelectedMetrics(view.metrics);
    }
    if (view.years) {
      setSelectedYears(new Set(view.years));
    }
    if (view.months) {
      setSelectedMonths(new Set(view.months));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Análisis Personalizado</h3>
          <p className="text-sm text-muted-foreground">
            Selecciona las métricas que deseas analizar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SavedViewsManager
            selectedMetrics={selectedMetrics}
            selectedYears={selectedYears}
            selectedMonths={selectedMonths}
            onLoadView={handleLoadView}
          />
          <PeriodSelector
            selectedYears={selectedYears}
            selectedMonths={selectedMonths}
            onYearsChange={setSelectedYears}
            onMonthsChange={setSelectedMonths}
          />
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar: Metric Selector */}
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

        {/* Main Content: Visualizations */}
        <div className="lg:col-span-3 space-y-4">
          {loading && (
            <Card>
              <CardContent className="p-6">
                <ChartSkeleton />
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-6 text-center">
                <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && selectedMetrics.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-base font-medium mb-2">
                  Selecciona métricas para comenzar
                </p>
                <p className="text-sm">
                  Usa el panel izquierdo para elegir las métricas que deseas analizar
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && data?.metrics && data.metrics.length > 0 &&
            data.metrics.map((metric, idx) => (
              <MetricCard key={metric.id || `metric-${idx}`} metric={metric} />
            ))
          }
        </div>
      </div>
    </div>
  );
}
