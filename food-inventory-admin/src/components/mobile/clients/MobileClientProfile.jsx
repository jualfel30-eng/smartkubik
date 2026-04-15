import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Phone, MessageCircle, CalendarPlus, ChevronLeft,
  Tag, StickyNote, Check, Scissors, Clock, Edit2, Save,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const STATUS_COLOR = {
  pending: 'bg-amber-500', confirmed: 'bg-blue-500',
  in_progress: 'bg-emerald-500', completed: 'bg-muted-foreground',
  cancelled: 'bg-destructive',
};
const STATUS_LABEL = {
  pending: 'Pendiente', confirmed: 'Confirmada',
  in_progress: 'En curso', completed: 'Completada', cancelled: 'Cancelada',
};

// ─── Beauty preferences editor ────────────────────────────────────────────────
function BeautyPreferences({ client, onSave }) {
  const [editing, setEditing] = useState(false);
  const [prefs, setPrefs] = useState(client.beautyPreferences || {
    formula: '', preferredStyle: '', allergies: '', notes: '',
  });

  const save = async () => {
    try {
      await fetchApi(`/customers/${client._id || client.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ beautyPreferences: prefs }),
      });
      toast.success('Preferencias guardadas');
      setEditing(false);
      onSave?.({ ...client, beautyPreferences: prefs });
    } catch (err) {
      toast.error('No se pudo guardar');
    }
  };

  const Field = ({ label, field, placeholder, multiline = false }) => (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      {editing ? (
        multiline ? (
          <textarea
            value={prefs[field] || ''}
            onChange={(e) => setPrefs({ ...prefs, [field]: e.target.value })}
            rows={2}
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-sm"
            placeholder={placeholder}
          />
        ) : (
          <input
            value={prefs[field] || ''}
            onChange={(e) => setPrefs({ ...prefs, [field]: e.target.value })}
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-sm"
            placeholder={placeholder}
          />
        )
      ) : (
        <p className={cn('text-sm', !prefs[field] && 'text-muted-foreground italic')}>
          {prefs[field] || 'Sin datos'}
        </p>
      )}
    </div>
  );

  return (
    <div className="rounded-[var(--mobile-radius-lg)] border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Scissors size={14} className="text-primary" /> Preferencias beauty
        </h3>
        <button type="button" onClick={() => editing ? save() : setEditing(true)}
          className="tap-target no-tap-highlight text-primary flex items-center gap-1 text-xs font-medium">
          {editing ? <><Save size={13} /> Guardar</> : <><Edit2 size={13} /> Editar</>}
        </button>
      </div>
      <Field label="Fórmula / tinte" field="formula" placeholder="Ej: 7.1 rubio ceniza, 20vol" />
      <Field label="Estilo preferido" field="preferredStyle" placeholder="Ej: corte bob, degradé" />
      <Field label="Alergias / contraindicaciones" field="allergies" placeholder="Ej: alérgica a la keratina" multiline />
      <Field label="Notas adicionales" field="notes" placeholder="Preferencias generales…" multiline />
      {editing && (
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted-foreground no-tap-highlight">
          Cancelar
        </button>
      )}
    </div>
  );
}

// ─── Tags editor ─────────────────────────────────────────────────────────────
function TagsEditor({ client, onSave }) {
  const [tags, setTags] = useState(client.tags || []);
  const [input, setInput] = useState('');

  const addTag = () => {
    const t = input.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setInput('');
    fetchApi(`/customers/${client._id || client.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ tags: next }),
    }).catch(() => toast.error('No se pudo guardar el tag'));
  };

  const removeTag = (tag) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    fetchApi(`/customers/${client._id || client.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ tags: next }),
    }).catch(() => toast.error('No se pudo quitar el tag'));
  };

  return (
    <div className="rounded-[var(--mobile-radius-lg)] border border-border bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Tag size={14} className="text-primary" /> Tags
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="no-tap-highlight hover:text-destructive">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTag()}
          placeholder="Nuevo tag…"
          className="flex-1 rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="button" onClick={addTag} className="rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground px-3 py-2 text-sm font-medium no-tap-highlight">
          +
        </button>
      </div>
    </div>
  );
}

// ─── Appointment timeline ─────────────────────────────────────────────────────
function AppointmentTimeline({ bookings }) {
  if (!bookings?.length) {
    return <p className="text-sm text-muted-foreground text-center py-4">Sin historial de citas</p>;
  }
  return (
    <div className="space-y-2">
      {bookings.slice(0, 12).map((b) => {
        const dot = STATUS_COLOR[b.status] || 'bg-muted';
        const services = b.services?.map((s) => s.name).join(' + ') || b.serviceName || '—';
        const dt = b.date ? new Date(b.date) : b.startTime ? new Date(b.startTime) : null;
        return (
          <div key={b._id || b.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
            <div className="shrink-0 flex flex-col items-center gap-1 w-10 pt-0.5">
              <span className={cn('w-2 h-2 rounded-full', dot)} />
              {dt && <span className="text-[10px] text-muted-foreground tabular-nums">{format(dt, 'd/M')}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{services}</p>
              {b.professionalName && <p className="text-xs text-muted-foreground">{b.professionalName}</p>}
              <p className="text-xs text-muted-foreground">{STATUS_LABEL[b.status] || b.status}</p>
            </div>
            {b.totalPrice != null && (
              <p className="text-sm font-semibold tabular-nums shrink-0">${Number(b.totalPrice).toFixed(2)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main profile ─────────────────────────────────────────────────────────────
export default function MobileClientProfile({ client, isBeauty, onBack, onNewAppointment }) {
  const [bookings, setBookings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [localClient, setLocalClient] = useState(client);

  const phone = localClient.phone || localClient.mobile || '';
  const wa = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : null;

  const initials = (localClient.name || localClient.companyName || '?')
    .split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

  const totalSpent = localClient.totalSpent ?? 0;
  const visitCount = bookings.filter((b) => b.status === 'completed').length;

  useEffect(() => {
    if (!isBeauty) return;
    setLoadingHistory(true);
    const clientId = localClient._id || localClient.id;
    // Fetch beauty bookings for this client by phone (only field available)
    fetchApi(`/beauty-bookings?clientPhone=${encodeURIComponent(phone)}&limit=50`)
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setBookings(list.sort((a, b) => new Date(b.date || b.startTime) - new Date(a.date || a.startTime)));
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [isBeauty, phone]);

  return (
    <div className="md:hidden mobile-content-pad space-y-4 pb-6">
      {/* Back button */}
      <button type="button" onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium text-primary no-tap-highlight -ml-1">
        <ChevronLeft size={18} /> Clientes
      </button>

      {/* Hero */}
      <div className="rounded-[var(--mobile-radius-lg)] border border-border bg-card p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-2">
          {initials}
        </div>
        <h1 className="text-lg font-bold">{localClient.name || localClient.companyName}</h1>
        {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
        <div className="mt-3 grid grid-cols-3 divide-x divide-border text-center">
          <div><p className="text-lg font-bold">{visitCount}</p><p className="text-[11px] text-muted-foreground">Visitas</p></div>
          <div><p className="text-lg font-bold">${Number(totalSpent).toFixed(0)}</p><p className="text-[11px] text-muted-foreground">LTV</p></div>
          <div>
            <p className="text-lg font-bold">
              {visitCount > 0 ? `$${(totalSpent / visitCount).toFixed(0)}` : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground">Ticket</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        {phone && (
          <a href={`tel:${phone}`}
            className="rounded-[var(--mobile-radius-lg)] border border-border bg-card flex flex-col items-center gap-1.5 py-3 no-tap-highlight">
            <Phone size={18} className="text-primary" />
            <span className="text-xs font-medium">Llamar</span>
          </a>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="rounded-[var(--mobile-radius-lg)] border border-border bg-card flex flex-col items-center gap-1.5 py-3 no-tap-highlight">
            <MessageCircle size={18} className="text-emerald-600" />
            <span className="text-xs font-medium">WhatsApp</span>
          </a>
        )}
        <button type="button" onClick={() => onNewAppointment?.(localClient)}
          className="rounded-[var(--mobile-radius-lg)] border border-border bg-card flex flex-col items-center gap-1.5 py-3 no-tap-highlight">
          <CalendarPlus size={18} className="text-primary" />
          <span className="text-xs font-medium">Nueva cita</span>
        </button>
      </div>

      {/* Beauty preferences */}
      {isBeauty && (
        <BeautyPreferences client={localClient} onSave={setLocalClient} />
      )}

      {/* Tags */}
      <TagsEditor client={localClient} onSave={setLocalClient} />

      {/* Appointment history */}
      {isBeauty && (
        <div className="rounded-[var(--mobile-radius-lg)] border border-border bg-card p-4">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
            <Clock size={14} className="text-primary" /> Historial de citas
          </h3>
          {loadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-[var(--mobile-radius-md)] bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <AppointmentTimeline bookings={bookings} />
          )}
        </div>
      )}
    </div>
  );
}
