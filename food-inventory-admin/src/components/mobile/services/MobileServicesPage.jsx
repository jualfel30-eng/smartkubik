import { useCallback, useEffect, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import {
  Scissors, Plus, Edit2, Save, X, GripVertical,
  Clock, DollarSign, Tag, ToggleLeft, ToggleRight,
  ChevronLeft, Image as ImageIcon,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileSearchBar from '../primitives/MobileSearchBar.jsx';
import { trackEvent } from '@/lib/analytics';

// ─── Inline-editable field ────────────────────────────────────────────────────
function Field({ label, value, editing, type = 'text', onChange, prefix, suffix }) {
  if (!editing) {
    return (
      <span className="text-sm text-foreground">
        {prefix}{value || <span className="text-muted-foreground italic">—</span>}{suffix}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

// ─── Service card (reorderable) ───────────────────────────────────────────────
function ServiceCard({ service, onSaved, onToggleActive }) {
  const controls = useDragControls();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (val) => setDraft((d) => ({ ...d, [field]: val }));

  const startEdit = () => {
    setDraft({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      category: service.category || '',
    });
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    try {
      setSaving(true);
      const updated = await fetchApi(`/beauty-services/${service._id || service.id}`, {
        method: 'PUT',
        body: JSON.stringify(draft),
      });
      onSaved?.(updated);
      setEditing(false);
      toast.success('Servicio actualizado');
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    try {
      const updated = await fetchApi(`/beauty-services/${service._id || service.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      onSaved?.(updated);
    } catch {
      toast.error('No se pudo cambiar el estado');
    }
  };

  const imageUrl = service.imageUrl || service.image || null;

  return (
    <Reorder.Item value={service} dragListener={false} dragControls={controls}>
      <div className={cn(
        'rounded-2xl border border-border bg-card overflow-hidden transition-opacity',
        !service.isActive && 'opacity-60',
      )}>
        <div className="flex items-start gap-3 p-4">
          {/* Drag handle */}
          <button
            type="button"
            className="mt-1 touch-none cursor-grab active:cursor-grabbing text-muted-foreground no-tap-highlight shrink-0"
            onPointerDown={(e) => controls.start(e)}
          >
            <GripVertical size={16} />
          </button>

          {/* Thumbnail */}
          <div className="w-12 h-12 rounded-xl bg-muted shrink-0 overflow-hidden flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={service.name} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <Scissors size={18} className="text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            {editing ? (
              <input
                value={draft.name}
                onChange={(e) => set('name')(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary"
                placeholder="Nombre del servicio"
              />
            ) : (
              <p className="text-sm font-semibold truncate">{service.name}</p>
            )}

            {editing ? (
              <input
                value={draft.description}
                onChange={(e) => set('description')(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
                placeholder="Descripción (opcional)"
              />
            ) : (
              service.description && (
                <p className="text-xs text-muted-foreground truncate">{service.description}</p>
              )
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} />
                <Field
                  value={editing ? draft.duration : service.duration}
                  editing={editing}
                  type="number"
                  onChange={set('duration')}
                  suffix=" min"
                />
              </span>
              <span className="flex items-center gap-1 text-xs font-medium">
                <DollarSign size={11} className="text-primary" />
                <Field
                  value={editing ? draft.price : service.price}
                  editing={editing}
                  type="number"
                  onChange={set('price')}
                />
              </span>
              {(editing ? draft.category : service.category) && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag size={11} />
                  <Field
                    value={editing ? draft.category : service.category}
                    editing={editing}
                    onChange={set('category')}
                  />
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {editing ? (
              <>
                <button type="button" onClick={save} disabled={saving}
                  className="tap-target no-tap-highlight text-primary">
                  <Save size={16} />
                </button>
                <button type="button" onClick={cancel}
                  className="tap-target no-tap-highlight text-muted-foreground">
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={startEdit}
                  className="tap-target no-tap-highlight text-muted-foreground">
                  <Edit2 size={16} />
                </button>
                <button type="button" onClick={toggleActive}
                  className="tap-target no-tap-highlight">
                  {service.isActive
                    ? <ToggleRight size={20} className="text-primary" />
                    : <ToggleLeft size={20} className="text-muted-foreground" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}

// ─── Create sheet ─────────────────────────────────────────────────────────────
function CreateServiceSheet({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', duration: 60, price: '', category: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (f) => (v) => setForm((d) => ({ ...d, [f]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Ingresa el nombre del servicio'); return; }
    try {
      setSubmitting(true);
      const created = await fetchApi('/beauty-services', {
        method: 'POST',
        body: JSON.stringify({ ...form, duration: Number(form.duration), price: Number(form.price), isActive: true }),
      });
      trackEvent('service_created', { serviceId: created._id || created.id });
      toast.success('Servicio creado');
      onCreated?.(created);
    } catch {
      toast.error('No se pudo crear el servicio');
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({ label, field, type = 'text', required, placeholder }) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={(e) => set(field)(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <button type="button" onClick={onClose} className="tap-target no-tap-highlight text-muted-foreground">
          <ChevronLeft size={22} />
        </button>
        <h2 className="text-base font-semibold flex-1">Nuevo servicio</h2>
      </div>
      <form onSubmit={submit} className="flex-1 overflow-y-auto p-4 space-y-4">
        <Field label="Nombre *" field="name" required placeholder="Ej: Corte + barba" />
        <Field label="Duración (min)" field="duration" type="number" placeholder="60" />
        <Field label="Precio" field="price" type="number" placeholder="25.00" />
        <Field label="Categoría" field="category" placeholder="Ej: Coloración, Corte…" />
        <Field label="Descripción" field="description" placeholder="Descripción opcional" />
        <div className="pb-safe-bottom">
          <button type="submit" disabled={submitting}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-4 text-base font-bold disabled:opacity-50">
            {submitting ? 'Guardando…' : 'Crear servicio'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MobileServicesPage() {
  const [services, setServices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [creating, setCreating] = useState(false);
  const reorderTimeout = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/beauty-services');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const sorted = [...list].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      setServices(sorted);
    } catch {
      toast.error('No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter
  useEffect(() => {
    let list = services;
    if (!showInactive) list = list.filter((s) => s.isActive !== false);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((s) =>
        s.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
      );
    }
    setFiltered(list);
  }, [services, query, showInactive]);

  const handleReorder = (newOrder) => {
    setFiltered(newOrder);
    setServices((prev) => {
      const ids = newOrder.map((s) => s._id || s.id);
      const rest = prev.filter((s) => !ids.includes(s._id || s.id));
      return [...newOrder, ...rest];
    });

    // Debounced persist order to server
    clearTimeout(reorderTimeout.current);
    reorderTimeout.current = setTimeout(() => {
      newOrder.forEach((s, idx) => {
        fetchApi(`/beauty-services/${s._id || s.id}`, {
          method: 'PUT',
          body: JSON.stringify({ order: idx }),
        }).catch(() => {});
      });
    }, 800);
  };

  const handleSaved = (updated) => {
    setServices((prev) =>
      prev.map((s) => (s._id === updated._id || s.id === updated.id) ? { ...s, ...updated } : s),
    );
  };

  const handleCreated = (created) => {
    setServices((prev) => [...prev, created]);
    setCreating(false);
  };

  const activeCount = services.filter((s) => s.isActive !== false).length;

  if (creating) {
    return <CreateServiceSheet onClose={() => setCreating(false)} onCreated={handleCreated} />;
  }

  return (
    <div className="md:hidden mobile-content-pad space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Servicios</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{activeCount} activos</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold no-tap-highlight"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Search + filter */}
      <MobileSearchBar value={query} onChange={setQuery} placeholder="Buscar servicio…" />
      <button
        type="button"
        onClick={() => setShowInactive((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground no-tap-highlight"
      >
        {showInactive
          ? <ToggleRight size={16} className="text-primary" />
          : <ToggleLeft size={16} />}
        Mostrar inactivos
      </button>

      {/* List */}
      {loading ? (
        <MobileListSkeleton count={6} height="h-20" />
      ) : filtered.length === 0 ? (
        <MobileEmptyState
          icon={Scissors}
          title="Sin servicios"
          description={query ? 'Prueba con otro término' : 'Crea tu primer servicio'}
          action={
            !query && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
              >
                Crear servicio
              </button>
            )
          }
        />
      ) : (
        <Reorder.Group
          axis="y"
          values={filtered}
          onReorder={handleReorder}
          className="space-y-2"
        >
          {filtered.map((service) => (
            <ServiceCard
              key={service._id || service.id}
              service={service}
              onSaved={handleSaved}
            />
          ))}
        </Reorder.Group>
      )}

      {/* Reorder hint */}
      {!loading && filtered.length > 1 && !query && (
        <p className="text-center text-xs text-muted-foreground pt-2">
          Mantén pulsado <GripVertical size={11} className="inline" /> para reordenar
        </p>
      )}
    </div>
  );
}
