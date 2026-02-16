import { TrendingUp, ArrowDownRight, Calculator } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox.jsx';

const METRIC_CATEGORIES = [
  {
    id: 'revenue',
    label: 'Ingresos',
    icon: TrendingUp,
    metrics: [
      {
        id: 'revenue_by_channel',
        label: 'Por Canal de Venta',
        description: 'Ventas desglosadas por canal (POS, online, delivery)',
      },
      {
        id: 'revenue_by_payment',
        label: 'Por Forma de Pago',
        description: 'Ingresos agrupados por método de pago',
      },
      {
        id: 'revenue_by_category',
        label: 'Por Categoría de Producto',
        description: 'Ventas por categoría',
      },
      {
        id: 'top_products',
        label: 'Productos Más Vendidos',
        description: 'Top 10 productos por ingresos',
      },
    ],
  },
  {
    id: 'expenses',
    label: 'Egresos',
    icon: ArrowDownRight,
    metrics: [
      {
        id: 'payroll_detailed',
        label: 'Nómina Detallada',
        description: 'Desglose completo de costos de nómina',
      },
      {
        id: 'expenses_operational',
        label: 'Gastos Operativos',
        description: 'Servicios, rentas, suministros',
      },
      {
        id: 'taxes_detailed',
        label: 'Impuestos y Retenciones',
        description: 'IVA, ISR, retenciones',
      },
    ],
  },
  {
    id: 'margins',
    label: 'Márgenes',
    icon: Calculator,
    metrics: [
      {
        id: 'margin_by_product',
        label: 'Por Producto',
        description: 'Margen de cada producto/servicio',
      },
      {
        id: 'margin_by_category',
        label: 'Por Categoría',
        description: 'Margen por categoría de producto',
      },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: Calculator,
    metrics: [
      {
        id: 'inventory_value',
        label: 'Valor de Inventario',
        description: 'Valor total del stock actual',
      },
    ],
  },
];

export function MetricSelector({ selectedMetrics = [], onMetricsChange }) {
  const handleToggle = (metricId) => {
    if (selectedMetrics.includes(metricId)) {
      onMetricsChange(selectedMetrics.filter((id) => id !== metricId));
    } else {
      onMetricsChange([...selectedMetrics, metricId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h4 className="text-sm font-semibold">Selecciona Métricas</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedMetrics.length} métrica{selectedMetrics.length !== 1 ? 's' : ''} seleccionada{selectedMetrics.length !== 1 ? 's' : ''}
        </p>
      </div>

      {METRIC_CATEGORIES.map((category) => (
        <div key={category.id} className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <category.icon className="h-4 w-4 text-muted-foreground" />
            <span>{category.label}</span>
          </div>

          <div className="pl-6 space-y-1">
            {category.metrics.map((metric) => (
              <label
                key={metric.id}
                className="flex items-start gap-2.5 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedMetrics.includes(metric.id)}
                  onCheckedChange={() => handleToggle(metric.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{metric.label}</div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    {metric.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
