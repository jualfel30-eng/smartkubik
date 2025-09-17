import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { EventDialog } from './EventDialog.jsx';

export function CalendarView() {
  const [events, setEvents] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const calendarRef = useRef(null);

  const fetchEvents = useCallback(async () => {
    // FIX: Añadir guard clause para asegurar que el ref del calendario existe
    if (!calendarRef.current) {
      return;
    }
    try {
      const calendarApi = calendarRef.current.getApi();
      const start = calendarApi.view.activeStart.toISOString();
      const end = calendarApi.view.activeEnd.toISOString();

      const response = await fetchApi(`/events?start=${start}&end=${end}`);
      if (response.success) {
        setEvents(response.data);
      } else {
        console.error("API response error:", response); // New log
        throw new Error(response.message || 'Error al cargar eventos');
      }
    } catch (error) {
      console.error("Full error object:", error); // New log
      console.error(error);
      toast.error("Error al cargar eventos", { description: error.message });
    }
  }, []); // El array de dependencias está vacío porque `toast` es una función estable importada

  useEffect(() => {
    // El fetch inicial se dispara desde la prop `datesSet` del calendario cuando se monta
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
        const response = await fetchApi(`/events/${event.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ 
                start: event.start.toISOString(),
                end: event.end ? event.end.toISOString() : null,
            })
        });

        if (response.success) {
            toast.success("Evento Actualizado", {
                description: `"${response.data.title}" ha sido movido.`
            });
            fetchEvents();
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error("Error al actualizar evento:", error);
        toast.error("Error al mover el evento", {
            description: error.message,
        });
        dropInfo.revert();
    }
  };

  const handleSaveEvent = async (eventData) => {
    try {
      const isUpdate = selectedEvent?.id;
      const url = isUpdate ? `/events/${selectedEvent.id}` : '/events';
      const method = isUpdate ? 'PATCH' : 'POST';

      const response = await fetchApi(url, {
        method,
        body: JSON.stringify(eventData),
      });

      if (response.success) {
        toast.success(`Evento ${isUpdate ? 'Actualizado' : 'Creado'}` , {
          description: `"${response.data.title}" guardado exitosamente.`,
        });
        setIsDialogOpen(false);
        fetchEvents();
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error al guardar el evento:", error);
      toast.error("Error al guardar el evento", {
        description: error.message,
      });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const response = await fetchApi(`/events/${eventId}`, { method: 'DELETE' });
      if (response.success) {
        toast.success("Evento Eliminado");
        setIsDialogOpen(false);
        fetchEvents();
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error al eliminar el evento:", error);
      toast.error("Error al eliminar el evento", {
        description: error.message,
      });
    }
  };

  return (
    <div className="p-3 md:p-6 mx-auto max-w-7xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-foreground">Calendario de Eventos</h2>
        </div>
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
                          today:    'Hoy',
                          month:    'Mes',
                          week:     'Semana',
                          day:      'Día',
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
                      datesSet={fetchEvents} // Carga eventos al iniciar y al cambiar de vista
                      height="100%" // UI FIX: Hacer que el calendario llene el contenedor
                  />
              </div>
          </CardContent>
        </Card>
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