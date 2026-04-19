import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, RefreshCw, ChevronDown } from 'lucide-react';
import MobileActionSheet from '../MobileActionSheet.jsx';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { listItem, STAGGER } from '@/lib/motion';
import haptics from '@/lib/haptics';

function formatCurrency(n, currency) {
  const sym = currency === 'VES' ? 'Bs' : '$';
  return `${sym} ${Math.abs(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'long' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function groupByDate(movements) {
  const groups = {};
  for (const mov of movements) {
    const date = new Date(mov.transactionDate || mov.date || mov.createdAt);
    const key = date.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = { label: formatDate(date), items: [] };
    groups[key].items.push(mov);
  }
  return Object.values(groups);
}

function MovementRow({ mov, currency }) {
  const [expanded, setExpanded] = useState(false);
  const isCredit = mov.type === 'credit' || mov.type === 'adjustment_credit';
  const isAdjustment = mov.type === 'adjustment' || mov.type === 'adjustment_credit' || mov.type === 'adjustment_debit';

  const stripeColor = isAdjustment
    ? 'bg-blue-500'
    : isCredit
    ? 'bg-emerald-500'
    : 'bg-destructive';

  const amountColor = isCredit ? 'text-emerald-400' : 'text-destructive';
  const Icon = isCredit ? ArrowUpRight : ArrowDownRight;

  return (
    <button
      onClick={() => { haptics.tap(); setExpanded(!expanded); }}
      className="w-full text-left no-tap-highlight"
    >
      <div className="flex items-start gap-3 py-3 px-4">
        <div className={`w-0.5 self-stretch rounded-full ${stripeColor} shrink-0`} />
        <Icon size={16} className={`${amountColor} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{mov.description || (isCredit ? 'Ingreso' : 'Egreso')}</p>
          <p className="text-[11px] text-muted-foreground">{formatTime(mov.transactionDate || mov.date || mov.createdAt)}</p>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-sm font-bold tabular-nums ${amountColor}`}>
            {isCredit ? '+' : '-'}{formatCurrency(mov.amount, currency)}
          </span>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pl-10 space-y-1">
              {mov.reference && (
                <p className="text-[11px] text-muted-foreground">Ref: {mov.reference}</p>
              )}
              {mov.reconciliationStatus && (
                <span className={`inline-block text-[10px] font-medium rounded-full px-2 py-0.5 ${
                  mov.reconciliationStatus === 'conciliado'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : mov.reconciliationStatus === 'descartado'
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {mov.reconciliationStatus}
                </span>
              )}
              {mov.metadata?.note && (
                <p className="text-[11px] text-muted-foreground">{mov.metadata.note}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

export default function MobileBankMovements({ open, onClose, account }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchMovements = useCallback(async (p = 1, append = false) => {
    if (!account?._id) return;
    setLoading(true);
    try {
      const res = await fetchApi(`/bank-accounts/${account._id}/movements?page=${p}&limit=20`);
      const data = res.data || res;
      const items = Array.isArray(data) ? data : data?.data || [];
      const pagination = res.pagination || data?.pagination || {};

      setMovements(prev => append ? [...prev, ...items] : items);
      setPage(p);
      setHasMore(p < (pagination.totalPages || 1));
    } catch (error) {
      toast.error('Error al cargar movimientos', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [account?._id]);

  useEffect(() => {
    if (open && account?._id) {
      setMovements([]);
      setPage(1);
      fetchMovements(1);
    }
  }, [open, account?._id, fetchMovements]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchMovements(page + 1, true);
    }
  };

  const dateGroups = groupByDate(movements);

  return (
    <MobileActionSheet
      open={open}
      onClose={onClose}
      title={`Movimientos · ${account?.bankName || ''}`}
    >
      <div className="px-0 pb-4 min-h-[40vh]">
        {loading && movements.length === 0 ? (
          <div className="space-y-3 px-4 pt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <RefreshCw size={28} className="mb-2 opacity-40" />
            <p className="text-sm">Sin movimientos en esta cuenta</p>
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={{ visible: STAGGER(0.03) }}>
            {dateGroups.map((group, gi) => (
              <motion.div key={gi} variants={listItem}>
                <div className="sticky top-0 bg-background/90 backdrop-blur px-4 py-1.5 z-10">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {group.items.map((mov) => (
                    <MovementRow key={mov._id} mov={mov} currency={account?.currency} />
                  ))}
                </div>
              </motion.div>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 text-sm text-primary font-medium flex items-center justify-center gap-1"
              >
                <ChevronDown size={14} />
                {loading ? 'Cargando...' : 'Cargar más'}
              </button>
            )}
          </motion.div>
        )}
      </div>
    </MobileActionSheet>
  );
}
