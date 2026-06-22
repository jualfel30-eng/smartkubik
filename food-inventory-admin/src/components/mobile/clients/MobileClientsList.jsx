import { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Phone, MessageCircle, CalendarPlus, User, RefreshCw, X, SlidersHorizontal, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobileSearchBar from '../primitives/MobileSearchBar.jsx';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';
import { getTierBadge } from '@/components/crm/badges.jsx';

const SORT_OPTIONS = [
  { key: 'totalSpent', label: 'Gasto' },
  { key: 'name', label: 'Nombre' },
  { key: 'lastOrderDate', label: 'Última visita' },
  { key: 'createdAt', label: 'Registro' },
];
const EMPTY_FILTERS = { minSpent: '', maxSpent: '', activityFrom: '', activityTo: '' };

const REVEAL = 168; // 3 acciones × 56px

// ─── Swipe card ───────────────────────────────────────────────────────────────
function ClientCard({ client, onTap, onNewAppointment }) {
  const x = useMotionValue(0);
  const draggedRef = useRef(false);

  const close = () => animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });

  const onDragEnd = (_, info) => {
    draggedRef.current = Math.abs(info.offset.x) > 6;
    if (info.offset.x < -REVEAL / 2) {
      animate(x, -REVEAL, { type: 'spring', stiffness: 400, damping: 35 });
    } else {
      close();
    }
  };

  const phone = client.phone || client.mobile || '';
  const wa = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : null;
  const tel = phone ? `tel:${phone}` : null;

  const initials = (client.name || client.companyName || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  // El backend devuelve las métricas agregadas bajo `metrics` (no en la raíz del documento).
  const totalSpent = client.metrics?.totalSpent;
  const lastVisit =
    client.metrics?.lastOrderDate || client.metrics?.lastDepositDate || client.updatedAt;

  return (
    <div className="relative rounded-[var(--mobile-radius-lg)] overflow-hidden bg-card border border-border">
      {/* Actions behind card */}
      <div className="absolute inset-y-0 right-0 flex" aria-hidden>
        {tel && (
          <a href={tel} onClick={close}
            className="h-full w-14 flex items-center justify-center bg-blue-600 text-white no-tap-highlight">
            <Phone size={18} />
          </a>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" onClick={close}
            className="h-full w-14 flex items-center justify-center bg-emerald-600 text-white no-tap-highlight">
            <MessageCircle size={18} />
          </a>
        )}
        <button type="button" onClick={() => { close(); onNewAppointment?.(client); }}
          className="h-full w-14 flex items-center justify-center bg-primary text-primary-foreground no-tap-highlight">
          <CalendarPlus size={18} />
        </button>
      </div>

      {/* Draggable card */}
      <motion.button
        type="button"
        drag="x"
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={0.1}
        onDragEnd={onDragEnd}
        onClick={(e) => {
          if (draggedRef.current) { e.preventDefault(); draggedRef.current = false; return; }
          close(); onTap?.(client);
        }}
        style={{ x }}
        className="relative z-[1] w-full text-left bg-card no-tap-highlight no-select flex items-center gap-3 p-3"
      >
        {/* Avatar */}
        <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
          {initials || <User size={16} />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-semibold truncate">{client.name || client.companyName || 'Sin nombre'}</p>
            {client.tier && <span className="shrink-0">{getTierBadge(client.tier)}</span>}
          </div>
          {phone && <p className="text-xs text-muted-foreground truncate">{phone}</p>}
          {lastVisit && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Última visita: {format(new Date(lastVisit), "d MMM yyyy", { locale: es })}
            </p>
          )}
        </div>

        {/* LTV */}
        {totalSpent != null && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">${Number(totalSpent).toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">LTV</p>
          </div>
        )}
      </motion.button>
    </div>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────
const ITEM_HEIGHT = 76; // px — approx card height + gap

export default function MobileClientsList({ onSelectClient, onNewAppointment }) {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('totalSpent');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const limit = 20;
  const controllerRef = useRef(null);
  const parentRef = useRef(null);
  const isFirstLoad = useRef(true);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const loadClients = useCallback(async (q = '', p = 1, append = false) => {
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(limit), page: String(p) });
      if (q) params.set('search', q);
      // Clientes = business + individual (excluye proveedores/empleados), igual que el tab "Clientes" del desktop.
      // El default al crear un contacto es 'business', así que filtrar solo 'individual' dejaba la lista vacía.
      params.set('customerType', 'business,individual');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      if (filters.minSpent) params.set('minSpent', filters.minSpent);
      if (filters.maxSpent) params.set('maxSpent', filters.maxSpent);
      if (filters.activityFrom) params.set('lastActivityFrom', filters.activityFrom);
      if (filters.activityTo) params.set('lastActivityTo', filters.activityTo);
      const res = await fetchApi(`/customers?${params}`, { signal: controllerRef.current.signal });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (append) setClients((prev) => [...prev, ...list]);
      else setClients(list);
      setHasMore(list.length === limit);
    } catch (err) {
      if (err.name !== 'AbortError') toast.error('No se pudo cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, filters]);

  // Carga inicial + búsqueda con debounce en UN SOLO effect.
  // Antes había dos effects que al montar disparaban la MISMA petición
  // (/customers?...&customerType=...&page=1 con query vacío): como fetchApi
  // deduplica GETs idénticos devolviendo la misma promesa, el abort de la
  // segunda carga cancelaba esa promesa compartida y AMBAS recibían AbortError
  // → la lista quedaba vacía en redes lentas (móvil). Con una sola carga al
  // montar se elimina la condición de carrera.
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      loadClients('', 1);
      return undefined;
    }
    const t = setTimeout(() => { setPage(1); loadClients(query, 1); }, 300);
    return () => clearTimeout(t);
  }, [query, loadClients]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadClients(query, next, true);
  };

  // Virtual scrolling — renders only visible cards in DOM
  const rowVirtualizer = useVirtualizer({
    count: clients.length + (hasMore ? 1 : 0), // +1 for "load more" sentinel
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const sortIsDefault = sortBy === 'totalSpent' && sortOrder === 'desc';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <MobileSearchBar value={query} onChange={setQuery} placeholder="Buscar cliente…" />
        </div>
        <button
          type="button"
          onClick={() => { setDraft(filters); setPanelOpen(true); }}
          className="relative shrink-0 h-10 w-10 rounded-[var(--mobile-radius-md)] border border-border bg-card flex items-center justify-center no-tap-highlight"
          aria-label="Ordenar y filtrar"
        >
          <SlidersHorizontal size={18} className="text-muted-foreground" />
          {(hasActiveFilters || !sortIsDefault) && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
          )}
        </button>
      </div>

      {loading && clients.length === 0 ? (
        <MobileListSkeleton count={6} />
      ) : clients.length === 0 ? (
        <MobileEmptyState icon={User} title="Sin clientes" description="No se encontraron resultados" />
      ) : (
        // Scroll container for virtual list
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: Math.min(clients.length * ITEM_HEIGHT + 80, window.innerHeight - 280) }}
        >
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const isLoaderRow = virtualRow.index === clients.length;
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: 8,
                  }}
                >
                  {isLoaderRow ? (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full py-3 text-sm font-medium text-primary no-tap-highlight flex items-center justify-center gap-2"
                    >
                      {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Cargar más'}
                    </button>
                  ) : (
                    <ClientCard
                      client={clients[virtualRow.index]}
                      onTap={onSelectClient}
                      onNewAppointment={onNewAppointment}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <MobileActionSheet open={panelOpen} onClose={() => setPanelOpen(false)} title="Ordenar y filtrar">
        <div className="space-y-4 pb-4">
          {/* Orden */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Ordenar por</p>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setSortBy(o.key)}
                  className={cn(
                    'rounded-[var(--mobile-radius-md)] border px-3 py-2 text-sm no-tap-highlight flex items-center justify-between',
                    sortBy === o.key ? 'border-primary text-primary bg-primary/5' : 'border-border text-foreground',
                  )}
                >
                  {o.label}
                  {sortBy === o.key && <Check size={14} />}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setSortOrder('asc')}
                className={cn('flex-1 rounded-[var(--mobile-radius-md)] border px-3 py-2 text-sm no-tap-highlight flex items-center justify-center gap-1',
                  sortOrder === 'asc' ? 'border-primary text-primary bg-primary/5' : 'border-border text-foreground')}>
                <ArrowUp size={14} /> Ascendente
              </button>
              <button type="button" onClick={() => setSortOrder('desc')}
                className={cn('flex-1 rounded-[var(--mobile-radius-md)] border px-3 py-2 text-sm no-tap-highlight flex items-center justify-center gap-1',
                  sortOrder === 'desc' ? 'border-primary text-primary bg-primary/5' : 'border-border text-foreground')}>
                <ArrowDown size={14} /> Descendente
              </button>
            </div>
          </div>

          {/* Filtro gasto */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Gasto (LTV)</p>
            <div className="flex items-center gap-2">
              <input type="number" inputMode="numeric" placeholder="Mín" value={draft.minSpent}
                onChange={(e) => setDraft({ ...draft, minSpent: e.target.value })}
                className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-sm" />
              <span className="text-muted-foreground">—</span>
              <input type="number" inputMode="numeric" placeholder="Máx" value={draft.maxSpent}
                onChange={(e) => setDraft({ ...draft, maxSpent: e.target.value })}
                className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Filtro última visita */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Última visita</p>
            <div className="flex items-center gap-2">
              <input type="date" value={draft.activityFrom}
                onChange={(e) => setDraft({ ...draft, activityFrom: e.target.value })}
                className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-sm" />
              <span className="text-muted-foreground">—</span>
              <input type="date" value={draft.activityTo}
                onChange={(e) => setDraft({ ...draft, activityTo: e.target.value })}
                className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-1">
            <button type="button"
              onClick={() => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); }}
              className="flex-1 rounded-[var(--mobile-radius-md)] border border-border py-2.5 text-sm font-medium no-tap-highlight">
              Limpiar
            </button>
            <button type="button"
              onClick={() => { setFilters(draft); setPanelOpen(false); }}
              className="flex-1 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground py-2.5 text-sm font-medium no-tap-highlight">
              Aplicar
            </button>
          </div>
        </div>
      </MobileActionSheet>
    </div>
  );
}
