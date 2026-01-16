import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { getPayablesSummary } from '@/lib/api';
import { DollarSign, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapeo de monedas a etiquetas legibles
const CURRENCY_LABELS = {
  USD: 'USD ($)',
  VES: 'Bolívares (Bs)',
  EUR: 'Euros',
  USD_BCV: '$ BCV',
  EUR_BCV: '€ BCV',
};

// Colores para cada moneda
const CURRENCY_COLORS = {
  USD: 'bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-900/50 dark:hover:bg-green-900/40',
  VES: 'bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50 dark:hover:bg-blue-900/40',
  EUR: 'bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/30 dark:border-purple-900/50 dark:hover:bg-purple-900/40',
  USD_BCV: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:hover:bg-emerald-900/40',
  EUR_BCV: 'bg-violet-50 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/30 dark:border-violet-900/50 dark:hover:bg-violet-900/40',
};

const CURRENCY_TEXT_COLORS = {
  USD: 'text-green-700 dark:text-green-400',
  VES: 'text-blue-700 dark:text-blue-400',
  EUR: 'text-purple-700 dark:text-purple-400',
  USD_BCV: 'text-emerald-700 dark:text-emerald-400',
  EUR_BCV: 'text-violet-700 dark:text-violet-400',
};

// Formatear moneda
const formatCurrency = (amount, currency = 'USD') => {
  if (currency === 'VES') {
    return `Bs ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === 'EUR' || currency === 'EUR_BCV') {
    return `€${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function PayablesSummaryCards({ onFilterChange, activeFilter }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const response = await getPayablesSummary();
      if (response.success) {
        setSummary(response.data);
      }
    } catch (err) {
      console.error('Error loading payables summary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 dark:bg-red-950/20 dark:border-red-900/50">
        <p className="text-red-600 text-sm dark:text-red-400">Error al cargar resumen: {error}</p>
      </div>
    );
  }

  if (!summary) return null;

  // Calcular total vencido
  const overdueTotal = summary.aging.days30.amount + summary.aging.days60.amount + summary.aging.days90plus.amount;
  const overdueCount = summary.aging.days30.count + summary.aging.days60.count + summary.aging.days90plus.count;

  return (
    <div className="space-y-4 mb-6">
      {/* Primera fila: Total General y por Moneda */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total General */}
        <Card
          className={cn(
            'cursor-pointer transition-all duration-200 border-2',
            activeFilter === null
              ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-400 dark:bg-slate-800 dark:border-slate-600 dark:ring-slate-600'
              : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800'
          )}
          onClick={() => onFilterChange(null)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-gray-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Total General</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-50">
              {formatCurrency(summary.total.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
              {summary.total.count} {summary.total.count === 1 ? 'factura' : 'facturas'} pendientes
            </p>
          </CardContent>
        </Card>

        {/* Tarjetas por Moneda */}
        {Object.entries(summary.byCurrency).map(([currency, data]) => (
          <Card
            key={currency}
            className={cn(
              'cursor-pointer transition-all duration-200 border-2',
              activeFilter?.expectedCurrency === currency
                ? `${CURRENCY_COLORS[currency]} ring-2 ring-offset-1 dark:ring-offset-slate-950`
                : `bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800`
            )}
            onClick={() => onFilterChange({ expectedCurrency: currency })}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={cn('h-4 w-4', CURRENCY_TEXT_COLORS[currency] || 'text-gray-600 dark:text-slate-400')} />
                <span className={cn('text-sm font-medium', CURRENCY_TEXT_COLORS[currency] || 'text-gray-600 dark:text-slate-400')}>
                  {CURRENCY_LABELS[currency] || currency}
                </span>
              </div>
              <p className={cn('text-2xl font-bold', CURRENCY_TEXT_COLORS[currency] || 'text-gray-900 dark:text-slate-50')}>
                {formatCurrency(data.amount, currency)}
              </p>
              <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
                {data.count} {data.count === 1 ? 'factura' : 'facturas'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Segunda fila: Aging Report */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Al día */}
        <Card
          className={cn(
            'cursor-pointer transition-all duration-200 border-2',
            activeFilter?.aging === 'current'
              ? 'bg-green-100 border-green-400 ring-2 ring-green-400 dark:bg-green-950/30 dark:border-green-900/50 dark:ring-green-800'
              : 'bg-white border-gray-200 hover:bg-green-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-green-900/20'
          )}
          onClick={() => onFilterChange({ aging: 'current' })}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Al día</span>
            </div>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(summary.aging.current.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
              {summary.aging.current.count} {summary.aging.current.count === 1 ? 'factura' : 'facturas'}
            </p>
          </CardContent>
        </Card>

        {/* 1-30 días */}
        <Card
          className={cn(
            'cursor-pointer transition-all duration-200 border-2',
            activeFilter?.aging === 'days30'
              ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-900/50 dark:ring-yellow-800'
              : 'bg-white border-gray-200 hover:bg-yellow-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-yellow-900/20'
          )}
          onClick={() => onFilterChange({ aging: 'days30' })}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">1-30 días</span>
            </div>
            <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
              {formatCurrency(summary.aging.days30.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
              {summary.aging.days30.count} {summary.aging.days30.count === 1 ? 'factura' : 'facturas'} vencidas
            </p>
          </CardContent>
        </Card>

        {/* 31-60 días */}
        <Card
          className={cn(
            'cursor-pointer transition-all duration-200 border-2',
            activeFilter?.aging === 'days60'
              ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-400 dark:bg-orange-950/30 dark:border-orange-900/50 dark:ring-orange-800'
              : 'bg-white border-gray-200 hover:bg-orange-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-orange-900/20'
          )}
          onClick={() => onFilterChange({ aging: 'days60' })}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">31-60 días</span>
            </div>
            <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
              {formatCurrency(summary.aging.days60.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
              {summary.aging.days60.count} {summary.aging.days60.count === 1 ? 'factura' : 'facturas'} vencidas
            </p>
          </CardContent>
        </Card>

        {/* 90+ días */}
        <Card
          className={cn(
            'cursor-pointer transition-all duration-200 border-2',
            activeFilter?.aging === 'days90plus'
              ? 'bg-red-100 border-red-400 ring-2 ring-red-400 dark:bg-red-950/30 dark:border-red-900/50 dark:ring-red-800'
              : 'bg-white border-gray-200 hover:bg-red-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-red-900/20'
          )}
          onClick={() => onFilterChange({ aging: 'days90plus' })}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">+90 días</span>
            </div>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(summary.aging.days90plus.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
              {summary.aging.days90plus.count} {summary.aging.days90plus.count === 1 ? 'factura' : 'facturas'} vencidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de vencidas si hay */}
      {overdueCount > 0 && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors dark:bg-red-950/20 dark:border-red-900/50 dark:hover:bg-red-900/40"
          onClick={() => onFilterChange({ overdue: true })}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">
                {overdueCount} {overdueCount === 1 ? 'factura vencida' : 'facturas vencidas'}
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                Total vencido: {formatCurrency(overdueTotal)}
              </p>
            </div>
          </div>
          <span className="text-red-600 text-sm font-medium dark:text-red-400">Ver todas →</span>
        </div>
      )}
    </div>
  );
}
