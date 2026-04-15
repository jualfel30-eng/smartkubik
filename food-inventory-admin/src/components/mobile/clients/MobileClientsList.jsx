import { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, MessageCircle, CalendarPlus, User, RefreshCw, X } from 'lucide-react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobileSearchBar from '../primitives/MobileSearchBar.jsx';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';

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

  const lastVisit = client.lastPurchaseDate || client.updatedAt;

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
          <p className="font-semibold truncate">{client.name || client.companyName || 'Sin nombre'}</p>
          {phone && <p className="text-xs text-muted-foreground truncate">{phone}</p>}
          {lastVisit && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Última visita: {format(new Date(lastVisit), "d MMM yyyy", { locale: es })}
            </p>
          )}
        </div>

        {/* LTV */}
        {client.totalSpent != null && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">${Number(client.totalSpent).toFixed(0)}</p>
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
  const limit = 20;
  const controllerRef = useRef(null);
  const parentRef = useRef(null);

  const loadClients = useCallback(async (q = '', p = 1, append = false) => {
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(limit), page: String(p) });
      if (q) params.set('search', q);
      params.set('customerType', 'individual');
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
  }, []);

  // Initial load
  useEffect(() => { loadClients('', 1); }, [loadClients]);

  // Search with debounce
  useEffect(() => {
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

  return (
    <div className="space-y-3">
      <MobileSearchBar value={query} onChange={setQuery} placeholder="Buscar cliente…" />

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
    </div>
  );
}
