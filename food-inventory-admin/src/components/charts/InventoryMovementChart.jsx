import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard, ChartEmptyState } from './BaseChart.jsx';
import { chartPalette, defaultTooltipProps } from './chart-theme.js';

function normalizeMovement(data) {
  const map = new Map();
  data?.forEach((item) => {
    map.set(item.type, item.total ?? 0);
  });
  return [
    { label: 'Entradas', value: map.get('in') ?? 0 },
    { label: 'Salidas', value: map.get('out') ?? 0 },
  ];
}

export function InventoryMovementChart({ data }) {
  const normalized = normalizeMovement(data);

  if (!data || data.length === 0) {
    return (
      <ChartCard title="Movimiento de Inventario" description="Entradas vs salidas del período">
        <ChartEmptyState message="Registra movimientos de inventario para visualizar esta gráfica." />
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Movimiento de Inventario" description="Entradas vs salidas del período seleccionado">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={normalized}>
          <defs>
            <linearGradient id="movementGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartPalette[2]} stopOpacity={0.4} />
              <stop offset="95%" stopColor={chartPalette[2]} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
          <XAxis dataKey="label" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip {...defaultTooltipProps} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartPalette[2]}
            fill={`url(#movementGradient)`}
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
