import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DollarSign, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { scaleIn, STAGGER } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';

export default function ARSummaryCards({ data, activeFilter, onFilterChange }) {
  const buckets = useMemo(() => {
    const now = new Date();
    const result = {
      total: { amount: 0, count: 0 },
      current: { amount: 0, count: 0 },
      days30: { amount: 0, count: 0 },
      days60: { amount: 0, count: 0 },
      days60plus: { amount: 0, count: 0 },
    };

    (data || []).forEach(row => {
      const balance = Number(row.balance) || 0;
      if (balance <= 0) return;

      result.total.amount += balance;
      result.total.count++;

      const dueDate = row.dueDate ? new Date(row.dueDate) : null;
      if (!dueDate) {
        result.current.amount += balance;
        result.current.count++;
        return;
      }

      const daysOverdue = Math.floor((now - dueDate) / 86400000);

      if (daysOverdue <= 0) {
        result.current.amount += balance;
        result.current.count++;
      } else if (daysOverdue <= 30) {
        result.days30.amount += balance;
        result.days30.count++;
      } else if (daysOverdue <= 60) {
        result.days60.amount += balance;
        result.days60.count++;
      } else {
        result.days60plus.amount += balance;
        result.days60plus.count++;
      }
    });

    return result;
  }, [data]);

  const overdueCount = buckets.days30.count + buckets.days60.count + buckets.days60plus.count;
  const overdueAmount = buckets.days30.amount + buckets.days60.amount + buckets.days60plus.amount;

  const cards = [
    {
      key: null, label: 'Total por Cobrar', icon: DollarSign,
      amount: buckets.total.amount, count: buckets.total.count, countLabel: 'pendientes',
      tooltip: 'Haz clic para ver todas las cuentas',
      color: 'text-foreground/60', amountColor: 'text-foreground',
      activeBg: 'ring-2 ring-primary/50',
      inactiveBg: 'border-border hover:scale-[1.02]',
      isHero: true,
    },
    {
      key: 'current', label: 'Al día', icon: CheckCircle2,
      amount: buckets.current.amount, count: buckets.current.count, countLabel: '',
      tooltip: 'Haz clic para filtrar cuentas al día',
      color: 'text-emerald-600 dark:text-emerald-400', amountColor: 'text-emerald-600 dark:text-emerald-300',
      activeBg: 'bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/40',
      inactiveBg: 'border-border hover:bg-emerald-500/5 hover:border-emerald-500/20',
    },
    {
      key: 'days30', label: '1-30 días', icon: Clock,
      amount: buckets.days30.amount, count: buckets.days30.count, countLabel: 'vencidas',
      tooltip: 'Haz clic para filtrar cuentas vencidas de 1 a 30 días',
      color: 'text-yellow-600 dark:text-yellow-400', amountColor: 'text-yellow-600 dark:text-yellow-300',
      activeBg: 'bg-yellow-500/10 border-yellow-500/30 ring-2 ring-yellow-500/40',
      inactiveBg: 'border-border hover:bg-yellow-500/5 hover:border-yellow-500/20',
    },
    {
      key: 'days60', label: '31-60 días', icon: AlertTriangle,
      amount: buckets.days60.amount, count: buckets.days60.count, countLabel: 'vencidas',
      tooltip: 'Haz clic para filtrar cuentas vencidas de 31 a 60 días',
      color: 'text-orange-600 dark:text-orange-400', amountColor: 'text-orange-600 dark:text-orange-300',
      activeBg: 'bg-orange-500/10 border-orange-500/30 ring-2 ring-orange-500/40',
      inactiveBg: 'border-border hover:bg-orange-500/5 hover:border-orange-500/20',
    },
    {
      key: 'days60plus', label: '60+ días', icon: AlertTriangle,
      amount: buckets.days60plus.amount, count: buckets.days60plus.count, countLabel: 'vencidas',
      tooltip: 'Haz clic para filtrar cuentas vencidas de más de 60 días',
      color: 'text-red-600 dark:text-red-400', amountColor: 'text-red-600 dark:text-red-300',
      activeBg: 'bg-red-500/10 border-red-500/30 ring-2 ring-red-500/40',
      inactiveBg: 'border-border hover:bg-red-500/5 hover:border-red-500/20',
    },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Overdue alert — FIRST */}
      {overdueCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-red-500/15 transition-colors"
                onClick={() => onFilterChange('overdue')}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-500 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400">
                      {overdueCount} {overdueCount === 1 ? 'cuenta vencida' : 'cuentas vencidas'}
                    </p>
                    <p className="text-sm text-red-500/80 dark:text-red-400/70">
                      Total vencido: <AnimatedNumber value={overdueAmount} format={(n) => formatCurrency(n)} className="inline font-medium" />
                    </p>
                  </div>
                </div>
                <span className="text-red-500 dark:text-red-400 text-sm font-medium">Ver todas →</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Haz clic para filtrar solo las cuentas vencidas</TooltipContent>
          </Tooltip>
        </motion.div>
      )}

      {/* Cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        variants={STAGGER(0.06)}
        initial="initial"
        animate="animate"
      >
        {cards.map(card => {
          const Icon = card.icon;
          const isActive = activeFilter === card.key;

          return (
            <motion.div key={card.key ?? 'total'} variants={scaleIn}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={cn(
                      'cursor-pointer transition-all duration-200 border-2',
                      card.isHero && 'glass-card-subtle',
                      isActive ? card.activeBg : card.inactiveBg
                    )}
                    onClick={() => onFilterChange(card.key)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn('h-4 w-4', card.color)} />
                        <span className={cn('text-sm font-medium', card.color)}>{card.label}</span>
                      </div>
                      <AnimatedNumber
                        value={card.amount}
                        format={(n) => formatCurrency(n)}
                        className={cn(card.isHero ? 'text-3xl' : 'text-2xl', 'font-bold', card.amountColor)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {card.count} {card.count === 1 ? 'cuenta' : 'cuentas'} {card.countLabel}
                      </p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>{card.tooltip}</TooltipContent>
              </Tooltip>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
