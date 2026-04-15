import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addDays, startOfDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import MobileDayAgenda from './MobileDayAgenda.jsx';
import MobileAppointmentDetailSheet from './MobileAppointmentDetailSheet.jsx';
import MobileQuickCreateAppointment from './MobileQuickCreateAppointment.jsx';

// Página móvil de agenda (solo render si md:hidden).
// Detecta vertical beauty → usa /beauty-bookings, resto → /appointments.

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

export default function MobileAppointmentsPage() {
  const isBeauty = useIsBeauty();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(startOfDay(new Date()));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [quickOpen, setQuickOpen] = useState(searchParams.get('new') === '1');

  const endpoint = isBeauty ? '/beauty-bookings' : '/appointments';

  const load = useCallback(async () => {
    try {
      setLoading(true);
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
    }
  }, [date, endpoint, isBeauty]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="md:hidden mobile-content-pad">
      {/* Sticky date bar */}
      <div
        className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border flex items-center gap-2"
      >
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
          aria-label="Recargar"
          onClick={load}
          className="tap-target no-tap-highlight rounded-full hover:bg-muted"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <MobileDayAgenda
        date={date}
        items={items}
        loading={loading}
        onSelect={setSelected}
        onCreateAt={(iso) => {
          setQuickOpen({ startAt: iso });
        }}
      />

      {selected && (
        <MobileAppointmentDetailSheet
          appointment={selected}
          endpoint={endpoint}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            load();
          }}
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
