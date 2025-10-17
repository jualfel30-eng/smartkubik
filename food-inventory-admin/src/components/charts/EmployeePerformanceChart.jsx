import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChartCard, ChartEmptyState } from './BaseChart.jsx';
import { chartPalette, defaultTooltipProps } from './chart-theme.js';

export function EmployeePerformanceChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Desempeño de Empleados" description="Ventas por colaborador en el período">
        <ChartEmptyState message="Aún no hay KPIs registrados para los colaboradores en este período." />
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Desempeño de Empleados" description="Ventas totales y ventas por hora">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
          <XAxis dataKey="userName" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip {...defaultTooltipProps} />
          <Bar dataKey="totalSales" fill={chartPalette[0]} radius={[6, 6, 0, 0]} name="Ventas" />
          <Bar dataKey="salesPerHour" fill={chartPalette[3]} radius={[6, 6, 0, 0]} name="Ventas/hora" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
