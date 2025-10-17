import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard, ChartEmptyState } from './BaseChart.jsx';
import { chartPalette, defaultTooltipProps } from './chart-theme.js';

export function SalesByCategoryChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Ventas por Categoría" description="Distribución de ingresos principales">
        <ChartEmptyState message="Registra ventas con productos categorizados para visualizar esta gráfica." />
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Ventas por Categoría" description="Top 6 categorías del período">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            dataKey="totalAmount"
            nameKey="name"
            innerRadius={70}
            outerRadius={120}
            paddingAngle={4}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={chartPalette[index % chartPalette.length]} />
            ))}
          </Pie>
          <Tooltip {...defaultTooltipProps} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
