import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Button } from '@/components/ui/button.jsx';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge.jsx';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query.js';

const SERVICE_TYPE_LABELS = {
  room: 'Habitaciones',
  spa: 'Spa',
  experience: 'Experiencias',
  concierge: 'Concierge',
  general: 'General',
};

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const STATUS_BADGE_VARIANT = {
  pending: 'secondary',
  confirmed: 'default',
  in_progress: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
  no_show: 'destructive',
};

export function HotelCalendar({ resourceId }) {
  const calendarRef = useRef(null);
  const [rawEvents, setRawEvents] = useState([]);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isBusy, setIsBusy] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [activeView, setActiveView] = useState('timeGridWeek');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const loadEvents = useCallback(async () => {
    if (!calendarRef.current) return;
    const calendarApi = calendarRef.current.getApi();
    const rangeStart = calendarApi.view.activeStart.toISOString();
    const rangeEnd = calendarApi.view.activeEnd.toISOString();

    const params = new URLSearchParams({
      startDate: rangeStart,
      endDate: rangeEnd,
    });

    if (resourceId) {
      params.append('resourceId', resourceId);
    }

    try {
      setIsBusy(true);
      const data = await fetchApi(`/appointments/calendar?${params.toString()}`);
      const normalized = Array.isArray(data) ? data : data?.data || [];
      setRawEvents(normalized);
      if (!isDesktop) {
        setCalendarTitle(calendarApi.view.title);
        setActiveView(calendarApi.view.type);
      }
    } catch (error) {
      console.error('Error loading hotel calendar:', error);
      toast.error('No fue posible cargar el calendario hotelero', {
        description: error.message,
      });
      setRawEvents([]);
    } finally {
      setIsBusy(false);
    }
  }, [resourceId, isDesktop]);

  const handleDatesSet = useCallback(() => {
    void loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    return rawEvents
      .filter((event) => {
        if (serviceTypeFilter !== 'all' && event.serviceType !== serviceTypeFilter) {
          return false;
        }
        if (statusFilter !== 'all' && event.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .map((event) => ({
        id: event._id || event.appointmentId,
        title: `${event.serviceName} · ${event.capacityUsed || 1}/${event.capacity || 1}`,
        start: event.startTime,
        end: event.endTime,
        backgroundColor: event.statusColor,
        borderColor: event.statusColor,
        extendedProps: event,
      }));
  }, [rawEvents, serviceTypeFilter, statusFilter]);

  const groupedByServiceType = useMemo(() => {
    const counters = {
      room: 0,
      spa: 0,
      experience: 0,
      concierge: 0,
      general: 0,
    };

    rawEvents.forEach((event) => {
      const key = event.serviceType || 'general';
      if (counters[key] !== undefined) {
        counters[key] += 1;
      }
    });

    return counters;
  }, [rawEvents]);

  const handleEventClick = useCallback((info) => {
    const data = info.event.extendedProps;
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    toast.info(data.serviceName, {
      description: `${STATUS_LABELS[data.status] || data.status} · ${start.toLocaleString()} - ${end.toLocaleTimeString()}`,
      action: {
        label: 'Ver detalle',
        onClick: () => {
          console.table(data);
        },
      },
    });
  }, []);

  const handlePrevClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.prev();
  };

  const handleNextClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.next();
  };

  const handleTodayClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.today();
  };

  const handleViewChange = (view) => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.changeView(view);
    setActiveView(view);
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-2xl font-semibold">Calendario Hotelero</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Visualiza disponibilidad por recursos y servicio. Usa los filtros para enfocarte en habitaciones, spa o experiencias.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleTodayClick}>Hoy</Button>
          <Button variant="outline" size="icon" onClick={handlePrevClick}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={handleNextClick}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => loadEvents()} disabled={isBusy}>
            <RefreshCw className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant={activeView === 'timeGridWeek' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('timeGridWeek')}
          >
            Semana
          </Button>
          <Button
            variant={activeView === 'dayGridMonth' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('dayGridMonth')}
          >
            Mes
          </Button>
          <Button
            variant={activeView === 'timeGridDay' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('timeGridDay')}
          >
            Día
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de servicio</label>
            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label} ({groupedByServiceType[key] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Estado</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <Badge key={key} variant={STATUS_BADGE_VARIANT[key] || 'secondary'}>
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {!isDesktop && (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <strong>{calendarTitle}</strong>
            <span>Total eventos: {filteredEvents.length}</span>
          </div>
        )}

        <div className="border border-border rounded-xl overflow-hidden">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isDesktop ? 'timeGridWeek' : 'dayGridMonth'}
            headerToolbar={false}
            events={filteredEvents}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            selectable={false}
            height="auto"
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
            }}
            eventClassNames="rounded-md text-xs font-medium"
            eventContent={(renderInfo) => {
              const eventData = renderInfo.event.extendedProps;
              return (
                <div className="flex flex-col gap-0.5 p-1">
                  <span className="text-xs font-semibold leading-tight text-white">
                    {renderInfo.event.title}
                  </span>
                  <span className="text-[10px] text-white/80 leading-tight">
                    {eventData.resourceLabel || 'Sin recurso'} · Capacidad {eventData.capacityUsed || 1}/{eventData.capacity || 1}
                  </span>
                </div>
              );
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default HotelCalendar;
