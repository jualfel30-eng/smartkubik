import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { getPayablesSummary } from '@/lib/api';
import { DollarSign, Clock, AlertTriangle, TrendingUp, CalendarClock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CURRENCY_LABELS, CURRENCY_COLORS, CURRENCY_TEXT_COLORS, formatCurrency } from '@/lib/currency-utils';
import { scaleIn, STAGGER } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';

export default function PayablesSummaryCards({ onFilterChange, activeFilter, payables = [] }) {
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

  // Compute "This Week" and "Paid This Month" from payables prop
  const thisWeekAmount = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    return payables
      .filter(p => p.dueDate && !['paid', 'void'].includes(p.status))
      .filter(p => {
        const due = new Date(p.dueDate);
        return due >= now && due <= weekFromNow;
      })
      .reduce((sum, p) => sum + (p.lines || []).reduce((s, l) => s + Number(l.amount || 0), 0), 0);
  }, [payables]);

  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    return payables
      .filter(p => p.dueDate && !['paid', 'void'].includes(p.status))
      .filter(p => {
        const due = new Date(p.dueDate);
        return due >= now && due <= weekFromNow;
      }).length;
  }, [payables]);

  const paidThisMonthAmount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return payables
      .filter(p => p.status === 'paid' && p.updatedAt && new Date(p.updatedAt) >= startOfMonth)
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  }, [payables]);

  const paidThisMonthCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return payables
      .filter(p => p.status === 'paid' && p.updatedAt && new Date(p.updatedAt) >= startOfMonth).length;
  }, [payables]);

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
      <div className="bg-destructive/5 border border-red-200 rounded-lg p-4 mb-6 dark:bg-red-950/20 dark:border-red-900/50">
        <p className="text-destructive text-sm dark:text-red-400">Error al cargar resumen: {error}</p>
      </div>
    );
  }

  if (!summary) return null;

  const overdueTotal = summary.aging.days30.amount + summary.aging.days60.amount + summary.aging.days90plus.amount;
  const overdueCount = summary.aging.days30.count + summary.aging.days60.count + summary.aging.days90plus.count;

  return (
    <div className="space-y-4 mb-6">
      {/* Primera fila: Total General + Esta Semana + Pagado Este Mes + por Moneda */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-4"
        variants={STAGGER(0.06)}
        initial="initial"
        animate="animate"
      >
        {/* Total General */}
        <motion.div variants={scaleIn}>
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
                <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Total por Pagar</span>
              </div>
              <AnimatedNumber
                value={summary.total.amount}
                format={(n) => formatCurrency(n)}
                className="text-2xl font-bold text-gray-900 dark:text-slate-50"
              />
              <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
                {summary.total.count} {summary.total.count === 1 ? 'factura' : 'facturas'} pendientes
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Esta Semana */}
        <motion.div variants={scaleIn}>
          <Card className="border-2 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Esta Semana</span>
              </div>
              <AnimatedNumber
                value={thisWeekAmount}
                format={(n) => formatCurrency(n)}
                className="text-2xl font-bold text-amber-700 dark:text-amber-300"
              />
              <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
                {thisWeekCount} {thisWeekCount === 1 ? 'factura' : 'facturas'} por vencer
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pagado Este Mes */}
        <motion.div variants={scaleIn}>
          <Card className="border-2 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Pagado este mes</span>
              </div>
              <AnimatedNumber
                value={paidThisMonthAmount}
                format={(n) => formatCurrency(n)}
                className="text-2xl font-bold text-emerald-700 dark:text-emerald-300"
              />
              <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
                {paidThisMonthCount} {paidThisMonthCount === 1 ? 'factura' : 'facturas'} pagadas
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tarjetas por Moneda */}
        {Object.entries(summary.byCurrency).map(([currency, data]) => (
          <motion.div key={currency} variants={scaleIn}>
            <Card
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
                <AnimatedNumber
                  value={data.amount}
                  format={(n) => formatCurrency(n, currency)}
                  className={cn('text-2xl font-bold', CURRENCY_TEXT_COLORS[currency] || 'text-gray-900 dark:text-slate-50')}
                />
                <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
                  {data.count} {data.count === 1 ? 'factura' : 'facturas'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Segunda fila: Aging Report */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={STAGGER(0.06, 0.1)}
        initial="initial"
        animate="animate"
      >
        {/* Al día */}
        <motion.div variants={scaleIn}>
          <Card
            className={cn(
              'cursor-pointer transition-all duration-200 border-2',
              activeFilter?.aging === 'current'
                ? 'bg-success/10 border-green-400 ring-2 ring-green-400 dark:bg-green-950/30 dark:border-green-900/50 dark:ring-green-800'
                : 'bg-white border-gray-200 hover:bg-success/5 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-green-900/20'
            )}
            onClick={() => onFilterChange({ aging: 'current' })}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">Al día</span>
              </div>
              <AnimatedNumber
                value={summary.aging.current.amount}
                format={(n) => formatCurrency(n)}
                className="text-xl font-bold text-success dark:text-success"
              />
              <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
                {summary.aging.current.count} {summary.aging.current.count === 1 ? 'factura' : 'facturas'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* 1-30 días */}
        <motion.div variants={scaleIn}>
          <Card
            className={cn(
              'cursor-pointer transition-all duration-200 border-2',
              activeFilter?.aging === 'days30'
                ? 'bg-warning/10 border-yellow-400 ring-2 ring-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-900/50 dark:ring-yellow-800'
                : 'bg-white border-gray-200 hover:bg-yellow-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-yellow-900/20'
            )}
            onClick={() => onFilterChange({ aging: 'days30' })}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-warning-foreground" />
                <span className="text-sm font-medium text-warning-foreground">1-30 días</span>
              </div>
              <AnimatedNumber
                value={summary.aging.days30.amount}
                format={(n) => formatCurrency(n)}
                className="text-xl font-bold text-yellow-700 dark:text-yellow-300"
              />
              <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
                {summary.aging.days30.count} {summary.aging.days30.count === 1 ? 'factura' : 'facturas'} vencidas
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* 31-60 días */}
        <motion.div variants={scaleIn}>
          <Card
            className={cn(
              'cursor-pointer transition-all duration-200 border-2',
              activeFilter?.aging === 'days60'
                ? 'bg-warning/10 border-orange-400 ring-2 ring-orange-400 dark:bg-orange-950/30 dark:border-orange-900/50 dark:ring-orange-800'
                : 'bg-white border-gray-200 hover:bg-orange-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-orange-900/20'
            )}
            onClick={() => onFilterChange({ aging: 'days60' })}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning dark:text-orange-400" />
                <span className="text-sm font-medium text-warning dark:text-orange-400">31-60 días</span>
              </div>
              <AnimatedNumber
                value={summary.aging.days60.amount}
                format={(n) => formatCurrency(n)}
                className="text-xl font-bold text-orange-700 dark:text-orange-300"
              />
              <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
                {summary.aging.days60.count} {summary.aging.days60.count === 1 ? 'factura' : 'facturas'} vencidas
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* 90+ días */}
        <motion.div variants={scaleIn}>
          <Card
            className={cn(
              'cursor-pointer transition-all duration-200 border-2',
              activeFilter?.aging === 'days90plus'
                ? 'bg-destructive/10 border-red-400 ring-2 ring-red-400 dark:bg-red-950/30 dark:border-red-900/50 dark:ring-red-800'
                : 'bg-white border-gray-200 hover:bg-destructive/5 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-red-900/20'
            )}
            onClick={() => onFilterChange({ aging: 'days90plus' })}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">+90 días</span>
              </div>
              <AnimatedNumber
                value={summary.aging.days90plus.amount}
                format={(n) => formatCurrency(n)}
                className="text-xl font-bold text-destructive dark:text-destructive"
              />
              <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
                {summary.aging.days90plus.count} {summary.aging.days90plus.count === 1 ? 'factura' : 'facturas'} vencidas
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Alerta de vencidas si hay */}
      {overdueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/5 border border-red-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-destructive/10 transition-colors dark:bg-red-950/20 dark:border-red-900/50 dark:hover:bg-red-900/40"
          onClick={() => onFilterChange({ overdue: true })}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive dark:text-red-400">
                {overdueCount} {overdueCount === 1 ? 'factura vencida' : 'facturas vencidas'}
              </p>
              <p className="text-sm text-destructive dark:text-destructive">
                Total vencido: <AnimatedNumber value={overdueTotal} format={(n) => formatCurrency(n)} className="inline" />
              </p>
            </div>
          </div>
          <span className="text-destructive text-sm font-medium dark:text-red-400">Ver todas →</span>
        </motion.div>
      )}
    </div>
  );
}
