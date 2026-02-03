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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { useFinancialKpis, useKpiComparison } from '@/hooks/use-financial-kpis';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Target,
  Package,
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
  GitCompareArrows,
  CalendarRange,
  X,
  Loader2,
  Download,
} from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 dias' },
  { value: '14d', label: '14 dias' },
  { value: '30d', label: '30 dias' },
  { value: '60d', label: '60 dias' },
  { value: '90d', label: '90 dias' },
  { value: '180d', label: '180 dias' },
  { value: '365d', label: '1 año' },
];

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

// ─── Month/Year helpers ─────────────────────────────────────
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getMonthRange(year, month) {
  const from = new Date(year, month, 1, 0, 0, 0, 0);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

function getYearRange(year) {
  const from = new Date(year, 0, 1, 0, 0, 0, 0);
  const to = new Date(year, 11, 31, 23, 59, 59, 999);
  return { from, to };
}

function getQuarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  const from = new Date(year, startMonth, 1, 0, 0, 0, 0);
  const to = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { from, to };
}

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y);
  }
  return years;
}

// ─── MonthYearPicker ────────────────────────────────────────
function MonthYearPicker({ label, selectedYear, selectedMonth, onChangeYear, onChangeMonth, color }) {
  return (
    <div className="space-y-2">
      <p className={`text-xs font-semibold ${color || 'text-foreground'}`}>{label}</p>
      <div className="flex gap-2">
        <Select value={String(selectedYear)} onValueChange={(v) => onChangeYear(Number(v))}>
          <SelectTrigger className="w-[90px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {buildYearOptions().map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(selectedMonth)} onValueChange={(v) => onChangeMonth(Number(v))}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, idx) => (
              <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── ComparisonPanel ────────────────────────────────────────
function ComparisonPanel({ onCompare, loading, onClose }) {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [yearA, setYearA] = useState(now.getFullYear());
  const [monthA, setMonthA] = useState(now.getMonth());
  const [yearB, setYearB] = useState(prevYear);
  const [monthB, setMonthB] = useState(prevMonth);
  const [mode, setMode] = useState('month'); // 'month' | 'quarter' | 'year'
  const [quarterA, setQuarterA] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [quarterB, setQuarterB] = useState(quarterA > 1 ? quarterA - 1 : 4);

  const handleCompare = () => {
    let rangeA, rangeB;
    if (mode === 'month') {
      rangeA = getMonthRange(yearA, monthA);
      rangeB = getMonthRange(yearB, monthB);
    } else if (mode === 'quarter') {
      rangeA = getQuarterRange(yearA, quarterA);
      rangeB = getQuarterRange(yearB, quarterB);
    } else {
      rangeA = getYearRange(yearA);
      rangeB = getYearRange(yearB);
    }
    onCompare(rangeA.from, rangeA.to, rangeB.from, rangeB.to);
  };

  const labelA = mode === 'month'
    ? `${MONTH_NAMES[monthA]} ${yearA}`
    : mode === 'quarter'
      ? `Q${quarterA} ${yearA}`
      : String(yearA);
  const labelB = mode === 'month'
    ? `${MONTH_NAMES[monthB]} ${yearB}`
    : mode === 'quarter'
      ? `Q${quarterB} ${yearB}`
      : String(yearB);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Comparar periodos</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1">
          {[
            { key: 'month', label: 'Mes' },
            { key: 'quarter', label: 'Trimestre' },
            { key: 'year', label: 'Año' },
          ].map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === m.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground border border-border hover:bg-muted'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Period A */}
          <div className="space-y-2 p-3 rounded-lg border bg-background">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Periodo A</p>
            <div className="flex gap-2">
              <Select value={String(yearA)} onValueChange={(v) => setYearA(Number(v))}>
                <SelectTrigger className="w-[90px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buildYearOptions().map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mode === 'month' && (
                <Select value={String(monthA)} onValueChange={(v) => setMonthA(Number(v))}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, idx) => (
                      <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {mode === 'quarter' && (
                <Select value={String(quarterA)} onValueChange={(v) => setQuarterA(Number(v))}>
                  <SelectTrigger className="w-[90px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((q) => (
                      <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Period B */}
          <div className="space-y-2 p-3 rounded-lg border bg-background">
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">Periodo B</p>
            <div className="flex gap-2">
              <Select value={String(yearB)} onValueChange={(v) => setYearB(Number(v))}>
                <SelectTrigger className="w-[90px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buildYearOptions().map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mode === 'month' && (
                <Select value={String(monthB)} onValueChange={(v) => setMonthB(Number(v))}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, idx) => (
                      <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {mode === 'quarter' && (
                <Select value={String(quarterB)} onValueChange={(v) => setQuarterB(Number(v))}>
                  <SelectTrigger className="w-[90px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((q) => (
                      <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={handleCompare}
          disabled={loading}
          size="sm"
          className="w-full"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Comparando...</>
          ) : (
            <><GitCompareArrows className="h-4 w-4 mr-2" /> Comparar {labelA} vs {labelB}</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── ComparisonResults ──────────────────────────────────────
function ComparisonResults({ data }) {
  if (!data?.deltas) return null;

  const { summaryA, summaryB, deltas, periodA, periodB } = data;

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' });
  const labelA = `${fmtDate(periodA.from)} - ${fmtDate(periodA.to)}`;
  const labelB = `${fmtDate(periodB.from)} - ${fmtDate(periodB.to)}`;

  const rows = [
    { label: 'Ingresos', a: summaryA.totalRevenue, b: summaryB.totalRevenue, delta: deltas.totalRevenue, format: fmtUsd },
    { label: 'Egresos', a: summaryA.totalExpenses, b: summaryB.totalExpenses, delta: deltas.totalExpenses, format: fmtUsd, inverse: true },
    { label: 'Ingreso Neto', a: summaryA.netIncome, b: summaryB.netIncome, delta: deltas.netIncome, format: fmtUsd },
    { label: 'Ticket Promedio', a: summaryA.avgTicket, b: summaryB.avgTicket, delta: deltas.avgTicket, format: fmtUsd },
    { label: 'Margen Bruto', a: summaryA.grossMarginPercent, b: summaryB.grossMarginPercent, delta: deltas.grossMarginPercent, format: fmtPct },
    { label: 'Margen Neto', a: summaryA.netMarginPercent, b: summaryB.netMarginPercent, delta: deltas.netMarginPercent, format: fmtPct },
    { label: 'EBITDA', a: summaryA.ebitda, b: summaryB.ebitda, delta: deltas.ebitda, format: fmtUsd },
    { label: 'Liquidez', a: summaryA.liquidityRatio, b: summaryB.liquidityRatio, delta: deltas.liquidityRatio, format: (v) => v != null ? `${fmt(v)}x` : '--' },
  ];

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="pb-2 text-left font-medium">Indicador</th>
                <th className="pb-2 text-right font-medium text-blue-600 dark:text-blue-400">{labelA}</th>
                <th className="pb-2 text-right font-medium text-orange-600 dark:text-orange-400">{labelB}</th>
                <th className="pb-2 text-right font-medium">Cambio</th>
                <th className="pb-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0">
                  <td className="py-2 font-medium">{row.label}</td>
                  <td className="py-2 text-right font-mono">{row.format(row.a)}</td>
                  <td className="py-2 text-right font-mono">{row.format(row.b)}</td>
                  <td className="py-2 text-right">
                    {row.delta ? (
                      row.inverse
                        ? <DeltaBadgeInverse delta={row.delta} />
                        : <DeltaBadge delta={row.delta} />
                    ) : '--'}
                  </td>
                  <td className="py-2 text-right font-mono text-xs text-muted-foreground">
                    {row.delta?.percentChange != null ? `${row.delta.percentChange > 0 ? '+' : ''}${row.delta.percentChange.toFixed(1)}%` : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

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

export function FinancialKpisDashboard() {
  const [period, setPeriod] = useState('30d');
  const [compare, setCompare] = useState(false);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const { data, loading, error } = useFinancialKpis(period, compare);
  const {
    data: compareData,
    loading: compareLoading,
    error: compareError,
    compare: runComparison,
    reset: resetComparison,
  } = useKpiComparison();

  const deltas = data?.comparison?.deltas ?? {};

  const handleOpenCompare = () => {
    setShowComparePanel(true);
    setCompare(false);
  };

  const handleCloseCompare = () => {
    setShowComparePanel(false);
    resetComparison();
  };

  const handleRunComparison = (fromA, toA, fromB, toB) => {
    runComparison(fromA, toA, fromB, toB);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">KPIs Financieros</h3>
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
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.avgTicket) {
    return (
      <div className="space-y-4">
        <PeriodControls
          period={period}
          setPeriod={setPeriod}
          compare={compare}
          setCompare={setCompare}
          onOpenComparePanel={handleOpenCompare}
          dataPeriod={data?.period}
        />
        {showComparePanel && (
          <ComparisonPanel onCompare={handleRunComparison} loading={compareLoading} onClose={handleCloseCompare} />
        )}
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay datos financieros disponibles para este periodo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { avgTicket, grossMargin, contributionMargin, fixedVsVariable, netMargin, breakEven, inventoryTurnover, liquidity, ebitda, roi } = data;

  return (
    <div className="space-y-4">
      <PeriodControls
        period={period}
        setPeriod={setPeriod}
        compare={compare}
        setCompare={setCompare}
        onOpenComparePanel={handleOpenCompare}
        dataPeriod={data.period}
        onExportCsv={() => exportKpisCsv(data)}
      />

      {/* Comparison panel */}
      {showComparePanel && (
        <ComparisonPanel onCompare={handleRunComparison} loading={compareLoading} onClose={handleCloseCompare} />
      )}

      {/* Comparison results table */}
      {compareError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-destructive">{compareError}</p>
          </CardContent>
        </Card>
      )}
      {compareData?.deltas && <ComparisonResults data={compareData} />}

      {/* Row 1: Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          title="Ticket Promedio"
          value={fmtUsd(avgTicket.value)}
          subtitle={`${fmt(avgTicket.orderCount, 0)} ordenes`}
          status={avgTicket.value > 0 ? 'good' : 'no_data'}
          icon={DollarSign}
          detail={`Min: ${fmtUsd(avgTicket.minTicket)} | Max: ${fmtUsd(avgTicket.maxTicket)}`}
          delta={deltas.avgTicket}
        />
        <KpiCard
          title="Margen Bruto"
          value={fmtPct(grossMargin?.grossMarginPercent)}
          subtitle={`Ganancia: ${fmtUsd(grossMargin?.grossProfit)}`}
          status={grossMargin?.status || 'no_data'}
          icon={TrendingUp}
          delta={deltas.grossMarginPercent}
        />
        <KpiCard
          title="Margen Neto"
          value={fmtPct(netMargin?.netMarginPercent)}
          subtitle={`Ingreso neto: ${fmtUsd(netMargin?.netIncome)}`}
          status={netMargin?.status || 'no_data'}
          icon={PiggyBank}
          delta={deltas.netMarginPercent}
        />
        <KpiCard
          title="Liquidez"
          value={liquidity?.liquidityRatio != null ? `${fmt(liquidity.liquidityRatio)}x` : '--'}
          subtitle={`Activos: ${fmtUsd(liquidity?.currentAssets)}`}
          status={liquidity?.status || 'no_data'}
          icon={Droplets}
          detail={`Pasivos: ${fmtUsd(liquidity?.currentLiabilities)}`}
          delta={deltas.liquidityRatio}
        />
        <KpiCard
          title="EBITDA"
          value={fmtUsd(ebitda?.ebitda)}
          subtitle={`Margen: ${fmtPct(ebitda?.ebitdaMargin)}`}
          status={
            ebitda?.ebitda > 0 ? 'good' : ebitda?.ebitda === 0 ? 'warning' : 'danger'
          }
          icon={Calculator}
          detail={ebitda?.hasFixedAssets ? `${ebitda.assetsCount} activos registrados` : 'Sin activos fijos registrados'}
          delta={deltas.ebitda}
        />
      </div>

      {/* Revenue vs Expenses summary (quick comparison mode) */}
      {compare && deltas.totalRevenue && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border bg-background">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{fmtUsd(deltas.totalRevenue.current)}</p>
                <DeltaBadge delta={deltas.totalRevenue} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Anterior: {fmtUsd(deltas.totalRevenue.previous)}
              </p>
            </CardContent>
          </Card>
          <Card className="border bg-background">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Egresos</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{fmtUsd(deltas.totalExpenses.current)}</p>
                <DeltaBadgeInverse delta={deltas.totalExpenses} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Anterior: {fmtUsd(deltas.totalExpenses.previous)}
              </p>
            </CardContent>
          </Card>
          <Card className="border bg-background">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Ingreso Neto</p>
              <div className="flex items-center gap-2">
                <p className={`text-lg font-bold ${deltas.netIncome.current >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtUsd(deltas.netIncome.current)}
                </p>
                <DeltaBadge delta={deltas.netIncome} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Anterior: {fmtUsd(deltas.netIncome.previous)}
              </p>
            </CardContent>
          </Card>
          <Card className="border bg-background">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">EBITDA</p>
              <div className="flex items-center gap-2">
                <p className={`text-lg font-bold ${deltas.ebitda.current >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtUsd(deltas.ebitda.current)}
                </p>
                <DeltaBadge delta={deltas.ebitda} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Anterior: {fmtUsd(deltas.ebitda.previous)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Row 2: Charts */}
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
    </div>
  );
}

function PeriodControls({ period, setPeriod, compare, setCompare, onOpenComparePanel, dataPeriod, onExportCsv }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-lg font-semibold">KPIs Financieros</h3>
        <p className="text-sm text-muted-foreground">
          Indicadores clave de rendimiento financiero
          {dataPeriod && (
            <span className="ml-1">
              ({new Date(dataPeriod.from).toLocaleDateString('es-VE')} - {new Date(dataPeriod.to).toLocaleDateString('es-VE')})
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
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
          Rapida
        </button>
        <button
          type="button"
          onClick={onOpenComparePanel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border bg-background text-muted-foreground border-border hover:bg-muted transition-colors"
          title="Comparar periodos especificos"
        >
          <CalendarRange className="h-3.5 w-3.5" />
          Comparar
        </button>
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border bg-background text-muted-foreground border-border hover:bg-muted transition-colors"
            title="Exportar KPIs a CSV"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        )}
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
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
      </div>
    </div>
  );
}
