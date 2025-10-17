import { ChartCard, ChartEmptyState } from './BaseChart.jsx';

export function ProductRotationTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Rotación de Productos" description="Top 10 productos según unidades vendidas">
        <ChartEmptyState message="No hay productos con ventas durante el período seleccionado." />
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Rotación de Productos" description="Top 10 productos por unidades vendidas">
      <div className="space-y-3">
        {data.map((item, index) => (
          <div
            key={item.productId ?? index}
            className="flex items-center justify-between rounded-lg border p-3 text-sm"
          >
            <div>
              <p className="font-medium">{item.productName ?? `Producto ${index + 1}`}</p>
              <p className="text-xs text-muted-foreground">
                {item.unitsSold ?? 0} unidades • ${Number(item.totalRevenue ?? 0).toFixed(2)}
              </p>
            </div>
            <span className="text-muted-foreground text-xs">#{index + 1}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
