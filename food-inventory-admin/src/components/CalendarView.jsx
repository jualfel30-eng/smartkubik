import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Filter
} from 'lucide-react';
import { TodoList } from './TodoList';
import { CalendarLegend } from './CalendarLegend';
import { useTodos } from '@/hooks/use-todos';
import { useCalendars } from '@/hooks/use-calendars';

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_OF_WEEK_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const TIME_SLOTS = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
];

export function CalendarView() {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    allDay: false
  });
  const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);
  const { todos, refetch: refetchTodos } = useTodos();
  const { calendars } = useCalendars();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let rangeStart, rangeEnd;

      if (view === 'day') {
        rangeStart = new Date(currentDate);
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd = new Date(currentDate);
        rangeEnd.setHours(23, 59, 59, 999);
      } else if (view === 'week') {
        rangeStart = new Date(currentDate);
        const day = rangeStart.getDay();
        rangeStart.setDate(rangeStart.getDate() - day);
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd = new Date(rangeStart);
        rangeEnd.setDate(rangeEnd.getDate() + 6);
        rangeEnd.setHours(23, 59, 59, 999);
      } else {
        rangeStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        rangeEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      const start = rangeStart.toISOString();
      const end = rangeEnd.toISOString();
      const response = await fetchApi(`/events?start=${start}&end=${end}`);
      setEvents(response.data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Error al cargar eventos', { description: error.message });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const allCalendarEvents = useMemo(() => {
    // Filtrar eventos por calendarios seleccionados
    let eventsList = [...events];

    if (selectedCalendarIds.length > 0) {
      eventsList = eventsList.filter(event => {
        // Si el evento no tiene calendarId, es del calendario por defecto
        if (!event.calendarId) return true;
        return selectedCalendarIds.includes(event.calendarId);
      });
    }

    const tagColors = {
      'pagos': '#ef4444',
      'compras': '#3b82f6',
      'fiscal': '#a855f7',
      'legal': '#f59e0b',
      'produccion': '#22c55e',
      'mantenimiento': '#f97316',
    };

    todos.forEach(todo => {
      if (todo.dueDate) {
        const primaryTag = todo.tags?.[0];
        const color = tagColors[primaryTag] || '#6366f1';

        eventsList.push({
          id: `todo-${todo._id}`,
          title: `📋 ${todo.title}`,
          start: todo.dueDate,
          allDay: true,
          backgroundColor: color,
          type: 'todo',
          todoId: todo._id,
          tags: todo.tags,
          priority: todo.priority,
          isCompleted: todo.isCompleted,
        });
      }
    });

    return eventsList;
  }, [events, todos, selectedCalendarIds]);

  const goToPrevious = () => {
    if (view === 'day') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (view === 'day') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getHeaderText = () => {
    if (view === 'day') {
      return `${DAYS_OF_WEEK_FULL[currentDate.getDay()]}, ${currentDate.getDate()} de ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (view === 'week') {
      const weekDates = getWeekDates();
      const start = weekDates[0];
      const end = weekDates[6];
      return `${start.getDate()} - ${end.getDate()} de ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  const getWeekDates = () => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setShowDayPanel(true);
  };

  const openCreateDialog = (preselectedDate = null) => {
    setSelectedEvent(null);
    if (preselectedDate) {
      const startDateTime = `${preselectedDate}T09:00`;
      const endDateTime = `${preselectedDate}T10:00`;
      setEventForm({
        title: '',
        description: '',
        start: startDateTime,
        end: endDateTime,
        allDay: false
      });
    } else {
      setEventForm({
        title: '',
        description: '',
        start: '',
        end: '',
        allDay: false
      });
    }
    setShowEventDialog(true);
  };

  const openEditDialog = (event) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      start: event.start ? new Date(event.start).toISOString().slice(0, 16) : '',
      end: event.end ? new Date(event.end).toISOString().slice(0, 16) : '',
      allDay: event.allDay || false
    });
    setShowEventDialog(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      const isUpdate = selectedEvent?.id && !selectedEvent.id.startsWith('todo-');
      const url = isUpdate ? `/events/${selectedEvent.id}` : '/events';
      const method = isUpdate ? 'PATCH' : 'POST';

      await fetchApi(url, {
        method,
        body: JSON.stringify(eventForm),
      });

      toast.success(`Evento ${isUpdate ? 'actualizado' : 'creado'}`);
      setShowEventDialog(false);
      await fetchEvents();
      await refetchTodos();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Error al guardar el evento', { description: error.message });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      if (eventId.startsWith('todo-')) {
        const todoId = eventId.replace('todo-', '');
        await fetchApi(`/todos/${todoId}`, { method: 'DELETE' });
        toast.success('Tarea eliminada');
      } else {
        await fetchApi(`/events/${eventId}`, { method: 'DELETE' });
        toast.success('Evento eliminado');
      }
      setShowEventDialog(false);
      setShowDayPanel(false);
      await fetchEvents();
      await refetchTodos();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error al eliminar', { description: error.message });
    }
  };

  const handleMoveEventToCalendar = async (eventId, targetCalendarId) => {
    try {
      if (eventId.startsWith('todo-')) {
        toast.error('Las tareas no se pueden mover entre calendarios');
        return;
      }

      await fetchApi(`/events/${eventId}/move-to-calendar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId: targetCalendarId }),
      });

      await fetchEvents();
    } catch (error) {
      console.error('Error moving event:', error);
      throw error; // Let CalendarLegend handle the toast
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-VE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const dayEvents = selectedDate ? allCalendarEvents.filter(evt => {
    if (!evt.start) return false;
    const evtDate = new Date(evt.start).toISOString().split('T')[0];
    return evtDate === selectedDate;
  }) : [];

  return (
    <div className="p-3 md:p-6 mx-auto max-w-[1800px] h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        <div className="lg:col-span-3 h-full overflow-hidden">
          <Card className="dark:bg-gray-900 dark:border-gray-800 h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="text-2xl dark:text-gray-100">Calendario de Eventos</CardTitle>
                  <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">{getHeaderText()}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={goToPrevious} className="dark:border-gray-700 dark:hover:bg-gray-800">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday} className="dark:border-gray-700 dark:hover:bg-gray-800">
                    Hoy
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNext} className="dark:border-gray-700 dark:hover:bg-gray-800">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading} className="dark:border-gray-700 dark:hover:bg-gray-800">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <Tabs value={view} onValueChange={setView} className="flex-1">
                  <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="day">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Día
                    </TabsTrigger>
                    <TabsTrigger value="week">
                      <CalendarRange className="h-4 w-4 mr-2" />
                      Semana
                    </TabsTrigger>
                    <TabsTrigger value="month">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Mes
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex gap-2">
                  {/* Selector de calendarios */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Calendarios
                        {selectedCalendarIds.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {selectedCalendarIds.length}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Filtrar por calendario</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {calendars.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-gray-500 text-center">
                          No hay calendarios disponibles
                        </div>
                      ) : (
                        <>
                          {calendars.map((calendar) => (
                            <DropdownMenuCheckboxItem
                              key={calendar.id}
                              checked={selectedCalendarIds.includes(calendar.id)}
                              onCheckedChange={(checked) => {
                                setSelectedCalendarIds(prev =>
                                  checked
                                    ? [...prev, calendar.id]
                                    : prev.filter(id => id !== calendar.id)
                                );
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: calendar.color }}
                                />
                                <span className="truncate">{calendar.name}</span>
                              </div>
                            </DropdownMenuCheckboxItem>
                          ))}
                          {selectedCalendarIds.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => setSelectedCalendarIds([])}
                              >
                                Limpiar filtros
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button onClick={() => openCreateDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Evento
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {view === 'day' && <DayView currentDate={currentDate} events={allCalendarEvents} handleDayClick={handleDayClick} />}
                  {view === 'week' && <WeekView currentDate={currentDate} events={allCalendarEvents} handleDayClick={handleDayClick} />}
                  {view === 'month' && <MonthView currentDate={currentDate} events={allCalendarEvents} handleDayClick={handleDayClick} />}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="h-full overflow-hidden flex flex-col gap-6">
          <CalendarLegend
            selectedCalendarIds={selectedCalendarIds}
            onToggleCalendar={(calendarId) => {
              setSelectedCalendarIds(prev =>
                prev.includes(calendarId)
                  ? prev.filter(id => id !== calendarId)
                  : [...prev, calendarId]
              );
            }}
            onEventDrop={handleMoveEventToCalendar}
          />
          <div className="flex-1 overflow-hidden">
            <TodoList onTodoComplete={fetchEvents} />
          </div>
        </div>
      </div>

      {/* Day Panel */}
      <Sheet open={showDayPanel} onOpenChange={setShowDayPanel}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto dark:bg-gray-900 dark:border-gray-800 px-12">
          <SheetHeader>
            <SheetTitle className="dark:text-gray-100">
              Eventos del {selectedDate && formatDate(selectedDate)}
            </SheetTitle>
            <SheetDescription className="dark:text-gray-400">
              Gestiona los eventos de este día
            </SheetDescription>
          </SheetHeader>

          <div className="mt-12 space-y-12">
            <Button
              className="w-full"
              onClick={() => {
                setShowDayPanel(false);
                openCreateDialog(selectedDate);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Evento para este día
            </Button>

            <div className="space-y-3">
              {dayEvents.length === 0 ? (
                <Alert className="dark:bg-gray-800 dark:border-gray-700">
                  <AlertDescription className="dark:text-gray-400">
                    No hay eventos para este día.
                  </AlertDescription>
                </Alert>
              ) : (
                dayEvents.map((event) => (
                  <Card key={event.id} className="dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-lg dark:text-gray-100">{event.title}</h4>
                            {event.type === 'todo' && (
                              <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                                Tarea
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {!event.allDay && event.start && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {new Date(event.start).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                {event.end && ` - ${new Date(event.end).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`}
                              </div>
                            )}
                            {event.description && (
                              <p className="text-xs italic mt-2 dark:text-gray-500">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(event)}
                          className="dark:hover:bg-gray-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Event Dialog */}
      <Sheet open={showEventDialog} onOpenChange={setShowEventDialog}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
          <SheetHeader>
            <SheetTitle className="dark:text-gray-100">
              {selectedEvent ? 'Editar Evento' : 'Nuevo Evento'}
            </SheetTitle>
            <SheetDescription className="dark:text-gray-400">
              Completa la información del evento
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSaveEvent} className="space-y-4 mt-12 px-12">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                required
                className="dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                className="dark:bg-gray-800 dark:border-gray-700"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Inicio *</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={eventForm.start}
                  onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
                  required
                  className="dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="end">Fin</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={eventForm.end}
                  onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
                  className="dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={eventForm.allDay}
                onChange={(e) => setEventForm({ ...eventForm, allDay: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="allDay">Evento de todo el día</Label>
            </div>

            <div className="flex gap-2 pt-8 px-12 border-t dark:border-gray-700">
              {selectedEvent && !selectedEvent.id?.startsWith('todo-') && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="dark:bg-red-900 dark:hover:bg-red-800"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              )}
              <Button type="button" variant="outline" className="flex-1 dark:border-gray-700 dark:hover:bg-gray-800" onClick={() => setShowEventDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {selectedEvent ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Day View Component
const DayView = ({ currentDate, events, handleDayClick }) => {
  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-y-auto max-h-[600px]">
        {TIME_SLOTS.map((timeSlot) => {
          const eventsAtTime = events.filter(evt => {
            if (!evt.start || evt.allDay) return false;
            const evtDate = new Date(evt.start).toISOString().split('T')[0];
            if (evtDate !== dateStr) return false;
            const evtTime = new Date(evt.start).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false });
            return evtTime === timeSlot;
          });

          return (
            <div
              key={timeSlot}
              className="flex border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => handleDayClick(dateStr)}
            >
              <div className="w-20 p-3 text-sm font-medium text-gray-600 dark:text-gray-400 border-r dark:border-gray-700 flex-shrink-0">
                {timeSlot}
              </div>
              <div className="flex-1 p-2 min-h-[60px]">
                <div className="flex flex-wrap gap-2">
                  {eventsAtTime.map((evt) => (
                    <div
                      key={evt.id}
                      className="text-xs p-2 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 cursor-move"
                      draggable={!evt.id?.startsWith('todo-')}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('event', JSON.stringify({ id: evt.id, title: evt.title }));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      {evt.title}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Week View Component
const WeekView = ({ currentDate, events, handleDayClick }) => {
  const getWeekDates = () => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="grid grid-cols-8 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="p-2 text-sm font-medium text-gray-600 dark:text-gray-400"></div>
        {weekDates.map((date, idx) => (
          <div
            key={idx}
            className={`p-2 text-center border-l dark:border-gray-700 ${
              isToday(date) ? 'bg-blue-100 dark:bg-blue-900/30' : ''
            }`}
          >
            <div className="text-xs text-gray-600 dark:text-gray-400">{DAYS_OF_WEEK[idx]}</div>
            <div className={`text-sm font-semibold ${isToday(date) ? 'text-blue-600 dark:text-blue-400' : 'dark:text-gray-200'}`}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-y-auto max-h-[500px]">
        {TIME_SLOTS.map((timeSlot) => (
          <div key={timeSlot} className="grid grid-cols-8 border-b dark:border-gray-700">
            <div className="p-2 text-xs font-medium text-gray-600 dark:text-gray-400 border-r dark:border-gray-700">
              {timeSlot}
            </div>
            {weekDates.map((date, idx) => {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const eventsAtTime = events.filter(evt => {
                if (!evt.start || evt.allDay) return false;
                const evtDate = new Date(evt.start).toISOString().split('T')[0];
                if (evtDate !== dateStr) return false;
                const evtTime = new Date(evt.start).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false });
                return evtTime === timeSlot;
              });

              return (
                <div
                  key={idx}
                  className="p-1 border-l dark:border-gray-700 min-h-[50px] hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleDayClick(dateStr)}
                >
                  <div className="flex flex-col gap-1">
                    {eventsAtTime.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        className="text-xs p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 truncate cursor-move"
                        title={evt.title}
                        draggable={!evt.id?.startsWith('todo-')}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData('event', JSON.stringify({ id: evt.id, title: evt.title }));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {eventsAtTime.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{eventsAtTime.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// Month View Component
const MonthView = ({ currentDate, events, handleDayClick }) => {
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(evt => {
      if (!evt.start) return false;
      const evtDate = new Date(evt.start).toISOString().split('T')[0];
      return evtDate === dateStr;
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day &&
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (day) => {
    if (!day) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const days = getDaysInMonth();

  return (
    <div className="grid grid-cols-7 gap-2">
      {DAYS_OF_WEEK.map((day) => (
        <div
          key={day}
          className="text-center font-semibold text-sm text-gray-700 dark:text-gray-300 py-2 border-b dark:border-gray-700"
        >
          {day}
        </div>
      ))}

      {days.map((day, index) => {
        const eventsForDay = getEventsForDay(day);
        const isCurrentDay = isToday(day);
        const isPastDay = isPast(day);
        const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;

        return (
          <div
            key={index}
            className={`
              min-h-[100px] p-2 border dark:border-gray-700 rounded-lg transition-all
              ${day ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md' : 'bg-gray-100 dark:bg-gray-800/50'}
              ${isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 border-2' : ''}
              ${isPastDay && day ? 'opacity-60' : ''}
            `}
            onClick={() => day && handleDayClick(dateStr)}
          >
            {day && (
              <>
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`
                      text-sm font-medium
                      ${isCurrentDay ? 'text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-700 dark:text-gray-300'}
                    `}
                  >
                    {day}
                  </span>
                  {eventsForDay.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200">
                      {eventsForDay.length}
                    </Badge>
                  )}
                </div>

                {eventsForDay.length > 0 && (
                  <div className="space-y-1">
                    {eventsForDay.slice(0, 3).map((evt, idx) => {
                      const time = evt.start && !evt.allDay ? new Date(evt.start).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';
                      const bgColor = evt.type === 'todo' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700';

                      return (
                        <div
                          key={evt.id || `evt-${idx}`}
                          className={`text-xs p-1 rounded ${bgColor} border cursor-move`}
                          draggable={!evt.id?.startsWith('todo-')}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData('event', JSON.stringify({ id: evt.id, title: evt.title }));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {time && <Clock className="h-3 w-3" />}
                            <span className="truncate">{time || evt.title}</span>
                          </div>
                        </div>
                      );
                    })}
                    {eventsForDay.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{eventsForDay.length - 3} más
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
