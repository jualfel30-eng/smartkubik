import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard, ChartEmptyState } from './BaseChart.jsx';
import { chartPalette, defaultTooltipProps } from './chart-theme.js';

export function SalesTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Tendencia de Ventas" description="Monto total confirmado por periodo">
        <ChartEmptyState message="Aún no hay ventas confirmadas en el período seleccionado." />
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Tendencia de Ventas" description="Monto total confirmado por período">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
          <XAxis dataKey="date" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <YAxis yAxisId="orders" orientation="right" stroke="#cbd5f5" />
          <Tooltip {...defaultTooltipProps} />
          <Line
            type="monotone"
            dataKey="totalAmount"
            stroke={chartPalette[0]}
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="orderCount"
            stroke={chartPalette[1]}
            strokeWidth={2}
            dot={false}
            yAxisId="orders"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
