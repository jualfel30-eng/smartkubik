import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getReservationCalendar } from '@/lib/api';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock } from 'lucide-react';

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ReservationCalendar = ({ onDateClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const monthStr = currentMonth.toISOString().substring(0, 7); // YYYY-MM
      const data = await getReservationCalendar(monthStr);
      setCalendarData(data || []);
    } catch (error) {
      toast.error('Error al cargar calendario', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getReservationsForDay = (day) => {
    if (!day) return [];

    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarData.filter(res => res.date.startsWith(dateStr));
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day &&
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (day) => {
    if (!day) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const days = getDaysInMonth();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Calendario de Reservas</CardTitle>
            <CardDescription>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-sm text-gray-700 py-2 border-b"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((day, index) => {
              const reservations = getReservationsForDay(day);
              const isCurrentDay = isToday(day);
              const isPastDay = isPast(day);

              return (
                <div
                  key={index}
                  className={`
                    min-h-[100px] p-2 border rounded-lg
                    ${day ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-100'}
                    ${isCurrentDay ? 'bg-blue-50 border-blue-300 border-2' : ''}
                    ${isPastDay && day ? 'opacity-60' : ''}
                  `}
                  onClick={() => {
                    if (day && onDateClick) {
                      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      onDateClick(dateStr);
                    }
                  }}
                >
                  {day && (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`
                            text-sm font-medium
                            ${isCurrentDay ? 'text-blue-700 font-bold' : 'text-gray-700'}
                          `}
                        >
                          {day}
                        </span>
                        {reservations.length > 0 && (
                          <Badge variant="outline" className="text-xs bg-blue-100 border-blue-300">
                            {reservations.length}
                          </Badge>
                        )}
                      </div>

                      {reservations.length > 0 && (
                        <div className="space-y-1">
                          {reservations.slice(0, 3).map((res, idx) => {
                            const resTime = new Date(res.date);
                            return (
                              <div
                                key={idx}
                                className={`
                                  text-xs p-1 rounded
                                  ${res.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                                  ${res.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                  ${res.status === 'seated' ? 'bg-blue-100 text-blue-800' : ''}
                                  ${res.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                                `}
                              >
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {resTime.toLocaleTimeString('es-VE', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Users className="h-3 w-3" />
                                  {res.partySize}
                                </div>
                              </div>
                            );
                          })}
                          {reservations.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{reservations.length - 3} más
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
        )}

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-4 border-t text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-gray-600">Confirmada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-gray-600">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-gray-600">Sentados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-300 border-2 rounded"></div>
            <span className="text-gray-600">Hoy</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReservationCalendar;
