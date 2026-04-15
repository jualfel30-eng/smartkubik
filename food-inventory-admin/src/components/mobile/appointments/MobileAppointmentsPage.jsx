import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addDays, startOfDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RefreshCw, Filter, X, Check } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import MobileDayAgenda from './MobileDayAgenda.jsx';
import MobileAppointmentDetailSheet from './MobileAppointmentDetailSheet.jsx';
import MobileQuickCreateAppointment from './MobileQuickCreateAppointment.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';

function useIsBeauty() {
  const { tenant } = useAuth();
  const key = String(tenant?.verticalProfile?.key || tenant?.vertical || '').toLowerCase();
  return key.includes('beauty') || key.includes('salon');
}

function transformBeautyBooking(booking) {
  return {
    ...booking,
    _id: booking._id || booking.id,
    customerId: booking.client?.phone || booking.bookingNumber,
    customerName: booking.client?.name || '',
    customerPhone: booking.client?.phone || '',
    serviceId: booking.services?.[0]?.service || booking.services?.[0]?._id,
    serviceName: booking.services?.map((s) => s.name).join(' + ') || '',
    resourceId: booking.professional || booking.professionalId,
    resourceName: booking.professionalName || '',
    startTime:
      booking.date && booking.startTime
        ? `${new Date(booking.date).toISOString().slice(0, 10)}T${booking.startTime}:00`
        : booking.startTime,
    endTime: booking.endTime,
    bookingNumber: booking.bookingNumber,
    totalPrice: booking.totalPrice,
    totalDuration: booking.totalDuration,
    paymentStatus: booking.paymentStatus,
    status: booking.status || 'pending',
  };
}

// ─── Pull-to-refresh hook ─────────────────────────────────────────────────────
function usePullToRefresh(onRefresh) {
  const startY = useRef(null);
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const THRESHOLD = 64;

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setPulling(true);
      setDistance(Math.min(dy, THRESHOLD * 1.5));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (distance >= THRESHOLD) {
      setDistance(0);
      setPulling(false);
      startY.current = null;
      await onRefresh();
    } else {
      setDistance(0);
      setPulling(false);
      startY.current = null;
    }
  }, [distance, onRefresh]);

  return { pulling, distance, THRESHOLD, handleTouchStart, handleTouchMove, handleTouchEnd };
}

