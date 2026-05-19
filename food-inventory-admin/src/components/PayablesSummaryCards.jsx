import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { getPayablesSummary } from '@/lib/api';
import { DollarSign, AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, TrendingUp, Zap, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CURRENCY_LABELS, CURRENCY_COLORS, CURRENCY_TEXT_COLORS, formatCurrency } from '@/lib/currency-utils';
import { scaleIn, STAGGER, fadeUp } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';

export default function PayablesSummaryCards({ onFilterChange, activeFilter, payables = [], onPayNow, onViewPayable }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const response = await getPayablesSummary();
      if (response.success) setSummary(response.data);
    } catch (err) {
      console.error('Error loading payables summary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const thisWeekData = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    const items = payables.filter(p =>
      p.dueDate && !['paid', 'void'].includes(p.status) &&
      new Date(p.dueDate) >= now && new Date(p.dueDate) <= weekFromNow
    );
    return {
      amount: items.reduce((sum, p) => sum + (p.lines || []).reduce((s, l) => s + Number(l.amount || 0), 0), 0),
      count: items.length,
    };
  }, [payables]);

  const paidThisMonthData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const items = payables.filter(p => p.status === 'paid' && p.updatedAt && new Date(p.updatedAt) >= startOfMonth);
    return {
      amount: items.reduce((sum, p) => sum + (p.paidAmount || 0), 0),
      count: items.length,
    };
  }, [payables]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse dark:bg-slate-900/50 dark:border-slate-800">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-7 bg-muted rounded w-1/2 mb-1" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-6">
        <p className="text-destructive text-sm">Error al cargar resumen: {error}</p>
      </div>
    );
  }

  if (!summary) return null;

  const overdueTotal = summary.aging.days30.amount + summary.aging.days60.amount + summary.aging.days90plus.amount;
  const overdueCount = summary.aging.days30.count + summary.aging.days60.count + summary.aging.days90plus.count;

  // Identify the most overdue payable (oldest dueDate in the past)
  const mostOverduePayable = useMemo(() => {
    const now = new Date();
    const overdue = payables.filter(p =>
      !['paid', 'void'].includes(p.status) && p.dueDate && new Date(p.dueDate) < now
    );
    if (!overdue.length) return null;
    return overdue.reduce((oldest, p) =>
      new Date(p.dueDate) < new Date(oldest.dueDate) ? p : oldest
    );
  }, [payables]);

  const daysOverdue = mostOverduePayable
    ? Math.floor((new Date() - new Date(mostOverduePayable.dueDate)) / 86400000)
    : 0;

  return (
    <div className="space-y-4 mb-6">
      {/* SPOTLIGHT URGENTE — reemplaza el banner genérico */}
      {overdueCount > 0 && mostOverduePayable && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 flex-shrink-0 mt-0.5 sm:mt-0">
                  <Zap className="h-4 w-4 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400 text-sm">
                    {mostOverduePayable.payeeName}
                  </p>
                  <p className="text-xs text-red-500/80 dark:text-red-400/70">
                    Vencida hace {daysOverdue} {daysOverdue === 1 ? 'día' : 'días'} ·{' '}
                    <AnimatedNumber
                      value={(mostOverduePayable.totalAmount || 0) - (mostOverduePayable.paidAmount || 0)}
                      format={n => formatCurrency(n)}
                      className="inline font-semibold"
                    />
                  </p>
                  {overdueCount > 1 && (
                    <button
                      type="button"
                      className="text-xs text-red-500/70 dark:text-red-400/60 hover:text-red-600 dark:hover:text-red-400 underline underline-offset-2 transition-colors mt-0.5"
                      onClick={() => onFilterChange({ overdue: true })}
                    >
                      + {overdueCount - 1} {overdueCount - 1 === 1 ? 'factura más vencida' : 'facturas más vencidas'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 sm:flex-shrink-0">
                {onViewPayable && (
                  <Button size="sm" variant="outline" className="h-8 border-red-200 dark:border-red-900/50" onClick={() => onViewPayable(mostOverduePayable)}>
                    Ver
                  </Button>
                )}
                {onPayNow && (
                  <Button size="sm" className="h-8 bg-red-500 hover:bg-red-600 text-white gap-1.5" onClick={() => onPayNow(mostOverduePayable)}>
                    <CreditCard className="h-3.5 w-3.5" />
                    Pagar ahora
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* HERO ROW: Total + Overdue + This Week + Paid This Month */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        variants={STAGGER(0.08)}
        initial="initial"
        animate="animate"
      >
        {/* HERO: Total por Pagar */}
        <motion.div variants={scaleIn}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card
                className={cn(
                  'glass-card-subtle cursor-pointer transition-all duration-200 border-2',
                  activeFilter === null
                    ? 'ring-2 ring-primary/50'
                    : 'hover:scale-[1.02]'
                )}
                onClick={() => onFilterChange(null)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4.5 w-4.5 text-foreground/60" />
                    <span className="text-sm font-medium text-foreground/60">Total por Pagar</span>
                  </div>
                  <AnimatedNumber
                    value={summary.total.amount}
                    format={(n) => formatCurrency(n)}
                    className="text-3xl font-bold text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.total.count} {summary.total.count === 1 ? 'factura pendiente' : 'facturas pendientes'}
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Haz clic para ver todas las facturas</TooltipContent>
          </Tooltip>
        </motion.div>

        {/* Vencido */}
        <motion.div variants={scaleIn}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card
                className={cn(
                  'cursor-pointer transition-all duration-200 border-2',
                  activeFilter?.overdue
                    ? 'bg-red-500/10 border-red-500/30 ring-2 ring-red-500/40'
                    : 'border-border hover:bg-red-500/5 hover:border-red-500/20'
                )}
                onClick={() => onFilterChange({ overdue: true })}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">Vencido</span>
                  </div>
                  <AnimatedNumber
                    value={overdueTotal}
                    format={(n) => formatCurrency(n)}
                    className="text-2xl font-bold text-red-600 dark:text-red-400"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {overdueCount} {overdueCount === 1 ? 'factura' : 'facturas'}
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Haz clic para filtrar facturas vencidas</TooltipContent>
          </Tooltip>
        </motion.div>

        {/* Esta Semana */}
        <motion.div variants={scaleIn}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="border-2 border-border hover:bg-amber-500/5 hover:border-amber-500/20 transition-all duration-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarClock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Esta Semana</span>
                  </div>
                  <AnimatedNumber
                    value={thisWeekData.amount}
                    format={(n) => formatCurrency(n)}
                    className="text-2xl font-bold text-amber-600 dark:text-amber-300"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {thisWeekData.count} {thisWeekData.count === 1 ? 'factura por vencer' : 'facturas por vencer'}
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Facturas que vencen en los próximos 7 días</TooltipContent>
          </Tooltip>
        </motion.div>

        {/* Pagado Este Mes */}
        <motion.div variants={scaleIn}>
          <Card className="border-2 border-border hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Pagado este mes</span>
              </div>
              <AnimatedNumber
                value={paidThisMonthData.amount}
                format={(n) => formatCurrency(n)}
                className="text-2xl font-bold text-emerald-600 dark:text-emerald-300"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {paidThisMonthData.count} {paidThisMonthData.count === 1 ? 'factura pagada' : 'facturas pagadas'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* COLLAPSIBLE: Aging + Currency detail */}
      <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
            <span>{detailOpen ? 'Ocultar' : 'Ver'} desglose por moneda y antigüedad</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', detailOpen && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 pt-2">
            {/* Aging Row */}
            <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3" variants={STAGGER(0.05)} initial="initial" animate="animate">
              {[
                { key: 'current', label: 'Al día', data: summary.aging.current, color: 'emerald' },
                { key: 'days30', label: '1-30 días', data: summary.aging.days30, color: 'yellow' },
                { key: 'days60', label: '31-60 días', data: summary.aging.days60, color: 'orange' },
                { key: 'days90plus', label: '60+ días', data: summary.aging.days90plus, color: 'red' },
              ].map(({ key, label, data, color }) => (
                <motion.div key={key} variants={scaleIn}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card
                        className={cn(
                          'cursor-pointer transition-all duration-200 border',
                          activeFilter?.aging === key
                            ? `bg-${color}-500/10 border-${color}-500/30 ring-2 ring-${color}-500/40`
                            : `border-border hover:bg-${color}-500/5`
                        )}
                        onClick={() => onFilterChange({ aging: key })}
                      >
                        <CardContent className="p-3">
                          <span className={`text-xs font-medium text-${color}-600 dark:text-${color}-400`}>{label}</span>
                          <AnimatedNumber
                            value={data.amount}
                            format={(n) => formatCurrency(n)}
                            className={`text-lg font-bold text-${color}-600 dark:text-${color}-300 block`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {data.count} {data.count === 1 ? 'factura' : 'facturas'}
                          </span>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>Haz clic para filtrar por {label.toLowerCase()}</TooltipContent>
                  </Tooltip>
                </motion.div>
              ))}
            </motion.div>

            {/* Currency Row */}
            {Object.keys(summary.byCurrency).length > 0 && (
              <motion.div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3" variants={STAGGER(0.05)} initial="initial" animate="animate">
                {Object.entries(summary.byCurrency).map(([currency, data]) => (
                  <motion.div key={currency} variants={scaleIn}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card
                          className={cn(
                            'cursor-pointer transition-all duration-200 border',
                            activeFilter?.expectedCurrency === currency
                              ? `${CURRENCY_COLORS[currency]} ring-2 ring-offset-1 dark:ring-offset-background`
                              : 'border-border hover:bg-muted/50'
                          )}
                          onClick={() => onFilterChange({ expectedCurrency: currency })}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <TrendingUp className={cn('h-3.5 w-3.5', CURRENCY_TEXT_COLORS[currency] || 'text-muted-foreground')} />
                              <span className={cn('text-xs font-medium', CURRENCY_TEXT_COLORS[currency] || 'text-muted-foreground')}>
                                {CURRENCY_LABELS[currency] || currency}
                              </span>
                            </div>
                            <AnimatedNumber
                              value={data.amount}
                              format={(n) => formatCurrency(n, currency)}
                              className={cn('text-lg font-bold block', CURRENCY_TEXT_COLORS[currency] || 'text-foreground')}
                            />
                            <span className="text-xs text-muted-foreground">
                              {data.count} {data.count === 1 ? 'factura' : 'facturas'}
                            </span>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent>Haz clic para filtrar por {CURRENCY_LABELS[currency] || currency}</TooltipContent>
                    </Tooltip>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
