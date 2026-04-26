import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Clock, AlertTriangle } from 'lucide-react';
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

  const cards = [
    { key: null, label: 'Total por Cobrar', icon: DollarSign, amount: buckets.total.amount, count: buckets.total.count, countLabel: 'pendientes', color: 'text-gray-600 dark:text-slate-400', amountColor: 'text-gray-900 dark:text-slate-50',
      activeBg: 'bg-gray-100 border-gray-400 ring-2 ring-gray-400 dark:bg-slate-800 dark:border-slate-600 dark:ring-slate-600',
      inactiveBg: 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800' },
    { key: 'current', label: 'Al día', icon: Clock, amount: buckets.current.amount, count: buckets.current.count, countLabel: '', color: 'text-success', amountColor: 'text-success dark:text-success',
      activeBg: 'bg-success/10 border-green-400 ring-2 ring-green-400 dark:bg-green-950/30 dark:border-green-900/50 dark:ring-green-800',
      inactiveBg: 'bg-white border-gray-200 hover:bg-success/5 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-green-900/20' },
    { key: 'days30', label: '1-30 días', icon: Clock, amount: buckets.days30.amount, count: buckets.days30.count, countLabel: 'vencidas', color: 'text-warning-foreground', amountColor: 'text-yellow-700 dark:text-yellow-300',
      activeBg: 'bg-warning/10 border-yellow-400 ring-2 ring-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-900/50 dark:ring-yellow-800',
      inactiveBg: 'bg-white border-gray-200 hover:bg-yellow-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-yellow-900/20' },
    { key: 'days60', label: '31-60 días', icon: AlertTriangle, amount: buckets.days60.amount, count: buckets.days60.count, countLabel: 'vencidas', color: 'text-warning dark:text-orange-400', amountColor: 'text-orange-700 dark:text-orange-300',
      activeBg: 'bg-warning/10 border-orange-400 ring-2 ring-orange-400 dark:bg-orange-950/30 dark:border-orange-900/50 dark:ring-orange-800',
      inactiveBg: 'bg-white border-gray-200 hover:bg-orange-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-orange-900/20' },
    { key: 'days60plus', label: '60+ días', icon: AlertTriangle, amount: buckets.days60plus.amount, count: buckets.days60plus.count, countLabel: 'vencidas', color: 'text-destructive', amountColor: 'text-destructive dark:text-destructive',
      activeBg: 'bg-destructive/10 border-red-400 ring-2 ring-red-400 dark:bg-red-950/30 dark:border-red-900/50 dark:ring-red-800',
      inactiveBg: 'bg-white border-gray-200 hover:bg-destructive/5 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-red-900/20' },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6"
      variants={STAGGER(0.06)}
      initial="initial"
      animate="animate"
    >
      {cards.map(card => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;

        return (
          <motion.div key={card.key ?? 'total'} variants={scaleIn}>
            <Card
              className={cn('cursor-pointer transition-all duration-200 border-2', isActive ? card.activeBg : card.inactiveBg)}
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
                  className={cn('text-2xl font-bold', card.amountColor)}
                />
                <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">
                  {card.count} {card.count === 1 ? 'cuenta' : 'cuentas'} {card.countLabel}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <motion.div variants={scaleIn} className="col-span-full">
          <div
            className="bg-destructive/5 border border-red-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-destructive/10 transition-colors dark:bg-red-950/20 dark:border-red-900/50 dark:hover:bg-red-900/40"
            onClick={() => onFilterChange('overdue')}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive dark:text-red-400">
                  {overdueCount} {overdueCount === 1 ? 'cuenta vencida' : 'cuentas vencidas'}
                </p>
              </div>
            </div>
            <span className="text-destructive text-sm font-medium dark:text-red-400">Ver todas →</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
