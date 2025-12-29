import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCalendars } from '@/hooks/use-calendars';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';

export function CalendarLegend({ selectedCalendarIds, onToggleCalendar, onEventDrop }) {
  const { calendars, loading } = useCalendars();
  const [dragOverCalendarId, setDragOverCalendarId] = useState(null);

  if (loading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg dark:text-gray-100 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (calendars.length === 0) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg dark:text-gray-100 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No hay calendarios disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleDragOver = (e, calendarId) => {
    e.preventDefault();
    setDragOverCalendarId(calendarId);
  };

  const handleDragLeave = () => {
    setDragOverCalendarId(null);
  };

  const handleDrop = async (e, calendarId) => {
    e.preventDefault();
    setDragOverCalendarId(null);

    const eventData = e.dataTransfer.getData('event');
    if (eventData) {
      try {
        const event = JSON.parse(eventData);
        if (onEventDrop) {
          await onEventDrop(event.id, calendarId);
          toast.success(`Evento movido a ${calendars.find(c => c.id === calendarId)?.name}`);
        }
      } catch (error) {
        console.error('Error moving event:', error);
        toast.error('Error al mover el evento');
      }
    }
  };

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg dark:text-gray-100 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendarios
        </CardTitle>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Arrastra eventos aquí para cambiar de calendario
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {calendars.map((calendar) => {
          const isSelected = selectedCalendarIds.length === 0 || selectedCalendarIds.includes(calendar.id);
          const isDragOver = dragOverCalendarId === calendar.id;

          return (
            <button
              key={calendar.id}
              onClick={() => onToggleCalendar?.(calendar.id)}
              onDragOver={(e) => handleDragOver(e, calendar.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, calendar.id)}
              className={`w-full flex items-center gap-3 p-2 rounded-md transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${
                isSelected ? '' : 'opacity-50'
              } ${isDragOver ? 'ring-2 ring-primary bg-primary/10' : ''}`}
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: calendar.color }}
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium dark:text-gray-200 truncate">
                  {calendar.name}
                </p>
                {calendar.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {calendar.description}
                  </p>
                )}
              </div>
              {calendar.eventCount !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {calendar.eventCount}
                </Badge>
              )}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
