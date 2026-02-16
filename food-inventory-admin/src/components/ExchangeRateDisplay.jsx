import { useExchangeRate } from '../hooks/useExchangeRate';
import { useCountryPlugin } from '../country-plugins/CountryPluginContext';
import { Badge } from '@/components/ui/badge';
import { DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExchangeRateDisplay({ variant = 'default', showRefresh = false }) {
  const { rate, loading, error, lastUpdate, refetch } = useExchangeRate();
  const plugin = useCountryPlugin();
  const primary = plugin.currencyEngine.getPrimaryCurrency();
  const secondary = plugin.currencyEngine.getSecondaryCurrencies();
  const numberLocale = plugin.localeProvider.getNumberLocale();

  // If no secondary currencies, exchange rate display is not needed
  if (secondary.length === 0) return null;

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
    return new Intl.DateTimeFormat(numberLocale, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant} className="gap-1">
        <DollarSign className="h-3 w-3" />
        <span className="font-semibold">1 {secondary[0].code} = {rate?.toFixed(2)} {primary.symbol}</span>
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
