import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency-utils';
import { getUrgency } from '@/lib/invoice-constants';

export default function ARStickyActionBar({ data, onAction }) {
  const mostUrgent = useMemo(() => {
    return (data || [])
      .filter(r => getUrgency(r.dueDate) === 'overdue' && Number(r.balance) > 0)
      .sort((a, b) => Number(b.balance) - Number(a.balance))[0] || null;
  }, [data]);

  return (
    <AnimatePresence>
      {mostUrgent && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-3 md:hidden
                     bg-background/85 backdrop-blur-md border-t border-border"
        >
          <Button
            className="w-full h-12 gap-2 font-semibold text-sm"
            variant="destructive"
            onClick={() => onAction(mostUrgent)}
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>Cobrar el más urgente</span>
            <span className="font-bold">· {formatCurrency(Number(mostUrgent.balance))}</span>
            <span className="text-xs font-normal opacity-75 truncate max-w-[100px] hidden xs:inline">
              — {mostUrgent.customerName}
            </span>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
