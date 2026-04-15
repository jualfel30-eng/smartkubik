import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addDays, startOfDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RefreshCw, Filter, X, Check, List, CalendarDays } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useOfflineSync } from '@/lib/useOfflineSync';
import OfflineIndicator from '../OfflineIndicator.jsx';
import MobileDayAgenda from './MobileDayAgenda.jsx';
import MobileAgendaList from './MobileAgendaList.jsx';
import MobileWeekStrip from './MobileWeekStrip.jsx';
import MobileAppointmentDetailSheet from './MobileAppointmentDetailSheet.jsx';
import MobileQuickCreateAppointment from './MobileQuickCreateAppointment.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';
import PullProgress from '../primitives/PullProgress.jsx';

function useIsBeauty() {
  const { tenant } = useAuth();
  const key = String(tenant?.verticalProfile?.key || tenant?.vertical || '').toLowerCase();
  return key.includes('beauty') || key.includes('salon');
}

function safeDateOnly(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function transformBeautyBooking(booking) {
  const dateOnly = safeDateOnly(booking.date);
  return {
    ...booking,
    _id: booking._id || booking.id,
    customerName: booking.client?.name || '',
    customerPhone: booking.client?.phone || '',
    serviceId: booking.services?.[0]?.service || booking.services?.[0]?._id,
    serviceName: booking.services?.map((s) => s.name).join(' + ') || '',
    resourceId: booking.professional || booking.professionalId,
    resourceName: booking.professionalName || '',
    startTime:
      dateOnly && booking.startTime
        ? `${dateOnly}T${booking.startTime}:00`
        : booking.startTime || null,
    endTime: booking.endTime,
    bookingNumber: booking.bookingNumber,
    totalPrice: booking.totalPrice,
    totalDuration: booking.totalDuration,
    paymentStatus: booking.paymentStatus,
    status: booking.status || 'pending',
  };
}

// ─── Pull-to-refresh ──────────────────────────────────────────────────────────
function usePullToRefresh(onRefresh) {
  const startY = useRef(null);
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const THRESHOLD = 64;

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setPulling(true);
      setDistance(Math.min(dy, THRESHOLD * 1.5));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (distance >= THRESHOLD) {
      setDistance(0); setPulling(false); startY.current = null;
      await onRefresh();
    } else {
      setDistance(0); setPulling(false); startY.current = null;
    }
  }, [distance, onRefresh]);

  return { pulling, distance, THRESHOLD, onTouchStart, onTouchMove, onTouchEnd };
}

// ─── Horizontal day swipe ─────────────────────────────────────────────────────
function useDaySwipe(onNext, onPrev) {
  const start = useRef(null);

  const onTouchStart = useCallback((e) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (!start.current) return;
    const dx = e.changedTouches[0].clientX - start.current.x;
    const dy = e.changedTouches[0].clientY - start.current.y;
    start.current = null;
    // Only fire if clearly horizontal (dx > threshold AND dx > dy in magnitude)
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) onNext(); else onPrev();
  }, [onNext, onPrev]);

  return { onTouchStart, onTouchEnd };
}

// ─── Filter config ────────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
];

