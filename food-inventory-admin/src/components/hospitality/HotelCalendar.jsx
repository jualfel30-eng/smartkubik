import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, Calendar as CalendarIcon, Users, Clock, MapPin, RefreshCw, Plus } from 'lucide-react';

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

const SERVICE_TYPE_LABELS = {
  room: 'Habitaciones',
  spa: 'Spa',
  experience: 'Experiencias',
  concierge: 'Concierge',
  general: 'General',
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700' },
  confirmed: { label: 'Confirmada', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700' },
  in_progress: { label: 'En progreso', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700' },
  completed: { label: 'Completada', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700' },
  no_show: { label: 'No asistió', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700' },
};

export function HotelCalendar({ resourceId, onCreateAppointment }) {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayAppointments, setDayAppointments] = useState([]);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      // Calcular rango basado en la vista y fecha actual
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
        // month
        rangeStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        rangeEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      const params = new URLSearchParams({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      });

      if (resourceId) {
        params.append('resourceId', resourceId);
      }

      const data = await fetchApi(`/appointments/calendar?${params.toString()}`);
      const normalized = Array.isArray(data) ? data : data?.data || [];
      setAppointments(normalized);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Error al cargar el calendario', { description: error.message });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, resourceId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Sincronización con floor plan
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const now = new Date();
    const map = new Map();

    appointments.forEach((event) => {
      const roomId = event.resourceId || event.roomId || event.locationId;
      if (!roomId) return;

      const start = event.startTime ? new Date(event.startTime) : null;
      const end = event.endTime ? new Date(event.endTime) : null;
      const existing = map.get(roomId) || {
        id: String(roomId),
        name: event.resourceName || event.locationName || `Recurso ${roomId}`,
        status: 'available',
        currentGuest: null,
        nextCheckIn: null,
        hasHousekeepingTask: false,
      };

      if (start && end) {
        if (start <= now && end >= now) {
          existing.status = 'occupied';
          existing.currentGuest = event.customerName || event.customer?.name || existing.currentGuest;
          existing.nextCheckIn = null;
        } else if (start > now) {
          if (existing.status !== 'occupied') {
            existing.status = 'upcoming';
          }
          if (!existing.nextCheckIn || new Date(existing.nextCheckIn) > start) {
            existing.nextCheckIn = start.toISOString();
          }
        }
      }

      if (
        event.hasHousekeepingTask ||
        event.housekeepingStatus === 'pending' ||
        event.metadata?.requiresHousekeeping ||
        event.metadata?.housekeepingStatus === 'pending'
      ) {
        existing.hasHousekeepingTask = true;
      }

      map.set(roomId, existing);
    });

    const rooms = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

    window.dispatchEvent(
      new CustomEvent('hospitality-floorplan-sync', {
        detail: { rooms, updatedAt: new Date().toISOString() },
      }),
    );
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (serviceTypeFilter !== 'all' && apt.serviceType !== serviceTypeFilter) return false;
      if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
      return true;
    });
  }, [appointments, serviceTypeFilter, statusFilter]);

  const groupedByServiceType = useMemo(() => {
    const counters = { room: 0, spa: 0, experience: 0, concierge: 0, general: 0 };
    appointments.forEach((event) => {
      const key = event.serviceType || 'general';
      if (counters[key] !== undefined) counters[key] += 1;
    });
    return counters;
  }, [appointments]);

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

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    const aptsForDay = filteredAppointments.filter(apt => apt.startTime && apt.startTime.startsWith(dateStr));
    setDayAppointments(aptsForDay);
    setShowDayPanel(true);
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

  const daySummary = dayAppointments.reduce((acc, apt) => {
    acc.total++;
    acc.guests += apt.capacityUsed || 1;
    if (apt.status === 'pending') acc.pending++;
    if (apt.status === 'confirmed') acc.confirmed++;
    if (apt.status === 'in_progress') acc.inProgress++;
    return acc;
  }, { total: 0, guests: 0, pending: 0, confirmed: 0, inProgress: 0 });

  return (
    <>
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl dark:text-gray-100">Calendario Hotelero</CardTitle>
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
              <Button variant="outline" size="sm" onClick={loadAppointments} disabled={loading} className="dark:border-gray-700 dark:hover:bg-gray-800">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* View Tabs */}
          <Tabs value={view} onValueChange={setView} className="w-full">
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

          {/* Filtros */}
          <div className="grid gap-3 md:grid-cols-2 mt-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground dark:text-gray-400 mb-1 block">Tipo de servicio</label>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger className="dark:border-gray-700 dark:bg-gray-800">
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
              <label className="text-xs uppercase tracking-wider text-muted-foreground dark:text-gray-400 mb-1 block">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="dark:border-gray-700 dark:bg-gray-800">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {view === 'day' && <DayView currentDate={currentDate} appointments={filteredAppointments} handleDayClick={handleDayClick} />}
              {view === 'week' && <WeekView currentDate={currentDate} appointments={filteredAppointments} handleDayClick={handleDayClick} />}
              {view === 'month' && <MonthView currentDate={currentDate} appointments={filteredAppointments} handleDayClick={handleDayClick} />}
            </>
          )}
        </CardContent>
      </Card>

      {/* Day Panel - Sheet lateral */}
      <Sheet open={showDayPanel} onOpenChange={setShowDayPanel}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto dark:bg-gray-900 dark:border-gray-800 px-12">
          <SheetHeader>
            <SheetTitle className="dark:text-gray-100">
              Citas del {selectedDate && formatDate(selectedDate)}
            </SheetTitle>
            <SheetDescription className="dark:text-gray-400">
              Gestiona las citas de este día
            </SheetDescription>
          </SheetHeader>

          <div className="mt-12 space-y-12">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-6">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{daySummary.total}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Citas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{daySummary.guests}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Clientes</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{daySummary.inProgress}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">En Progreso</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* New Appointment Button */}
            {onCreateAppointment && (
              <Button
                className="w-full"
                onClick={() => {
                  setShowDayPanel(false);
                  onCreateAppointment(selectedDate);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cita para este día
              </Button>
            )}

            {/* Appointments List */}
            <div className="space-y-3">
              {dayAppointments.length === 0 ? (
                <Alert className="dark:bg-gray-800 dark:border-gray-700">
                  <AlertDescription className="dark:text-gray-400">
                    No hay citas para este día.
                  </AlertDescription>
                </Alert>
              ) : (
                dayAppointments.map((appointment) => {
                  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
                  const startTime = appointment.startTime ? new Date(appointment.startTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';
                  const endTime = appointment.endTime ? new Date(appointment.endTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <Card key={appointment._id || appointment.appointmentId} className="dark:bg-gray-800 dark:border-gray-700">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg dark:text-gray-100">{appointment.serviceName || 'Servicio'}</h4>
                              <Badge className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {startTime} - {endTime}
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {appointment.customerName || 'Cliente'} · {appointment.capacityUsed || 1}/{appointment.capacity || 1} personas
                              </div>
                              {appointment.resourceName && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {appointment.resourceName}
                                </div>
                              )}
                              {appointment.notes && (
                                <p className="text-xs italic mt-2 dark:text-gray-500">
                                  "{appointment.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// Day View Component
const DayView = ({ currentDate, appointments, handleDayClick }) => {
  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-y-auto max-h-[600px]">
        {TIME_SLOTS.map((timeSlot) => {
          const aptsAtTime = appointments.filter(apt => {
            if (!apt.startTime || !apt.startTime.startsWith(dateStr)) return false;
            const aptTime = new Date(apt.startTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false });
            return aptTime === timeSlot;
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
                  {aptsAtTime.map((apt) => {
                    const statusConfig = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                    return (
                      <div
                        key={apt._id || apt.appointmentId}
                        className={`text-xs p-2 rounded ${statusConfig.color} flex items-center gap-2`}
                      >
                        <Users className="h-3 w-3" />
                        <span className="font-medium">{apt.serviceName}</span>
                        <span>({apt.capacityUsed || 1}/{apt.capacity || 1})</span>
                      </div>
                    );
                  })}
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
const WeekView = ({ currentDate, appointments, handleDayClick }) => {
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
      {/* Week header */}
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

      {/* Time slots */}
      <div className="overflow-y-auto max-h-[500px]">
        {TIME_SLOTS.map((timeSlot) => (
          <div key={timeSlot} className="grid grid-cols-8 border-b dark:border-gray-700">
            <div className="p-2 text-xs font-medium text-gray-600 dark:text-gray-400 border-r dark:border-gray-700">
              {timeSlot}
            </div>
            {weekDates.map((date, idx) => {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const aptsAtTime = appointments.filter(apt => {
                if (!apt.startTime || !apt.startTime.startsWith(dateStr)) return false;
                const aptTime = new Date(apt.startTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false });
                return aptTime === timeSlot;
              });

              return (
                <div
                  key={idx}
                  className="p-1 border-l dark:border-gray-700 min-h-[50px] hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleDayClick(dateStr)}
                >
                  <div className="flex flex-col gap-1">
                    {aptsAtTime.slice(0, 2).map((apt) => {
                      const statusConfig = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                      return (
                        <div
                          key={apt._id || apt.appointmentId}
                          className={`text-xs p-1 rounded ${statusConfig.color} truncate`}
                          title={`${apt.serviceName} (${apt.capacityUsed || 1}/${apt.capacity || 1})`}
                        >
                          <div className="flex items-center gap-1">
                            <Users className="h-2 w-2" />
                            <span className="truncate">{apt.serviceName}</span>
                          </div>
                        </div>
                      );
                    })}
                    {aptsAtTime.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{aptsAtTime.length - 2}
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
const MonthView = ({ currentDate, appointments, handleDayClick }) => {
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

  // Función para detectar si una cita abarca este día
  const getAppointmentsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayDate = new Date(dateStr);
    dayDate.setHours(0, 0, 0, 0);

    return appointments.filter(apt => {
      if (!apt.startTime) return false;

      const startDate = new Date(apt.startTime);
      startDate.setHours(0, 0, 0, 0);

      const endDate = apt.endTime ? new Date(apt.endTime) : new Date(apt.startTime);
      endDate.setHours(23, 59, 59, 999);

      // Incluir la cita si el día está dentro del rango
      return dayDate >= startDate && dayDate <= endDate;
    });
  };

  // Detectar si es el primer día de una reserva multi-día
  const isMultiDayStart = (apt, day) => {
    if (!apt.startTime || !apt.endTime) return false;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const startDateStr = apt.startTime.split('T')[0];
    return dateStr === startDateStr;
  };

  // Detectar si es un día intermedio o final de reserva multi-día
  const isMultiDayContinuation = (apt, day) => {
    if (!apt.startTime || !apt.endTime) return false;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const startDateStr = apt.startTime.split('T')[0];
    return dateStr !== startDateStr;
  };

  // Calcular duración en días
  const getMultiDayDuration = (apt) => {
    if (!apt.startTime || !apt.endTime) return 1;
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 1 ? diffDays : 1;
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
    <>
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
          const aptsForDay = getAppointmentsForDay(day);
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
                    {aptsForDay.length > 0 && (
                      <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200">
                        {aptsForDay.length}
                      </Badge>
                    )}
                  </div>

                  {aptsForDay.length > 0 && (
                    <div className="space-y-1">
                      {aptsForDay.slice(0, 3).map((apt, idx) => {
                        const statusConfig = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                        const time = apt.startTime ? new Date(apt.startTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';
                        const isMultiDay = getMultiDayDuration(apt) > 1;
                        const isStart = isMultiDayStart(apt, day);
                        const isContinuation = isMultiDayContinuation(apt, day);
                        const duration = getMultiDayDuration(apt);

                        return (
                          <div
                            key={idx}
                            className={`
                              text-xs p-1 rounded relative
                              ${statusConfig.color}
                              ${isMultiDay ? 'border-2 border-opacity-60' : ''}
                              ${isContinuation ? 'border-l-4 pl-2' : ''}
                            `}
                            title={isMultiDay ? `Reserva de ${duration} días` : ''}
                          >
                            {isStart && isMultiDay && (
                              <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                                {duration}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              {isContinuation ? (
                                <span className="text-[10px] font-semibold">↔</span>
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {isStart ? time : 'Continúa'}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Users className="h-3 w-3" />
                              {apt.capacityUsed || 1}/{apt.capacity || 1}
                              {isMultiDay && isStart && (
                                <span className="ml-auto text-[10px] font-bold opacity-70">
                                  {duration}d
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {aptsForDay.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          +{aptsForDay.length - 3} más
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t dark:border-gray-700 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Confirmada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">En Progreso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 border-2 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Hoy</span>
        </div>
      </div>
    </>
  );
};

export default HotelCalendar;
