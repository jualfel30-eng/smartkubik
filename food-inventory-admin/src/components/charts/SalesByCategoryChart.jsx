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

  // Calculate total and percentages
  const total = data.reduce((sum, item) => sum + item.totalAmount, 0);
  const dataWithPercentage = data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.totalAmount / total) * 100).toFixed(1) : 0,
  }));

  return (
    <ChartCard title="Ventas por Categoría" description="Top 6 categorías del período">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Pie Chart */}
        <div className="flex-shrink-0 w-full md:w-[320px] -ml-4">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={data}
                dataKey="totalAmount"
                nameKey="name"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={4}
                cx="50%"
                cy="50%"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={chartPalette[index % chartPalette.length]} />
                ))}
              </Pie>
              <Tooltip {...defaultTooltipProps} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category List with Percentages */}
        <div className="flex-1 flex flex-col justify-center space-y-3">
          {dataWithPercentage.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: chartPalette[index % chartPalette.length] }}
                />
                <span className="text-sm font-medium text-foreground truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm text-muted-foreground">
                  ${item.totalAmount.toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-foreground w-12 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
