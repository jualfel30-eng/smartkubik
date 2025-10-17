import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { ChartCard } from './BaseChart.jsx';

export function SalesComparisonCard({ comparison }) {
  const current = comparison?.current ?? 0;
  const previous = comparison?.previous ?? 0;
  const delta = comparison?.delta ?? current - previous;
  const isPositive = delta >= 0;

  return (
    <ChartCard
      title="Comparativa de Ventas"
      description="Período actual vs. período anterior"
      actions={
        <span className="text-xs text-muted-foreground">
          Actualiza tus filtros para comparar diferentes rangos
        </span>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Actual</p>
            <p className="text-2xl font-semibold">${current.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-muted-foreground">Anterior</p>
            <p className="text-2xl font-semibold text-muted-foreground">
              ${previous.toFixed(2)}
            </p>
          </div>
        </div>
        <div
          className={`flex items-center gap-2 text-sm font-medium ${
            isPositive ? 'text-emerald-600' : 'text-rose-500'
          }`}
        >
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          <span>
            {isPositive ? '+' : '-'}${Math.abs(delta).toFixed(2)} frente al período anterior
          </span>
        </div>
      </div>
    </ChartCard>
  );
}
