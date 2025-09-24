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

export function CalendarView() {
  const [events, setEvents] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const calendarRef = useRef(null);

  const fetchEvents = useCallback(async () => {
    if (!calendarRef.current) return;
    try {
      const calendarApi = calendarRef.current.getApi();
      const start = calendarApi.view.activeStart.toISOString();
      const end = calendarApi.view.activeEnd.toISOString();
      const response = await fetchApi(`/events?start=${start}&end=${end}`);
      setEvents(response.data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Error al cargar eventos", { description: error.message });
      setEvents([]);
    }
  }, []);

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

  return (
    <div className="p-3 md:p-6 mx-auto max-w-7xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-foreground">Calendario de Eventos</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video p-4">
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
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