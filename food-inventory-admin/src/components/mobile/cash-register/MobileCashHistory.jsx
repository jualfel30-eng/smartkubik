import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { listItem, STAGGER } from '@/lib/motion';
import { useAuth } from '@/hooks/use-auth';
import MobileActionSheet from '../MobileActionSheet.jsx';

const fmt = (n, currency = 'USD') => {
  if (currency === 'VES') return `Bs ${(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const STATUS_BADGE = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-500' },
  approved: { label: 'Aprobado', color: 'bg-emerald-500/15 text-emerald-500' },
  rejected: { label: 'Rechazado', color: 'bg-red-500/15 text-red-500' },
};

export default function MobileCashHistory({ open, onClose }) {
  const { user } = useAuth();
  const [closings, setClosings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchClosings = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await fetchApi(`/cash-register/closings?page=${p}&limit=20`);
      const items = data?.closings || data?.data || data || [];
      if (p === 1) setClosings(items);
      else setClosings(prev => [...prev, ...items]);
      setHasMore(items.length >= 20);
      setPage(p);
    } catch (err) {
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setExpandedId(null);
      fetchClosings(1);
    }
  }, [open, fetchClosings]);

  const loadMore = () => {
    if (!loading && hasMore) fetchClosings(page + 1);
  };

  const handleApprove = async (closingId) => {
    setActionLoading(closingId);
    try {
      await fetchApi('/cash-register/closings/approve', {
        method: 'POST',
        body: JSON.stringify({ closingId }),
      });
      haptics.success();
      toast.success('Cierre aprobado');
      fetchClosings(1);
    } catch (err) {
      haptics.error();
      toast.error('Error al aprobar', { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (closingId) => {
    setActionLoading(closingId);
    try {
      await fetchApi('/cash-register/closings/reject', {
        method: 'POST',
        body: JSON.stringify({ closingId }),
      });
      haptics.success();
      toast.success('Cierre rechazado');
      fetchClosings(1);
    } catch (err) {
      haptics.error();
      toast.error('Error al rechazar', { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  return (
    <MobileActionSheet
      open={open}
      onClose={onClose}
      title="Historial de Cierres"
      snapPoints={[0.7, 0.95]}
      defaultSnap={1}
    >
      {loading && closings.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : closings.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay cierres registrados</p>
        </div>
      ) : (
        <motion.div
          variants={STAGGER(0.04, 0.05)}
          initial="initial"
          animate="animate"
          className="space-y-2"
        >
          {closings.map(c => {
            const expanded = expandedId === c._id;
            const badge = STATUS_BADGE[c.status] || STATUS_BADGE.pending;
            const date = new Date(c.createdAt);
            const diffUsd = (c.differenceUsd || 0);
            const diffVes = (c.differenceVes || 0);

            return (
              <motion.div key={c._id} variants={listItem}>
                {/* Header row (always visible) */}
                <button
                  type="button"
                  onClick={() => { haptics.tap(); setExpandedId(expanded ? null : c._id); }}
                  className="w-full text-left rounded-xl bg-card border border-border p-3 no-tap-highlight active:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })} · {date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', badge.color)}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{c.closingNumber || `Cierre #${c._id?.slice(-4)}`}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">{fmt(c.closingAmountUsd)}</span>
                      <motion.div
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 py-3 space-y-2">
                        {/* Variance info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-muted/50 p-2">
                            <span className="text-muted-foreground block mb-0.5">Esperado USD</span>
                            <span className="font-semibold tabular-nums">{fmt(c.expectedUsd)}</span>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2">
                            <span className="text-muted-foreground block mb-0.5">Diferencia USD</span>
                            <span className={cn('font-semibold tabular-nums', diffUsd === 0 ? 'text-emerald-500' : Math.abs(diffUsd) <= 5 ? 'text-amber-500' : 'text-red-500')}>
                              {diffUsd >= 0 ? '+' : ''}{fmt(diffUsd)}
                            </span>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2">
                            <span className="text-muted-foreground block mb-0.5">Esperado VES</span>
                            <span className="font-semibold tabular-nums">{fmt(c.expectedVes, 'VES')}</span>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2">
                            <span className="text-muted-foreground block mb-0.5">Diferencia VES</span>
                            <span className={cn('font-semibold tabular-nums', diffVes === 0 ? 'text-emerald-500' : Math.abs(diffVes) <= 5 ? 'text-amber-500' : 'text-red-500')}>
                              {diffVes >= 0 ? '+' : ''}{fmt(diffVes, 'VES')}
                            </span>
                          </div>
                        </div>

                        {/* Notes */}
                        {c.notes && (
                          <p className="text-xs text-muted-foreground italic">"{c.notes}"</p>
                        )}

                        {/* Admin actions */}
                        {isAdmin && c.status === 'pending' && (
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleApprove(c._id)}
                              disabled={actionLoading === c._id}
                              className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-xs font-medium no-tap-highlight active:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Aprobar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(c._id)}
                              disabled={actionLoading === c._id}
                              className="flex-1 h-9 rounded-lg bg-red-600 text-white text-xs font-medium no-tap-highlight active:bg-red-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="w-full py-3 text-sm text-primary font-medium no-tap-highlight"
            >
              {loading ? 'Cargando…' : 'Cargar más'}
            </button>
          )}
        </motion.div>
      )}
    </MobileActionSheet>
  );
}
