import { useEffect, useState, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, Phone, X, AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWaitlist, fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { SPRING, STAGGER, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';
import MobileActionSheet from '../MobileActionSheet.jsx';
import { emitBadgeUpdate } from '@/lib/badge-events';

const STATUS_COLORS = {
  waitlisted: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  notified: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  expired: 'bg-red-500/10 text-red-400 border-red-500/30',
};

function WaitlistCard({ entry, onConvert, onRemove }) {
  const clientName = entry.client?.name || 'Sin nombre';
  const clientPhone = entry.client?.phone || '';
  const prefTime = entry.waitlistPreferredTimeRange;
  const timeLabel = prefTime
    ? `${prefTime.from} - ${prefTime.to}`
    : entry.startTime || '--:--';
  const isNotified = !!entry.waitlistNotifiedAt;
  const isExpired = entry.waitlistExpiresAt && new Date(entry.waitlistExpiresAt) < new Date();

  const statusKey = isExpired ? 'expired' : isNotified ? 'notified' : 'waitlisted';
  const statusLabel = isExpired ? 'Expirado' : isNotified ? 'Notificado' : 'En espera';

  return (
    <motion.div
      variants={listItem}
      layout
      className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{clientName}</p>
            {clientPhone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone size={10} /> {clientPhone}
              </p>
            )}
          </div>
        </div>
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
          STATUS_COLORS[statusKey],
        )}>
          {statusLabel}
        </span>
      </div>

      {/* Details */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock size={12} /> {timeLabel}
        </span>
        <span>Pos. #{entry.waitlistPosition || '—'}</span>
        {entry.services?.length > 0 && (
          <span className="truncate">
            {entry.services.map((s) => s.name || s.service).filter(Boolean).join(', ') || `${entry.services.length} servicio(s)`}
          </span>
        )}
      </div>

      {/* Notified info */}
      {isNotified && !isExpired && entry.waitlistExpiresAt && (
        <div className="flex items-center gap-1.5 text-xs text-blue-500 bg-blue-500/5 rounded-[var(--mobile-radius-md)] px-3 py-2">
          <AlertTriangle size={12} />
          <span>
            Expira {formatDistanceToNow(new Date(entry.waitlistExpiresAt), { locale: es, addSuffix: true })}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => { haptics.tap(); onConvert(entry); }}
          className="flex-1 py-2.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-xs font-semibold no-tap-highlight"
        >
          Convertir en cita
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => { haptics.tap(); onRemove(entry); }}
          className="px-4 py-2.5 rounded-[var(--mobile-radius-md)] border border-destructive/30 text-destructive text-xs font-medium no-tap-highlight"
        >
          <X size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function MobileWaitlistPanel({ open, onClose, onConvertToBooking }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWaitlist({});
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setEntries(list);
    } catch (err) {
      console.error('Waitlist load error:', err);
      toast.error('Error al cargar la lista de espera');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleConvert = (entry) => {
    haptics.success();
    onConvertToBooking?.(entry);
    onClose();
  };

  const handleRemove = async (entry) => {
    try {
      const id = entry._id || entry.id;
      await fetchApi(`/beauty-bookings/${id}`, { method: 'DELETE' });
      haptics.success();
      toast.success('Eliminado de la lista de espera');
      emitBadgeUpdate({ type: 'cancel' });
      setEntries((prev) => prev.filter((e) => (e._id || e.id) !== id));
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'Error al eliminar');
    }
  };

  if (!open) return null;

  const todayEntries = entries.filter((e) => {
    const d = e.waitlistPreferredDate || e.date;
    return d && format(new Date(d), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  });
  const futureEntries = entries.filter((e) => {
    const d = e.waitlistPreferredDate || e.date;
    return d && format(new Date(d), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd');
  });

  return (
    <MobileActionSheet open onClose={onClose} title="Cola de espera">
      <div className="space-y-4 pb-4">
        {/* Refresh */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {entries.length} en espera
          </p>
          <button
            type="button"
            onClick={load}
            className="tap-target no-tap-highlight text-muted-foreground"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && entries.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-2 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox size={40} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Sin clientes en espera</p>
            <p className="text-xs text-muted-foreground mt-1">
              Los clientes se agregan cuando no hay disponibilidad
            </p>
          </div>
        ) : (
          <>
            {/* Today */}
            {todayEntries.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Hoy ({todayEntries.length})
                </p>
                <motion.div
                  className="space-y-3"
                  variants={STAGGER(0.05)}
                  initial="initial"
                  animate="animate"
                >
                  {todayEntries.map((entry) => (
                    <WaitlistCard
                      key={entry._id || entry.id}
                      entry={entry}
                      onConvert={handleConvert}
                      onRemove={handleRemove}
                    />
                  ))}
                </motion.div>
              </section>
            )}

            {/* Future */}
            {futureEntries.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Proximos dias ({futureEntries.length})
                </p>
                <motion.div
                  className="space-y-3"
                  variants={STAGGER(0.05)}
                  initial="initial"
                  animate="animate"
                >
                  {futureEntries.map((entry) => (
                    <WaitlistCard
                      key={entry._id || entry.id}
                      entry={entry}
                      onConvert={handleConvert}
                      onRemove={handleRemove}
                    />
                  ))}
                </motion.div>
              </section>
            )}
          </>
        )}
      </div>
    </MobileActionSheet>
  );
}
