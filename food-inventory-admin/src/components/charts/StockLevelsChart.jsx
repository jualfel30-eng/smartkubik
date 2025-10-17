import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartCard, ChartEmptyState } from './BaseChart.jsx';
import { chartPalette, defaultTooltipProps } from './chart-theme.js';

export function StockLevelsChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Distribución de Stock" description="Cantidad de productos según nivel de inventario">
        <ChartEmptyState message="No hay inventario registrado para calcular los niveles de stock." />
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Distribución de Stock" description="Productos agrupados por nivel de inventario">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <XAxis dataKey="label" stroke="#94a3b8" />
          <YAxis allowDecimals={false} stroke="#94a3b8" />
          <Tooltip {...defaultTooltipProps} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={chartPalette[index % chartPalette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