export default function MobileAppointmentsPage() {
  const isBeauty = useIsBeauty();
  const { tenant } = useAuth();
  const { isOnline, cacheAppointments, getCachedAppointments } = useOfflineSync();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(startOfDay(new Date()));
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]); // week range for list view
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [quickOpen, setQuickOpen] = useState(searchParams.get('new') === '1');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'list'

  const endpoint = isBeauty ? '/beauty-bookings' : '/appointments';
  const resourcesEndpoint = isBeauty ? '/professionals' : '/resources';

  const load = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true); else setRefreshing(true);
      const from = format(date, 'yyyy-MM-dd');
      const to = format(addDays(date, 1), 'yyyy-MM-dd');
      // For week strip, load ±3 days
      const weekFrom = format(addDays(date, -3), 'yyyy-MM-dd');
      const weekTo = format(addDays(date, 7), 'yyyy-MM-dd');

      if (!navigator.onLine) {
        // Offline — read from Dexie cache for today
        const tenantId = tenant?._id || tenant?.id || '';
        const cached = await getCachedAppointments(tenantId, from);
        const parsed = isBeauty ? cached.map(transformBeautyBooking) : cached;
        setItems(parsed);
        setAllItems(parsed);
        return;
      }

      const [dayRes, weekRes] = await Promise.allSettled([
        fetchApi(`${endpoint}?startDate=${from}&endDate=${to}`),
        fetchApi(`${endpoint}?startDate=${weekFrom}&endDate=${weekTo}`),
      ]);

      const parseList = (res) => {
        if (res.status !== 'fulfilled') return [];
        const d = res.value;
        const raw = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        return isBeauty ? raw.map(transformBeautyBooking) : raw;
      };

      const dayItems = parseList(dayRes);
      const weekItems = parseList(weekRes);
      setItems(dayItems);
      setAllItems(weekItems);

      // Cache for offline use (store raw booking objects with tenantId + date)
      const tenantId = tenant?._id || tenant?.id || '';
      if (tenantId && dayItems.length) {
        const toCache = dayItems.map((item) => ({ ...item, tenantId, date: from }));
        cacheAppointments(toCache).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      // Network error — try cache
      try {
        const tenantId = tenant?._id || tenant?.id || '';
        const from = format(date, 'yyyy-MM-dd');
        const cached = await getCachedAppointments(tenantId, from);
        if (cached.length) {
          setItems(isBeauty ? cached.map(transformBeautyBooking) : cached);
          toast.info('Mostrando datos en caché');
        } else {
          toast.error('No se pudo cargar la agenda');
        }
      } catch {
        toast.error('No se pudo cargar la agenda');
      }
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [date, endpoint, isBeauty, tenant, cacheAppointments, getCachedAppointments]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchApi(resourcesEndpoint)
      .then((d) => { const l = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []; setResources(l); })
      .catch(() => {});
  }, [resourcesEndpoint]);

  useEffect(() => {
    if (searchParams.get('new') === '1') setQuickOpen(true);
  }, [searchParams]);

  const handleCloseQuick = (created) => {
    setQuickOpen(false);
    if (searchParams.get('new')) { searchParams.delete('new'); setSearchParams(searchParams, { replace: true }); }
    if (created) load();
  };

  const label = useMemo(() => {
    if (isToday(date)) return 'Hoy';
    return format(date, "EEEE d 'de' MMM", { locale: es });
  }, [date]);

  const filteredItems = useMemo(() => {
    let r = viewMode === 'day' ? items : allItems;
    if (statusFilter) r = r.filter((i) => i.status === statusFilter);
    if (resourceFilter) r = r.filter((i) => String(i.resourceId) === resourceFilter);
    return r;
  }, [items, allItems, viewMode, statusFilter, resourceFilter]);

  const activeFilterCount = [statusFilter, resourceFilter].filter(Boolean).length;

  const goNext = useCallback(() => setDate((d) => addDays(d, 1)), []);
  const goPrev = useCallback(() => setDate((d) => addDays(d, -1)), []);

  const pullProps = usePullToRefresh(() => load(true));
  const swipeProps = useDaySwipe(goNext, goPrev);

  // Merge touch handlers: pull-to-refresh handles vertical, day-swipe handles horizontal
  const handleTouchStart = useCallback((e) => {
    pullProps.onTouchStart(e);
    swipeProps.onTouchStart(e);
  }, [pullProps, swipeProps]);

  const handleTouchEnd = useCallback((e) => {
    swipeProps.onTouchEnd(e);
    pullProps.onTouchEnd(e);
  }, [pullProps, swipeProps]);

  return (
    <div
      className="md:hidden mobile-content-pad"
      onTouchStart={handleTouchStart}
      onTouchMove={pullProps.onTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Offline indicator */}
      <OfflineIndicator isOnline={isOnline} />

      {/* Pull indicator */}
      {pullProps.pulling && (
        <div className="flex items-center justify-center text-primary transition-all" style={{ height: Math.min(pullProps.distance, pullProps.THRESHOLD * 1.5) }}>
          <PullProgress progress={pullProps.distance / pullProps.THRESHOLD} />
        </div>
      )}
      {refreshing && (
        <div className="flex items-center justify-center py-2 text-primary">
          <PullProgress progress={1} spinning size={20} />
        </div>
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-30 -mx-4 bg-background/95 backdrop-blur border-b border-border">
        {/* Date navigation row */}
        <div className="flex items-center gap-1 px-4 pt-2 pb-1">
          <button type="button" aria-label="Día anterior" onClick={goPrev} className="tap-target no-tap-highlight rounded-full hover:bg-muted">
            <ChevronLeft size={22} />
          </button>
          <button type="button" onClick={() => setDate(startOfDay(new Date()))} className="flex-1 text-center no-tap-highlight py-1">
            <div className="text-sm font-semibold capitalize">{label}</div>
            <div className="text-[11px] text-muted-foreground">{format(date, 'd MMM yyyy', { locale: es })}</div>
          </button>
          <button type="button" aria-label="Día siguiente" onClick={goNext} className="tap-target no-tap-highlight rounded-full hover:bg-muted">
            <ChevronRight size={22} />
          </button>

          {/* View toggle */}
          <button type="button" aria-label={viewMode === 'day' ? 'Vista lista' : 'Vista día'} onClick={() => setViewMode((v) => v === 'day' ? 'list' : 'day')} className={cn('tap-target no-tap-highlight rounded-full hover:bg-muted', viewMode === 'list' && 'text-primary')}>
            {viewMode === 'day' ? <List size={18} /> : <CalendarDays size={18} />}
          </button>
          <button type="button" aria-label="Filtros" onClick={() => setFilterOpen(true)} className={cn('tap-target no-tap-highlight rounded-full hover:bg-muted relative', activeFilterCount > 0 && 'text-primary')}>
            <Filter size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          <button type="button" aria-label="Recargar" onClick={() => load()} className="tap-target no-tap-highlight rounded-full hover:bg-muted">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Week strip (only in day view) */}
        {viewMode === 'day' && (
          <div className="px-3 pb-1">
            <MobileWeekStrip date={date} items={allItems} onSelect={(d) => setDate(startOfDay(d))} />
          </div>
        )}
      </div>

      {/* Content */}
      {viewMode === 'day' ? (
        <MobileDayAgenda
          date={date}
          items={filteredItems}
          loading={loading}
          onSelect={setSelected}
          onCreateAt={(iso) => setQuickOpen({ startAt: iso })}
        />
      ) : (
        <MobileAgendaList
          items={filteredItems}
          onSelect={setSelected}
          loading={loading}
        />
      )}

      {/* Filter sheet */}
      {filterOpen && (
        <MobileActionSheet open onClose={() => setFilterOpen(false)} title="Filtros">
          <div className="space-y-5 pb-4">
            <section>
              <p className="text-xs font-medium text-muted-foreground mb-2">Estado</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setStatusFilter(opt.value)}
                    className={cn('rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                      statusFilter === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {resources.length > 0 && (
              <section>
                <p className="text-xs font-medium text-muted-foreground mb-2">Profesional</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setResourceFilter('')}
                    className={cn('rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                      !resourceFilter ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
                    Todos
                  </button>
                  {resources.map((r) => {
                    const id = String(r._id || r.id);
                    return (
                      <button key={id} type="button" onClick={() => setResourceFilter(id)}
                        className={cn('rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                          resourceFilter === id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
                        {r.name || r.fullName}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {activeFilterCount > 0 && (
              <button type="button" onClick={() => { setStatusFilter(''); setResourceFilter(''); setFilterOpen(false); }}
                className="w-full rounded-[var(--mobile-radius-md)] border border-destructive/30 text-destructive py-3 text-sm font-medium no-tap-highlight flex items-center justify-center gap-2">
                <X size={14} /> Limpiar filtros
              </button>
            )}
            <button type="button" onClick={() => setFilterOpen(false)}
              className="w-full rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground py-3 text-sm font-semibold no-tap-highlight flex items-center justify-center gap-2">
              <Check size={14} /> Aplicar
            </button>
          </div>
        </MobileActionSheet>
      )}

      {selected && (
        <MobileAppointmentDetailSheet
          appointment={selected}
          endpoint={endpoint}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); load(); }}
        />
      )}

      {quickOpen && (
        <MobileQuickCreateAppointment
          date={date}
          endpoint={endpoint}
          isBeauty={isBeauty}
          isOnline={isOnline}
          initialStart={typeof quickOpen === 'object' ? quickOpen.startAt : null}
          onClose={handleCloseQuick}
        />
      )}
    </div>
  );
}
