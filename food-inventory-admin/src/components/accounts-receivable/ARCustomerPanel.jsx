import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { getUrgency, getDaysLabel, getARStatusInfo } from '@/lib/invoice-constants';
import { STAGGER, listItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

export default function ARCustomerPanel({ open, onClose, customerName, allData, onAction }) {
  const customerRows = useMemo(() => {
    if (!customerName || !allData) return [];
    return allData.filter(r => r.customerName === customerName);
  }, [customerName, allData]);

  const pending = customerRows.filter(r => Number(r.balance) > 0);
  const paid    = customerRows.filter(r => Number(r.balance) <= 0 || r.status === 'paid');
  const totalPending = pending.reduce((s, r) => s + (Number(r.balance) || 0), 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[440px] px-0 flex flex-col">
        <SheetHeader className="px-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-left">{customerName}</SheetTitle>
              {totalPending > 0 && (
                <p className="text-sm text-muted-foreground">
                  Saldo pendiente: <span className="font-semibold text-foreground">{formatCurrency(totalPending)}</span>
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pt-5 space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Cobros pendientes
              </p>
              <motion.div
                className="space-y-2"
                variants={STAGGER(0.05)}
                initial="initial"
                animate="animate"
              >
                {pending.map(row => (
                  <CustomerRow key={row.orderNumber} row={row} onAction={onAction} onClose={onClose} />
                ))}
              </motion.div>
            </section>
          )}

          {/* Paid */}
          {paid.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Cobros realizados
              </p>
              <motion.div
                className="space-y-2"
                variants={STAGGER(0.05)}
                initial="initial"
                animate="animate"
              >
                {paid.map(row => (
                  <CustomerRow key={row.orderNumber} row={row} isPaid />
                ))}
              </motion.div>
            </section>
          )}

          {customerRows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Sin registros para este cliente</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CustomerRow({ row, onAction, onClose, isPaid = false }) {
  const balance = Number(row.balance) || 0;
  const urgency = getUrgency(row.dueDate);
  const daysLabel = getDaysLabel(row.dueDate);
  const statusInfo = getARStatusInfo(row.status, row.dueDate);

  return (
    <motion.div
      variants={listItem}
      className={cn(
        'rounded-lg border px-3 py-2.5 flex items-center justify-between gap-2',
        !isPaid && urgency === 'overdue'  && 'border-red-500/30 bg-red-500/5',
        !isPaid && urgency === 'due-soon' && 'border-amber-500/30 bg-amber-500/5',
        !isPaid && urgency === 'current'  && 'border-border',
        isPaid                            && 'border-border opacity-70'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">Orden #{row.orderNumber}</p>
        {daysLabel && !isPaid && (
          <p className={cn('text-[10px] mt-0.5', daysLabel.className)}>{daysLabel.text}</p>
        )}
        {isPaid && row.dueDate && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(row.dueDate).toLocaleDateString('es-VE')}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={cn('text-xs font-bold tabular-nums', isPaid ? 'text-muted-foreground' : 'text-foreground')}>
          {formatCurrency(balance)}
        </span>

        {!isPaid ? (
          <Button
            size="sm"
            variant={urgency === 'overdue' ? 'destructive' : 'outline'}
            className="h-7 px-2 text-[10px]"
            onClick={() => { onClose?.(); onAction?.(row); }}
          >
            Cobrar
          </Button>
        ) : (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
            {statusInfo.label}
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
