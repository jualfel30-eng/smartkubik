import { useExchangeRate } from '../hooks/useExchangeRate';
import { getCurrencyConfig } from '../lib/currency-config';
import { Badge } from '@/components/ui/badge';
import { DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExchangeRateDisplay({ variant = 'default', showRefresh = false }) {
  const { rate, loading, error, lastUpdate, tenantCurrency, refetch } = useExchangeRate();
  const cc = getCurrencyConfig(tenantCurrency);

  if (loading && !rate) {
    return (
      <Badge variant="outline" className="gap-1">
        <DollarSign className="h-3 w-3" />
        <span>Cargando...</span>
      </Badge>
    );
  }

  if (error && !rate) {
    return (
      <Badge variant="destructive" className="gap-1">
        <DollarSign className="h-3 w-3" />
        <span>Error</span>
      </Badge>
    );
  }

  const formatDate = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-VE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant} className="gap-1">
        <DollarSign className="h-3 w-3" />
        <span className="font-semibold">1 {cc.label} = {rate?.toFixed(2)} Bs</span>
      </Badge>
      {lastUpdate && (
        <span className="text-xs text-muted-foreground">
          {formatDate(lastUpdate)}
        </span>
      )}
      {showRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          disabled={loading}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
}