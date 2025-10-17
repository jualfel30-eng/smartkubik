import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartCard, ChartEmptyState } from './BaseChart.jsx';
import { chartPalette, defaultTooltipProps } from './chart-theme.js';

function mergeSeries(revenues = [], expenses = []) {
  const map = new Map();

  revenues.forEach((item) => {
    map.set(item.period, { period: item.period, revenues: item.total ?? 0, expenses: 0 });
  });

  expenses.forEach((item) => {
    const current = map.get(item.period) ?? { period: item.period, revenues: 0, expenses: 0 };
    current.expenses = item.total ?? 0;
    map.set(item.period, current);
  });

  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export function ProfitAndLossChart({ data }) {
  const merged = mergeSeries(data?.revenues, data?.expenses);

  if (!merged.length) {
    return (
      <ChartCard title="Estado de Resultados" description="Ingresos vs egresos por período">
        <ChartEmptyState message="Activa los reportes avanzados para visualizar el estado de resultados." />
      </ChartCard>
    );
  }

  const summary = data?.summary ?? { revenueTotal: 0, expenseTotal: 0, netIncome: 0 };

  return (
    <ChartCard
      title="Estado de Resultados"
      description="Comparativa de ingresos y egresos"
      actions={
        <span className="text-xs text-muted-foreground">
          Resultado neto: ${summary.netIncome.toFixed(2)}
        </span>
      }
    >
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={merged}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartPalette[0]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={chartPalette[0]} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartPalette[2]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={chartPalette[2]} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
          <XAxis dataKey="period" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip {...defaultTooltipProps} />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenues"
            stroke={chartPalette[0]}
            fill="url(#revenueGradient)"
            strokeWidth={3}
            name="Ingresos"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke={chartPalette[2]}
            fill="url(#expenseGradient)"
            strokeWidth={3}
            name="Egresos"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
