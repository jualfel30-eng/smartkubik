import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { EventDialog } from './EventDialog.jsx';
import { TodoList } from './TodoList.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query.js';

export function CalendarView() {
  const [events, setEvents] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const calendarRef = useRef(null);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [activeView, setActiveView] = useState('dayGridMonth');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const fetchEvents = useCallback(async () => {
    if (!calendarRef.current) return;
    try {
      const calendarApi = calendarRef.current.getApi();
      const start = calendarApi.view.activeStart.toISOString();
      const end = calendarApi.view.activeEnd.toISOString();
      const response = await fetchApi(`/events?start=${start}&end=${end}`);
      setEvents(response.data || []);
      if (!isDesktop) {
        setCalendarTitle(calendarApi.view.title);
        setActiveView(calendarApi.view.type);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Error al cargar eventos", { description: error.message });
      setEvents([]);
    }
  }, [isDesktop]);

  useEffect(() => {
    // El fetch inicial se dispara desde la prop `datesSet` del calendario
  }, []);

  const handleDateSelect = (selectInfo) => {
    setSelectedEvent({
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      allDay: selectInfo.allDay,
    });
    setIsDialogOpen(true);
  };

  const handleEventClick = (clickInfo) => {
    setSelectedEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.start,
      end: clickInfo.event.end,
      allDay: clickInfo.event.allDay,
      description: clickInfo.event.extendedProps.description,
    });
    setIsDialogOpen(true);
  };

  const handleEventDrop = async (dropInfo) => {
    const { event } = dropInfo;
    try {
      await fetchApi(`/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          start: event.start.toISOString(),
          end: event.end ? event.end.toISOString() : null,
        })
      });
      toast.success("Evento Actualizado");
      fetchEvents();
    } catch (error) {
      console.error("Error al actualizar evento:", error);
      toast.error("Error al mover el evento", { description: error.message });
      dropInfo.revert();
    }
  };

  const handleSaveEvent = async (eventData) => {
    try {
      const isUpdate = selectedEvent?.id;
      const url = isUpdate ? `/events/${selectedEvent.id}` : '/events';
      const method = isUpdate ? 'PATCH' : 'POST';

      await fetchApi(url, {
        method,
        body: JSON.stringify(eventData),
      });
      
      toast.success(`Evento ${isUpdate ? 'Actualizado' : 'Creado'}`);
      setIsDialogOpen(false);
      fetchEvents();

    } catch (error) {
      console.error("Error al guardar el evento:", error);
      toast.error("Error al guardar el evento", { description: error.message });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await fetchApi(`/events/${eventId}`, { method: 'DELETE' });
      toast.success("Evento Eliminado");
      setIsDialogOpen(false);
      fetchEvents();
    } catch (error) {
      console.error("Error al eliminar el evento:", error);
      toast.error("Error al eliminar el evento", { description: error.message });
    }
  };

  const handlePrevClick = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.prev();
  };

  const handleNextClick = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.next();
  };

  const handleTodayClick = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.today();
  };

  const handleViewChange = (view) => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.changeView(view);
  };

  return (
    <div className="p-3 md:p-6 mx-auto max-w-7xl">
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold text-foreground">Calendario de Eventos</h2>
          {/* Header para móvil y pantallas pequeñas */}
          <div className="lg:hidden flex flex-col items-center gap-4">
            <h3 className="text-xl font-semibold">{calendarTitle}</h3>
            <div className="flex flex-wrap justify-center items-center gap-2">
              <Button variant="outline" onClick={handleTodayClick}>Hoy</Button>
              <Button variant="outline" size="icon" onClick={handlePrevClick}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={handleNextClick}><ChevronRight className="h-4 w-4" /></Button>
              
              <Button variant={activeView === 'dayGridMonth' ? 'default' : 'outline'} onClick={() => handleViewChange('dayGridMonth')}>Mes</Button>
              <Button variant={activeView === 'timeGridWeek' ? 'default' : 'outline'} onClick={() => handleViewChange('timeGridWeek')}>Semana</Button>
              <Button variant={activeView === 'timeGridDay' ? 'default' : 'outline'} onClick={() => handleViewChange('timeGridDay')}>Día</Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="p-4 h-[70vh] lg:aspect-video lg:h-auto">
                  <FullCalendar
                    key={isDesktop} // Forzar re-renderizado al cambiar entre vistas
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    headerToolbar={isDesktop ? {
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    } : false}
                    initialView='dayGridMonth'
                    locale='es'
                    buttonText={{
                      today: 'Hoy',
                      month: 'Mes',
                      week: 'Semana',
                      day: 'Día',
                    }}
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    weekends={true}
                    fixedWeekCount={false}
                    longPressDelay={1}
                    events={events}
                    select={handleDateSelect}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    datesSet={fetchEvents}
                    height="100%"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <TodoList />
          </div>
        </div>
        <EventDialog 
          open={isDialogOpen} 
          onClose={() => setIsDialogOpen(false)} 
          event={selectedEvent}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      </div>
    </div>
  );
}