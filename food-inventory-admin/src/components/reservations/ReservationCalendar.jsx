import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock } from 'lucide-react';
import { useReservations } from '@/hooks/useReservations';

export function ReservationCalendar({ onReservationClick }) {
  const { getCalendar, loading } = useReservations();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);

  const loadCalendarData = useCallback(async () => {
    try {
      const monthStr = currentMonth.toISOString().slice(0, 7); // YYYY-MM
      const data = await getCalendar(monthStr);
      setCalendarData(data);
    } catch (err) {
      console.error('Error loading calendar:', err);
    }
  }, [currentMonth, getCalendar]);

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth, loadCalendarData]);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getReservationsForDay = (date) => {
    if (!date || !calendarData?.reservationsByDate) return [];
    const dateStr = date.toISOString().split('T')[0];
    return calendarData.reservationsByDate[dateStr] || [];
  };

  const getTotalPartySizeForDay = (date) => {
    const reservations = getReservationsForDay(date);
    return reservations.reduce((sum, res) => sum + (res.partySize || 0), 0);
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Calendario de Reservas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-4 capitalize">{monthName}</span>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando calendario...</p>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
              <div key={day} className="text-center font-semibold text-sm py-2 text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((date, index) => {
              const reservations = date ? getReservationsForDay(date) : [];
              const totalGuests = date ? getTotalPartySizeForDay(date) : 0;
              const isDateToday = date && isToday(date);
              const isDatePast = date && isPast(date);

              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] p-2 border rounded-lg
                    ${!date ? 'bg-muted/30' : ''}
                    ${isDateToday ? 'border-primary border-2 bg-primary/5' : ''}
                    ${isDatePast && !isDateToday ? 'bg-muted/20' : 'bg-card'}
                    ${date && !isDatePast ? 'hover:bg-accent cursor-pointer' : ''}
                  `}
                  onClick={() => date && !isDatePast && onReservationClick && onReservationClick(date)}
                >
                  {date && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`
                            text-sm font-medium
                            ${isDateToday ? 'text-primary font-bold' : ''}
                            ${isDatePast && !isDateToday ? 'text-muted-foreground' : ''}
                          `}
                        >
                          {date.getDate()}
                        </span>
                        {reservations.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {reservations.length}
                          </Badge>
                        )}
                      </div>

                      {reservations.length > 0 && (
                        <div className="space-y-1">
                          {reservations.slice(0, 3).map((reservation) => (
                            <div
                              key={reservation._id}
                              className="text-xs p-1 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReservationClick && onReservationClick(reservation);
                              }}
                            >
                              <div className="flex items-center gap-1 text-primary">
                                <Clock className="h-3 w-3" />
                                <span className="font-medium">{reservation.time}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                                <Users className="h-3 w-3" />
                                <span>{reservation.partySize}p - {reservation.guestName}</span>
                              </div>
                            </div>
                          ))}
                          {reservations.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              +{reservations.length - 3} más
                            </div>
                          )}
                        </div>
                      )}

                      {totalGuests > 0 && (
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>Total: {totalGuests} personas</span>
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
        <div className="flex items-center gap-6 mt-6 pt-4 border-t text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary rounded"></div>
            <span className="text-muted-foreground">Hoy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/10 rounded"></div>
            <span className="text-muted-foreground">Con reservas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted/20 rounded"></div>
            <span className="text-muted-foreground">Días pasados</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
