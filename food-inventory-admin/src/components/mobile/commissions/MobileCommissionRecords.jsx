import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGGER, listItem, SPRING, DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { toast } from '@/lib/toast';
import {
  getCommissionRecords,
  approveCommission,
  rejectCommission,
  bulkApproveCommissions,
} from '@/lib/api';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';
import MobileCommissionCard from './MobileCommissionCard.jsx';

const FILTERS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
];

const REJECT_REASONS = [
  'Error de cálculo',
  'Servicio no completado',
  'Cliente canceló',
  'Otro',
];

function groupByDate(records) {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const rec of records) {
    const d = new Date(rec.createdAt);
    const ds = d.toDateString();
    let label;
    if (ds === today) label = 'Hoy';
    else if (ds === yesterday) label = 'Ayer';
    else label = d.toLocaleDateString('es', { day: 'numeric', month: 'long' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(rec);
  }
  return Object.entries(groups);
}

export default function MobileCommissionRecords({
  dateRange,
  initialFilter,
  onClearInitialFilter,
  onPendingCountChange,
}) {
  const [filter, setFilter] = useState(initialFilter || 'pending');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
      onClearInitialFilter?.();
    }
  }, [initialFilter, onClearInitialFilter]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCommissionRecords({
        status: filter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 100,
      });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setRecords(list);
      if (filter === 'pending') onPendingCountChange?.(list.length);
    } catch {
      toast.error('Error al cargar comisiones');
    } finally {
      setLoading(false);
    }
  }, [filter, dateRange, onPendingCountChange]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const grouped = useMemo(() => groupByDate(records), [records]);

  const pendingRecords = useMemo(
    () => records.filter((r) => r.status === 'pending'),
    [records],
  );
  const pendingTotal = useMemo(
    () => pendingRecords.reduce((sum, r) => sum + (r.totalCommission || r.commissionCalculated || 0), 0),
    [pendingRecords],
  );

  // ─── Approve single ─────────────────────────────────────────────────────
  const handleApprove = useCallback(async (id) => {
    try {
      await approveCommission(id);
      setRecords((prev) => prev.map((r) => r._id === id ? { ...r, status: 'approved' } : r));
      onPendingCountChange?.((c) => Math.max(0, (typeof c === 'function' ? c : c) - 1));
      toast.success('Comisión aprobada');
    } catch {
      toast.error('Error al aprobar');
      loadRecords();
    }
  }, [loadRecords, onPendingCountChange]);

  // ─── Reject flow ────────────────────────────────────────────────────────
  const handleRejectOpen = useCallback((record) => {
    setRejectTarget(record);
    setRejectReason('');
    setRejectNote('');
  }, []);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectTarget) return;
    const reason = rejectReason === 'Otro' ? (rejectNote || 'Otro') : rejectReason;
    if (!reason) { toast.error('Selecciona un motivo'); return; }
    setProcessing(true);
    try {
      await rejectCommission(rejectTarget._id, reason);
      setRecords((prev) => prev.map((r) => r._id === rejectTarget._id ? { ...r, status: 'rejected', rejectionReason: reason } : r));
      onPendingCountChange?.((c) => Math.max(0, c - 1));
      haptics.error();
      toast.success('Comisión rechazada');
      setRejectTarget(null);
    } catch {
      toast.error('Error al rechazar');
    } finally {
      setProcessing(false);
    }
  }, [rejectTarget, rejectReason, rejectNote, onPendingCountChange]);

  // ─── Bulk approve ───────────────────────────────────────────────────────
  const handleBulkApprove = useCallback(async () => {
    setProcessing(true);
    try {
      const ids = pendingRecords.map((r) => r._id);
      await bulkApproveCommissions(ids);
      setRecords((prev) => prev.map((r) =>
        ids.includes(r._id) ? { ...r, status: 'approved' } : r,
      ));
      onPendingCountChange?.(0);
      haptics.success();
      toast.success(`${ids.length} comisiones aprobadas`);
      setBulkConfirmOpen(false);
    } catch {
      toast.error('Error al aprobar en lote');
    } finally {
      setProcessing(false);
    }
  }, [pendingRecords, onPendingCountChange]);

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="flex flex-col h-full">
      {/* Status filter pills */}
      <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => { haptics.tap(); setFilter(f.id); }}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap no-tap-highlight transition-colors',
              filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {f.label}
            {f.id === 'pending' && pendingRecords.length > 0 && filter !== 'pending' && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] rounded-full min-w-[16px] h-[16px] inline-flex items-center justify-center px-0.5">
                {pendingRecords.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Records list */}
      <div className="flex-1 overflow-y-auto px-4">
        {loading && records.length === 0 ? (
          <MobileListSkeleton count={4} height="h-24" className="pt-2" />
        ) : records.length === 0 ? (
          <MobileEmptyState
            icon={CheckCircle}
            title={filter === 'pending' ? 'Sin comisiones pendientes' : 'Sin registros'}
            description={filter === 'pending' ? 'Todas las comisiones han sido procesadas' : 'No hay comisiones en este período'}
          />
        ) : (
          <motion.div className="space-y-1 pb-4" variants={STAGGER(0.03)} initial="initial" animate="animate">
            {grouped.map(([dateLabel, recs]) => (
              <div key={dateLabel}>
                <div className="sticky top-0 z-[5] bg-background/95 backdrop-blur-sm py-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {dateLabel}
                  </p>
                </div>
                <div className="space-y-2">
                  {recs.map((rec) => (
                    <MobileCommissionCard
                      key={rec._id}
                      record={rec}
                      onApprove={handleApprove}
                      onReject={handleRejectOpen}
                    />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Bulk approve sticky footer */}
      {filter === 'pending' && pendingRecords.length > 0 && (
        <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3"
          style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom, 0px))' }}
        >
          <button
            type="button"
            onClick={() => { haptics.tap(); setBulkConfirmOpen(true); }}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold no-tap-highlight active:scale-[0.98] transition-transform"
          >
            Aprobar todas ({pendingRecords.length})
          </button>
        </div>
      )}

      {/* Reject reason sheet */}
      <MobileActionSheet
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Rechazar comisión"
      >
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {rejectTarget?.employeeName} — {fmt(rejectTarget?.totalCommission || rejectTarget?.commissionCalculated)}
          </p>
          <div className="flex flex-wrap gap-2">
            {REJECT_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setRejectReason(r)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium no-tap-highlight transition-colors',
                  rejectReason === r ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40' : 'bg-muted text-muted-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>
          {rejectReason === 'Otro' && (
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Describe el motivo..."
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
          <button
            type="button"
            onClick={handleRejectConfirm}
            disabled={!rejectReason || processing}
            className="w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50 no-tap-highlight"
          >
            {processing ? 'Rechazando...' : 'Confirmar rechazo'}
          </button>
        </div>
      </MobileActionSheet>

      {/* Bulk approve confirmation sheet */}
      <MobileActionSheet
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        title="Confirmar aprobación"
      >
        <div className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            ¿Aprobar <strong>{pendingRecords.length}</strong> comisiones por <strong>{fmt(pendingTotal)}</strong>?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setBulkConfirmOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium no-tap-highlight"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={processing}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 no-tap-highlight"
            >
              {processing ? 'Aprobando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </MobileActionSheet>
    </div>
  );
}
