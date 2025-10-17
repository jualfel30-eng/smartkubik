import {
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { ChartCard, ChartEmptyState } from './BaseChart.jsx';
import { chartPalette, defaultTooltipProps } from './chart-theme.js';

function formatPoints(data = []) {
  return data.map((item, index) => ({
    id: item.customerId ?? index,
    name: item.customerName ?? `Cliente ${index + 1}`,
    recencyDays: item.recencyDays ?? 0,
    frequency: item.frequency ?? 0,
    monetary: item.monetary ?? 0,
  }));
}

export function CustomerSegmentationChart({ data }) {
  const points = formatPoints(data);

  if (!points.length) {
    return (
      <ChartCard title="Segmentación de Clientes (RFM)" description="Recency, Frequency, Monetary">
        <ChartEmptyState message="Necesitas clientes con compras repetidas para calcular el CLV." />
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Segmentación de Clientes (RFM)" description="Mayores burbujas representan mayor valor monetario">
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
          <XAxis
            dataKey="recencyDays"
            name="Recency (días)"
            stroke="#94a3b8"
            reversed
          />
          <YAxis dataKey="frequency" name="Frecuencia" stroke="#94a3b8" />
          <ZAxis dataKey="monetary" range={[60, 200]} />
          <Tooltip
            {...defaultTooltipProps}
            formatter={(_, __, payload) => [
              `$${payload.payload.monetary.toFixed(2)}`,
              payload.payload.name,
            ]}
          />
          <Scatter data={points} fill={chartPalette[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