// ─── Status filter config ─────────────────────────────────────────────────────
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(startOfDay(new Date()));
  const [items, setItems] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [quickOpen, setQuickOpen] = useState(searchParams.get('new') === '1');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const endpoint = isBeauty ? '/beauty-bookings' : '/appointments';
  const resourcesEndpoint = isBeauty ? '/professionals' : '/resources';

  const load = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      else setRefreshing(true);
      const from = format(date, 'yyyy-MM-dd');
      const to = format(addDays(date, 1), 'yyyy-MM-dd');
      const params = new URLSearchParams({ startDate: from, endDate: to });
      const data = await fetchApi(`${endpoint}?${params}`);
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setItems(isBeauty ? list.map(transformBeautyBooking) : list);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar la agenda');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, endpoint, isBeauty]);

  useEffect(() => { load(); }, [load]);

  // Load resources for filter
  useEffect(() => {
    fetchApi(resourcesEndpoint)
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setResources(list);
      })
      .catch(() => {});
  }, [resourcesEndpoint]);

  useEffect(() => {
    if (searchParams.get('new') === '1') setQuickOpen(true);
  }, [searchParams]);

  const handleCloseQuick = (created) => {
    setQuickOpen(false);
    if (searchParams.get('new')) {
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
    if (created) load();
  };

  const label = useMemo(() => {
    if (isToday(date)) return 'Hoy';
    return format(date, "EEEE d 'de' MMM", { locale: es });
  }, [date]);

  // Apply filters client-side
  const filteredItems = useMemo(() => {
    let result = items;
    if (statusFilter) result = result.filter((i) => i.status === statusFilter);
    if (resourceFilter) result = result.filter((i) => String(i.resourceId) === resourceFilter);
    return result;
  }, [items, statusFilter, resourceFilter]);

  const activeFilterCount = [statusFilter, resourceFilter].filter(Boolean).length;

  // Pull-to-refresh
  const { pulling, distance, THRESHOLD, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh(() => load(true));

  return (
    <div
      className="md:hidden mobile-content-pad"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {pulling && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: Math.min(distance, THRESHOLD * 1.5) }}
        >
          <RefreshCw
            size={20}
            className={cn(
              'text-primary transition-transform',
              distance >= THRESHOLD ? 'animate-spin' : '',
            )}
            style={{ transform: `rotate(${(distance / THRESHOLD) * 360}deg)` }}
          />
        </div>
      )}

      {/* Refreshing overlay */}
      {refreshing && (
        <div className="flex items-center justify-center py-3">
          <RefreshCw size={18} className="animate-spin text-primary" />
        </div>
      )}

      {/* Sticky date bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border flex items-center gap-2">
        <button
          type="button"
          aria-label="Día anterior"
          onClick={() => setDate(addDays(date, -1))}
          className="tap-target no-tap-highlight rounded-full hover:bg-muted"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          onClick={() => setDate(startOfDay(new Date()))}
          className="flex-1 text-center no-tap-highlight"
        >
          <div className="text-sm font-semibold capitalize">{label}</div>
          <div className="text-[11px] text-muted-foreground">{format(date, 'd MMM yyyy', { locale: es })}</div>
        </button>
        <button
          type="button"
          aria-label="Día siguiente"
          onClick={() => setDate(addDays(date, 1))}
          className="tap-target no-tap-highlight rounded-full hover:bg-muted"
        >
          <ChevronRight size={22} />
        </button>
        <button
          type="button"
          aria-label="Filtros"
          onClick={() => setFilterOpen(true)}
          className={cn(
            'tap-target no-tap-highlight rounded-full hover:bg-muted relative',
            activeFilterCount > 0 && 'text-primary',
          )}
        >
          <Filter size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          type="button"
          aria-label="Recargar"
          onClick={() => load()}
          className="tap-target no-tap-highlight rounded-full hover:bg-muted"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <MobileDayAgenda
        date={date}
        items={filteredItems}
        loading={loading}
        onSelect={setSelected}
        onCreateAt={(iso) => setQuickOpen({ startAt: iso })}
      />

      {/* Filter sheet */}
      {filterOpen && (
        <MobileActionSheet open onClose={() => setFilterOpen(false)} title="Filtros">
          <div className="space-y-5 pb-4">
            {/* Status filter */}
            <section>
              <p className="text-xs font-medium text-muted-foreground mb-2">Estado</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatusFilter(opt.value)}
                    className={cn(
                      'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                      statusFilter === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Resource filter */}
            {resources.length > 0 && (
              <section>
                <p className="text-xs font-medium text-muted-foreground mb-2">Profesional</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setResourceFilter('')}
                    className={cn(
                      'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                      !resourceFilter
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border',
                    )}
                  >
                    Todos
                  </button>
                  {resources.map((r) => {
                    const id = String(r._id || r.id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setResourceFilter(id)}
                        className={cn(
                          'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                          resourceFilter === id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border',
                        )}
                      >
                        {r.name || r.fullName}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setStatusFilter(''); setResourceFilter(''); setFilterOpen(false); }}
                className="w-full rounded-xl border border-destructive/30 text-destructive py-3 text-sm font-medium no-tap-highlight flex items-center justify-center gap-2"
              >
                <X size={14} /> Limpiar filtros
              </button>
            )}

            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold no-tap-highlight flex items-center justify-center gap-2"
            >
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
          initialStart={typeof quickOpen === 'object' ? quickOpen.startAt : null}
          onClose={handleCloseQuick}
        />
      )}
    </div>
  );
}
