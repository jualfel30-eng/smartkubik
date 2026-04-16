import { useState } from 'react';
import { addMinutes, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useConfirm } from '@/hooks/use-confirm';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { Phone, MessageCircle, PlayCircle, CheckCircle2, XCircle, Receipt, CalendarClock, ChevronLeft } from 'lucide-react';
import MobileActionSheet from '../MobileActionSheet.jsx';
import MobilePOS from '../pos/MobilePOS.jsx';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No vino',
};

const toTimeInputValue = (d) => {
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function MobileAppointmentDetailSheet({ appointment, endpoint, onClose, onChanged }) {
  const [ConfirmDialog, confirmDialog] = useConfirm();
  const { isBeauty } = useMobileVertical();
  const [posOpen, setPosOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newStartStr, setNewStartStr] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  if (!appointment) return null;

  const toValidDate = (v) => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const start = toValidDate(appointment.startTime);
  const end = toValidDate(appointment.endTime);
  const phone = appointment.customerPhone || appointment.client?.phone || '';
  const durationMin = (start && end) ? Math.round((end - start) / 60000) : (appointment.totalDuration || 60);
  const canReschedule = appointment.status === 'pending' || appointment.status === 'confirmed';

  const updateStatus = async (next) => {
    try {
      await fetchApi(`${endpoint}/${appointment._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast.success(`Marcada como ${STATUS_LABELS[next] || next}`);
      // Task 2.1: auto-abrir POS al completar para beauty
      if (next === 'completed' && isBeauty) {
        setPosOpen(true);
      } else {
        onChanged?.();
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudo actualizar');
    }
  };

  const handleReschedule = async () => {
    if (!newStartStr) { toast.error('Selecciona una fecha y hora'); return; }
    const newStart = new Date(newStartStr);
    if (Number.isNaN(newStart.getTime())) { toast.error('Fecha inválida'); return; }
    try {
      setRescheduling(true);
      const payload = isBeauty
        ? { date: format(newStart, 'yyyy-MM-dd'), startTime: format(newStart, 'HH:mm') }
        : { startTime: newStart.toISOString(), endTime: addMinutes(newStart, durationMin).toISOString() };
      await fetchApi(`${endpoint}/${appointment._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      haptics.success();
      toast.success('Cita reagendada');
      setRescheduleOpen(false);
      onChanged?.();
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'No se pudo reagendar');
    } finally {
      setRescheduling(false);
    }
  };

  const whatsAppLink = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : null;
  const telLink = phone ? `tel:${phone}` : null;

  return (
    <>
      <MobileActionSheet
        open
        onClose={onClose}
        title={rescheduleOpen ? 'Reagendar cita' : 'Detalle de la cita'}
        snapPoints={[0.6, 0.92]}
        defaultSnap={1}
      >
        {rescheduleOpen ? (
          /* ─── Reschedule form ─── */
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setRescheduleOpen(false)}
              className="flex items-center gap-1 text-sm text-muted-foreground no-tap-highlight"
            >
              <ChevronLeft size={16} /> Volver
            </button>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Nueva fecha y hora</p>
              <input
                type="datetime-local"
                defaultValue={start ? toTimeInputValue(start) : ''}
                onChange={(e) => setNewStartStr(e.target.value)}
                className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-base"
              />
              {newStartStr && !Number.isNaN(new Date(newStartStr).getTime()) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Duración: {durationMin} min · Termina a las{' '}
                  {format(addMinutes(new Date(newStartStr), durationMin), 'HH:mm')}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={rescheduling || !newStartStr}
              onClick={handleReschedule}
              className="w-full rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground py-4 text-base font-bold no-tap-highlight disabled:opacity-50"
            >
              {rescheduling ? 'Guardando…' : 'Confirmar reagendamiento'}
            </button>
          </div>
        ) : (
          /* ─── Main detail view ─── */
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {STATUS_LABELS[appointment.status] || appointment.status}
              </div>
              <h3 className="text-lg font-semibold leading-tight">
                {appointment.customerName || 'Sin cliente'}
              </h3>
              {start && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <CalendarClock size={14} />
                  {format(start, "EEEE d 'de' MMM · HH:mm", { locale: es })}
                  {end ? ` – ${format(end, 'HH:mm')}` : ''}
                </p>
              )}
            </div>

            <div className="rounded-[var(--mobile-radius-md)] border border-border p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Servicio</span>
                <span className="font-medium text-right">{appointment.serviceName || '—'}</span>
              </div>
              {appointment.resourceName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profesional</span>
                  <span className="font-medium">{appointment.resourceName}</span>
                </div>
              )}
              {appointment.totalPrice != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold tabular-nums">
                    ${Number(appointment.totalPrice).toFixed(2)}
                  </span>
                </div>
              )}
              {appointment.notes && (
                <div className="pt-1.5 border-t border-border mt-1.5 text-sm">
                  <div className="text-muted-foreground text-xs mb-0.5">Notas</div>
                  <div>{appointment.notes}</div>
                </div>
              )}
            </div>

            {(telLink || whatsAppLink) && (
              <div className="grid grid-cols-2 gap-2">
                {telLink && (
                  <a
                    href={telLink}
                    className="tap-target rounded-[var(--mobile-radius-md)] bg-muted flex items-center justify-center gap-2 py-3 font-medium text-sm no-tap-highlight"
                  >
                    <Phone size={16} /> Llamar
                  </a>
                )}
                {whatsAppLink && (
                  <a
                    href={whatsAppLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tap-target rounded-[var(--mobile-radius-md)] bg-emerald-600 text-white flex items-center justify-center gap-2 py-3 font-medium text-sm no-tap-highlight"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {appointment.status !== 'in_progress' && appointment.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => updateStatus('in_progress')}
                  className="tap-target rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground flex items-center justify-center gap-2 py-3 font-semibold text-sm no-tap-highlight"
                >
                  <PlayCircle size={18} /> Iniciar
                </button>
              )}
              {appointment.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => updateStatus('completed')}
                  className="tap-target rounded-[var(--mobile-radius-md)] bg-emerald-600 text-white flex items-center justify-center gap-2 py-3 font-semibold text-sm no-tap-highlight"
                >
                  <CheckCircle2 size={18} /> Completar
                </button>
              )}
              <button
                type="button"
                onClick={() => setPosOpen(true)}
                className="tap-target rounded-[var(--mobile-radius-md)] border border-border flex items-center justify-center gap-2 py-3 font-semibold text-sm no-tap-highlight"
              >
                <Receipt size={18} /> Cobrar
              </button>
              {canReschedule && (
                <button
                  type="button"
                  onClick={() => { haptics.tap(); setRescheduleOpen(true); }}
                  className="tap-target rounded-[var(--mobile-radius-md)] border border-border flex items-center justify-center gap-2 py-3 font-semibold text-sm no-tap-highlight"
                >
                  <CalendarClock size={18} /> Reagendar
                </button>
              )}
              {appointment.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirmDialog({
                      title: '¿Cancelar esta cita?',
                      description: 'La cita será marcada como cancelada.',
                      destructive: true,
                    });
                    if (ok) updateStatus('cancelled');
                  }}
                  className="tap-target rounded-[var(--mobile-radius-md)] border border-destructive/30 text-destructive flex items-center justify-center gap-2 py-3 font-semibold text-sm no-tap-highlight"
                >
                  <XCircle size={18} /> Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </MobileActionSheet>

      {posOpen && (
        <MobilePOS
          appointment={appointment}
          onClose={() => setPosOpen(false)}
          onPaid={() => {
            setPosOpen(false);
            onChanged?.();
          }}
        />
      )}
      <ConfirmDialog />
    </>
  );
}
