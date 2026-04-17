import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import MobileActionSheet from '../MobileActionSheet.jsx';
import MobilePOS from './MobilePOS.jsx';
import { cn } from '@/lib/utils';
import { STAGGER, listItem, DUR, EASE, SPRING } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { emitBadgeUpdate } from '@/lib/badge-events';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';

const STATUS_DOT = {
  completed: 'bg-emerald-500',
  in_progress: 'bg-blue-500 animate-pulse',
};

function transformBeautyBooking(b) {
  const dateOnly = b.date ? new Date(b.date).toISOString().slice(0, 10) : null;
  return {
    ...b,
    _id: b._id || b.id,
    customerName: b.client?.name || '',
    serviceName: b.services?.map((s) => s.name).join(' + ') || '',
    resourceName: b.professionalName || '',
    startTime: dateOnly && b.startTime ? `${dateOnly}T${b.startTime}:00` : b.startTime || null,
    totalPrice: b.totalPrice ?? b.services?.reduce((sum, s) => sum + (Number(s.price) || 0), 0) ?? 0,
    status: b.status || 'pending',
  };
}

// ─── Chargeable appointment card ─────────────────────────────────────────────
function ChargeableCard({ apt, onCharge }) {
  const start = apt.startTime ? new Date(apt.startTime) : null;
  const dot = STATUS_DOT[apt.status] || 'bg-muted-foreground';
  const price = Number(apt.totalPrice || 0);

  return (
    <motion.button
      type="button"
      variants={listItem}
      whileTap={{ scale: 0.98 }}
      onClick={() => { haptics.tap(); onCharge(apt); }}
      className="w-full text-left border border-border bg-card p-3 flex items-center gap-3 no-tap-highlight"
      style={{
        borderRadius: 'var(--mobile-radius-lg)',
        boxShadow: 'var(--elevation-rest)',
      }}
    >
      {/* Time */}
      <div className="shrink-0 w-12 text-center">
        <div className="text-base font-bold tabular-nums leading-none">
          {start ? format(start, 'HH:mm') : '--:--'}
        </div>
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('inline-block w-1.5 h-1.5 rounded-full', dot)} />
          <span className="font-semibold text-sm truncate">{apt.customerName || 'Sin cliente'}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {apt.serviceName || 'Servicio'}{apt.resourceName ? ` · ${apt.resourceName}` : ''}
        </p>
      </div>
      {/* Price + action */}
      <div className="shrink-0 flex items-center gap-2">
        {price > 0 && (
          <span className="text-sm font-bold tabular-nums">${price.toFixed(2)}</span>
        )}
        <span className="bg-primary text-primary-foreground rounded-[var(--mobile-radius-md)] px-2.5 py-1.5 text-xs font-semibold no-tap-highlight">
          Cobrar
        </span>
      </div>
    </motion.button>
  );
}

// ─── Success overlay ─────────────────────────────────────────────────────────
function PaymentSuccess({ appointment, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 'var(--z-mobile-sheet)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        className="relative bg-card rounded-[var(--mobile-radius-xl)] p-8 text-center mx-6 max-w-sm w-full"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING.bouncy}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...SPRING.bouncy, delay: 0.15 }}
          className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"
        >
          <CheckCircle2 size={36} className="text-emerald-500" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: DUR.base, ease: EASE.out }}
          className="text-lg font-bold"
        >
          Pago exitoso
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: DUR.base, ease: EASE.out }}
          className="text-sm text-muted-foreground mt-1"
        >
          {appointment?.customerName} · ${Number(appointment?.totalPrice || 0).toFixed(2)}
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: DUR.base, ease: EASE.out }}
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground font-semibold no-tap-highlight"
        >
          Cerrar
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function MobileChargeFlow({ onClose }) {
  const [chargeables, setChargeables] = useState([]);
  const [todayPaid, setTodayPaid] = useState({ count: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedApt, setSelectedApt] = useState(null);
  const [showSuccess, setShowSuccess] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
      const res = await fetchApi(`/beauty-bookings?startDate=${today}&endDate=${tomorrow}&limit=100`);
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const bookings = raw.map(transformBeautyBooking);

      // Chargeable: completed or in_progress WITHOUT full payment
      const unpaid = bookings.filter(
        (b) => (b.status === 'completed' || b.status === 'in_progress') && b.paymentStatus !== 'paid',
      );
      // Already paid today
      const paid = bookings.filter((b) => b.paymentStatus === 'paid');
      const paidTotal = paid.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

      setChargeables(unpaid);
      setTodayPaid({ count: paid.length, total: paidTotal });
    } catch (err) {
      toast.error('Error al cargar citas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCharge = (apt) => {
    setSelectedApt(apt);
  };

  const handlePaid = () => {
    haptics.success();
    const paidApt = selectedApt;
    setSelectedApt(null);
    setShowSuccess(paidApt);
    emitBadgeUpdate({ type: 'payment' });
    // Reload list after short delay for animation
    setTimeout(load, 500);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(null);
  };

  // Separate completed and in_progress
  const completedUnpaid = chargeables.filter((a) => a.status === 'completed');
  const inProgressUnpaid = chargeables.filter((a) => a.status === 'in_progress');

  // If POS is open, show it instead
  if (selectedApt) {
    return (
      <MobilePOS
        appointment={selectedApt}
        onClose={() => setSelectedApt(null)}
        onPaid={handlePaid}
      />
    );
  }

  return (
    <>
      <MobileActionSheet
        open
        onClose={() => onClose?.()}
        title="Cobrar"
      >
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-[var(--mobile-radius-lg)]" />
            ))}
          </div>
        ) : chargeables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 size={40} className="text-emerald-500/30 mb-3" />
            <p className="text-sm font-medium">No hay citas por cobrar</p>
            <p className="text-xs text-muted-foreground mt-1">Todas las citas de hoy estan al dia</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Completed unpaid */}
            {completedUnpaid.length > 0 && (
              <section>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Por cobrar ({completedUnpaid.length})
                </p>
                <motion.div
                  className="space-y-2"
                  variants={STAGGER(0.04)}
                  initial="initial"
                  animate="animate"
                >
                  {completedUnpaid.map((apt) => (
                    <ChargeableCard key={apt._id} apt={apt} onCharge={handleCharge} />
                  ))}
                </motion.div>
              </section>
            )}

            {/* In progress */}
            {inProgressUnpaid.length > 0 && (
              <section>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  En curso ({inProgressUnpaid.length})
                </p>
                <motion.div
                  className="space-y-2"
                  variants={STAGGER(0.04)}
                  initial="initial"
                  animate="animate"
                >
                  {inProgressUnpaid.map((apt) => (
                    <ChargeableCard key={apt._id} apt={apt} onCharge={handleCharge} />
                  ))}
                </motion.div>
              </section>
            )}

            {/* Today's paid summary */}
            {todayPaid.count > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground border-t border-border pt-3">
                <DollarSign size={14} className="text-emerald-500" />
                <span>
                  <AnimatedNumber
                    value={todayPaid.total}
                    format={(n) => `$${n.toFixed(2)}`}
                  />
                  {' '}cobrado en {todayPaid.count} cita{todayPaid.count > 1 ? 's' : ''} hoy
                </span>
              </div>
            )}
          </div>
        )}
      </MobileActionSheet>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <PaymentSuccess
            appointment={showSuccess}
            onClose={handleCloseSuccess}
          />
        )}
      </AnimatePresence>
    </>
  );
}
