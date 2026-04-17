import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listItem, SPRING, DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';

const STATUS_CONFIG = {
  pending: { color: 'border-l-amber-500', badge: 'bg-amber-500/20 text-amber-400', label: 'Pendiente' },
  approved: { color: 'border-l-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400', label: 'Aprobada' },
  rejected: { color: 'border-l-red-500', badge: 'bg-red-500/20 text-red-400', label: 'Rechazada' },
};

export default function MobileCommissionCard({ record, onApprove, onReject }) {
  const [animState, setAnimState] = useState(null); // 'approving' | 'approved' | null
  const status = animState === 'approved' ? 'approved' : (record.status || 'pending');
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isPending = record.status === 'pending' && !animState;

  const handleApprove = async () => {
    setAnimState('approving');
    haptics.success();
    // Brief green flash then update
    setTimeout(() => setAnimState('approved'), 300);
    await onApprove?.(record._id);
  };

  const handleReject = () => {
    onReject?.(record);
  };

  const fmt = (n) => {
    const val = Number(n) || 0;
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <motion.div
      variants={listItem}
      layout
      className={cn(
        'relative bg-card rounded-[var(--mobile-radius-md,0.75rem)] border border-border border-l-4 overflow-hidden',
        cfg.color,
      )}
    >
      {/* Approve flash overlay */}
      <AnimatePresence>
        {animState === 'approving' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-emerald-500 z-10 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="p-3">
        {/* Header: employee + status badge */}
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {record.employeeName || 'Profesional'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {record.orderRef || record.serviceName || 'Servicio'}
            </p>
          </div>
          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2', cfg.badge)}>
            {cfg.label}
          </span>
        </div>

        {/* Amounts */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs text-muted-foreground">Base: {fmt(record.baseAmount)}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-sm font-bold text-foreground">{fmt(record.totalCommission || record.commissionCalculated)}</span>
        </div>

        {/* Plan name */}
        {record.planName && (
          <p className="text-[11px] text-muted-foreground mb-2">
            Plan: {record.planName}
          </p>
        )}

        {/* Actions for pending */}
        {isPending && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleApprove}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium no-tap-highlight active:scale-95 transition-transform"
            >
              <Check size={14} />
              Aprobar
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm font-medium no-tap-highlight active:scale-95 transition-transform"
            >
              <X size={14} />
              Rechazar
            </button>
          </div>
        )}

        {/* Rejection reason */}
        {record.status === 'rejected' && record.rejectionReason && (
          <p className="text-[11px] text-red-400/80 mt-1">
            Motivo: {record.rejectionReason}
          </p>
        )}
      </div>
    </motion.div>
  );
}
