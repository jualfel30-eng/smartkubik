import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchApi } from '@/lib/api';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { Wallet, ArrowRight } from 'lucide-react';

/**
 * Hero KPI card de Flujo de Caja Neto para el Dashboard.
 *
 * Llama al mismo endpoint que CashFlowStatement (/accounting/reports/
 * cash-flow-statement) pero filtrado a los últimos 30 días. Muestra el
 * net cash flow con color según signo y enlaza al statement completo
 * en /accounting?tab=cash-flow.
 */
const today = () => new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const formatUSD = (n) => {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
};

export default function CashFlowKpiCard() {
  const [netCashFlow, setNetCashFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const from = thirtyDaysAgo();
        const to = today();
        const response = await fetchApi(`/accounting/reports/cash-flow-statement?from=${from}&to=${to}`);
        if (!cancelled) {
          setNetCashFlow(response?.netCashFlow ?? 0);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Error al cargar flujo de caja');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isPositive = (netCashFlow ?? 0) >= 0;

  return (
    <Link to="/accounting?tab=cash-flow" className="block">
      <Card className="glass-card-subtle hover:border-primary/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Flujo de Caja Neto</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <AnimatedNumber
              value={netCashFlow}
              format={formatUSD}
              duration={0.6}
              className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}
            />
          )}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">Últimos 30 días</p>
            <span className="text-xs text-primary inline-flex items-center gap-1 group-hover:underline">
              Ver detalle <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
