import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { getUrgency, getDaysLabel, getARStatusInfo } from '@/lib/invoice-constants';
import { listItem } from '@/lib/motion';

export default function ARReceivableCard({ row, onAction, onViewReceipt, onOpenCustomer, isPaidView = false }) {
  const balance = Number(row.balance) || 0;
  const urgency = getUrgency(row.dueDate);
  const daysLabel = getDaysLabel(row.dueDate);
  const statusInfo = getARStatusInfo(row.status, row.dueDate);

  return (
    <motion.div
      variants={listItem}
      className={cn(
        'rounded-xl border px-4 py-3.5 flex items-center justify-between gap-3 transition-colors',
        urgency === 'overdue'  && 'border-red-500/30 bg-red-500/5 dark:bg-red-500/8',
        urgency === 'due-soon' && 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/8',
        urgency === 'current'  && 'border-border bg-card',
        isPaidView             && 'border-border bg-card opacity-80'
      )}
    >
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onOpenCustomer?.(row)}
          className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate block text-left max-w-full"
        >
          {row.customerName}
        </button>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          Orden #{row.orderNumber}
          {daysLabel && (
            <span className={cn('ml-2', daysLabel.className)}>· {daysLabel.text}</span>
          )}
          {isPaidView && row.dueDate && (
            <span className="ml-2 text-muted-foreground">· {new Date(row.dueDate).toLocaleDateString('es-VE')}</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={cn(
          'font-bold text-sm tabular-nums',
          urgency === 'overdue'  ? 'text-red-600 dark:text-red-400'  : '',
          urgency === 'due-soon' ? 'text-amber-600 dark:text-amber-400' : '',
          urgency === 'current'  ? 'text-foreground' : '',
          isPaidView             ? 'text-muted-foreground' : '',
        )}>
          {formatCurrency(balance)}
        </span>

        {!isPaidView && balance > 0 && (
          <Button
            size="sm"
            variant={urgency === 'overdue' ? 'destructive' : 'default'}
            className="h-8 px-3 text-xs font-semibold shrink-0"
            onClick={() => onAction?.(row)}
          >
            Cobrar
          </Button>
        )}

        {isPaidView && (
          <Badge variant="secondary" className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-0 shrink-0">
            {statusInfo.label}
          </Badge>
        )}

        {isPaidView && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs shrink-0"
            onClick={() => onViewReceipt ? onViewReceipt(row) : onAction?.(row)}
          >
            Ver
          </Button>
        )}
      </div>
    </motion.div>
  );
}
