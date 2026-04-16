import { useRef, useState } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { format } from 'date-fns';
import { Check, Receipt, X, User } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { SPRING, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';
import MobilePOS from '../pos/MobilePOS.jsx';

const STATUS_COLOR = {
  pending: 'bg-amber-500',
  confirmed: 'bg-info',
  in_progress: 'bg-emerald-500',
  completed: 'bg-muted-foreground',
  cancelled: 'bg-destructive',
  no_show: 'bg-destructive',
};

const STATUS_LABEL = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No vino',
};

const REVEAL = 168; // 3 actions × 56px

export default function MobileAppointmentCard({ appointment, onTap, onChanged }) {
  const [ConfirmDialog, confirm] = useConfirm();
  const [posOpen, setPosOpen] = useState(false);
  const x = useMotionValue(0);
  const actionsOpacity = useTransform(x, [-REVEAL, -40, 0], [1, 0.3, 0]);
  const draggedRef = useRef(false);
  const revealHapticFiredRef = useRef(false);

  const toValidDate = (v) => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const start = toValidDate(appointment.startTime);
  const end = toValidDate(appointment.endTime);

  const statusDot = STATUS_COLOR[appointment.status] || 'bg-muted';
  const statusLabel = STATUS_LABEL[appointment.status] || appointment.status;
  const inProgress = appointment.status === 'in_progress';

  const close = () => animate(x, 0, SPRING.snappy);

  const onDrag = (_, info) => {
    if (!revealHapticFiredRef.current && info.offset.x < -REVEAL / 2) {
      haptics.select();
      revealHapticFiredRef.current = true;
    } else if (revealHapticFiredRef.current && info.offset.x > -REVEAL / 2) {
      revealHapticFiredRef.current = false;
    }
  };

  const onDragEnd = (_, info) => {
    draggedRef.current = Math.abs(info.offset.x) > 6;
    if (info.offset.x < -REVEAL / 2) {
      animate(x, -REVEAL, SPRING.snappy);
    } else {
      close();
    }
  };

  const quickAction = async (action) => {
    try {
      if (action === 'complete') {
        await fetchApi(`/beauty-bookings/${appointment._id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        });
        haptics.success();
        toast.success('Cita completada');
      } else if (action === 'cancel') {
        const ok = await confirm({
          title: '¿Cancelar esta cita?',
          description: 'La cita será marcada como cancelada.',
          destructive: true,
        });
        if (!ok) return;
        await fetchApi(`/beauty-bookings/${appointment._id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'cancelled' }),
        });
        haptics.warning();
        toast.success('Cita cancelada');
      } else if (action === 'charge') {
        haptics.tap();
        setPosOpen(true);
        return;
      }
      close();
      onChanged?.();
    } catch (err) {
      console.error(err);
      haptics.error();
      toast.error('No se pudo actualizar');
    }
  };

  return (
    <>
    <motion.div
      variants={listItem}
      className="relative overflow-hidden bg-card border border-border"
      style={{
        borderRadius: 'var(--mobile-radius-lg)',
        boxShadow: 'var(--elevation-rest)',
      }}
    >
      {inProgress && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            borderRadius: 'var(--mobile-radius-lg)',
            boxShadow: 'var(--ring-active-glow)',
          }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* Swipe-reveal actions */}
      <motion.div
        aria-hidden
        style={{ opacity: actionsOpacity }}
        className="absolute inset-y-0 right-0 flex"
      >
        <button
          type="button"
          aria-label="Completar"
          onClick={() => quickAction('complete')}
          className="h-full w-14 flex items-center justify-center bg-emerald-600 text-white no-tap-highlight active:opacity-80"
        >
          <Check size={20} />
        </button>
        <button
          type="button"
          aria-label="Cobrar"
          onClick={() => quickAction('charge')}
          className="h-full w-14 flex items-center justify-center bg-primary text-primary-foreground no-tap-highlight active:opacity-80"
        >
          <Receipt size={20} />
        </button>
        <button
          type="button"
          aria-label="Cancelar"
          onClick={() => quickAction('cancel')}
          className="h-full w-14 flex items-center justify-center bg-destructive text-destructive-foreground no-tap-highlight active:opacity-80"
        >
          <X size={20} />
        </button>
      </motion.div>

      {/* Draggable card */}
      <motion.button
        type="button"
        drag="x"
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={0.1}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        whileTap={{ scale: 0.985 }}
        onClick={(e) => {
          if (draggedRef.current) {
            e.preventDefault();
            draggedRef.current = false;
            return;
          }
          haptics.tap();
          close();
          onTap?.();
        }}
        style={{ x }}
        className={cn(
          'relative z-[1] w-full text-left bg-card no-tap-highlight no-select',
          'flex items-stretch gap-3 p-3',
        )}
      >
        <div className="flex flex-col items-center justify-center shrink-0 w-14">
          <div className="text-base font-semibold tabular-nums leading-tight">
            {start ? format(start, 'HH:mm') : '--:--'}
          </div>
          {end && (
            <div className="text-[11px] text-muted-foreground tabular-nums">
              {format(end, 'HH:mm')}
            </div>
          )}
        </div>
        <div className="w-0.5 rounded-full bg-muted shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5" aria-live="polite">
            <span className={cn('inline-block w-2 h-2 rounded-full', statusDot)} aria-hidden />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {statusLabel}
            </span>
          </div>
          <div className="mt-0.5 font-semibold truncate">
            {appointment.customerName || 'Sin cliente'}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {appointment.serviceName || 'Servicio'}
          </div>
          {appointment.resourceName && (
            <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
              <User size={12} />
              <span className="truncate">{appointment.resourceName}</span>
            </div>
          )}
        </div>
        {appointment.totalPrice != null && (
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold tabular-nums">
              ${Number(appointment.totalPrice).toFixed(2)}
            </div>
          </div>
        )}
      </motion.button>
    </motion.div>

    {posOpen && (
      <MobilePOS
        appointment={appointment}
        onClose={() => { setPosOpen(false); close(); }}
        onPaid={() => { setPosOpen(false); close(); onChanged?.(); }}
      />
    )}
    <ConfirmDialog />
  </>
  );
}
