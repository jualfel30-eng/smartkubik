import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  getReservationCalendar,
  getReservations,
  confirmReservation,
  seatReservation,
  cancelReservation,
  markReservationNoShow,
  getTables
} from '@/lib/api';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  Calendar as CalendarIcon,
  Users,
  Clock,
  Plus,
  Check,
  UserCheck,
  X,
  AlertCircle,
  Phone,
  Mail
} from 'lucide-react';
import ReservationForm from './ReservationForm';

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_OF_WEEK_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'
];

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700', icon: Check },
  seated: { label: 'Sentados', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700', icon: Users },
  completed: { label: 'Completada', color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600', icon: Check },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700', icon: X },
  'no-show': { label: 'No Show', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700', icon: AlertCircle },
};

const ReservationCalendar = () => {
  const [view, setView] = useState('month'); // 'day', 'week', 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayReservations, setDayReservations] = useState([]);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showSeatDialog, setShowSeatDialog] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const monthStr = currentDate.toISOString().substring(0, 7);
      const data = await getReservationCalendar(monthStr);
      setCalendarData(data || []);
    } catch (error) {
      toast.error('Error al cargar calendario', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const fetchDayReservations = useCallback(async (dateStr) => {
    try {
      const data = await getReservations({ date: dateStr });
      setDayReservations(data || []);
    } catch (error) {
      toast.error('Error al cargar reservas del día', { description: error.message });
    }
  }, []);

  const fetchTables = useCallback(async () => {
    try {
      const data = await getTables();
      setTables(data?.data || []);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
    fetchTables();
  }, [fetchCalendar, fetchTables]);

  // Navigation functions
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
    fetchDayReservations(dateStr);
    setShowDayPanel(true);
  };

  const handleConfirm = async (id) => {
    try {
      await confirmReservation(id);
      toast.success('Reserva confirmada');
      if (selectedDate) fetchDayReservations(selectedDate);
      fetchCalendar();
    } catch (error) {
      toast.error('Error al confirmar', { description: error.message });
    }
  };

  const handleSeat = async () => {
    if (!selectedTable || !showSeatDialog) return;
    try {
      await seatReservation(showSeatDialog._id, { tableId: selectedTable });
      toast.success('Clientes sentados');
      setShowSeatDialog(null);
      setSelectedTable('');
      if (selectedDate) fetchDayReservations(selectedDate);
      fetchCalendar();
    } catch (error) {
      toast.error('Error al sentar', { description: error.message });
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;
    try {
      await cancelReservation(id, { reason: 'Cancelada desde calendario' });
      toast.success('Reserva cancelada');
      if (selectedDate) fetchDayReservations(selectedDate);
      fetchCalendar();
    } catch (error) {
      toast.error('Error al cancelar', { description: error.message });
    }
  };

  const handleNoShow = async (id) => {
    if (!confirm('¿Marcar como No Show?')) return;
    try {
      await markReservationNoShow(id);
      toast.success('Marcada como No Show');
      if (selectedDate) fetchDayReservations(selectedDate);
      fetchCalendar();
    } catch (error) {
      toast.error('Error al marcar No Show', { description: error.message });
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


  const getWeekDates = () => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day); // Start on Sunday

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const daySummary = dayReservations.reduce((acc, res) => {
    acc.total++;
    acc.guests += res.partySize || 0;
    if (res.status === 'pending') acc.pending++;
    if (res.status === 'confirmed') acc.confirmed++;
    if (res.status === 'seated') acc.seated++;
    return acc;
  }, { total: 0, guests: 0, pending: 0, confirmed: 0, seated: 0 });

  // Get header text based on view
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

  return (
    <>
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl dark:text-gray-100">Calendario de Reservas</CardTitle>
              <CardDescription className="dark:text-gray-400">{getHeaderText()}</CardDescription>
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
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Day View */}
              {view === 'day' && <DayView currentDate={currentDate} calendarData={calendarData} handleDayClick={handleDayClick} />}

              {/* Week View */}
              {view === 'week' && <WeekView currentDate={currentDate} calendarData={calendarData} handleDayClick={handleDayClick} />}

              {/* Month View */}
              {view === 'month' && <MonthView currentDate={currentDate} calendarData={calendarData} handleDayClick={handleDayClick} />}
            </>
          )}
        </CardContent>
      </Card>

      {/* Day Panel - Sheet/Drawer lateral */}
      <Sheet open={showDayPanel} onOpenChange={setShowDayPanel}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto dark:bg-gray-900 dark:border-gray-800 px-6">
          <SheetHeader>
            <SheetTitle className="dark:text-gray-100">
              Reservas del {selectedDate && formatDate(selectedDate)}
            </SheetTitle>
            <SheetDescription className="dark:text-gray-400">
              Gestiona las reservas de este día
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{daySummary.total}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Reservas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{daySummary.guests}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Comensales</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{daySummary.seated}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Sentados</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* New Reservation Button */}
            <Button
              className="w-full"
              onClick={() => setShowReservationForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Reserva para este día
            </Button>

            {/* Reservations List */}
            <div className="space-y-3">
              {dayReservations.length === 0 ? (
                <Alert className="dark:bg-gray-800 dark:border-gray-700">
                  <AlertDescription className="dark:text-gray-400">
                    No hay reservas para este día. ¡Crea una nueva!
                  </AlertDescription>
                </Alert>
              ) : (
                dayReservations.map((reservation) => {
                  const statusConfig = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Card key={reservation._id} className="dark:bg-gray-800 dark:border-gray-700">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg dark:text-gray-100">{reservation.guestName}</h4>
                              <Badge className={statusConfig.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {reservation.time}
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {reservation.partySize} personas
                              </div>
                              {reservation.guestPhone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  {reservation.guestPhone}
                                </div>
                              )}
                              {reservation.guestEmail && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  {reservation.guestEmail}
                                </div>
                              )}
                              {reservation.notes && (
                                <p className="text-xs italic mt-2 dark:text-gray-500">
                                  "{reservation.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mt-3 pt-3 border-t dark:border-gray-700">
                          {reservation.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 dark:border-gray-600 dark:hover:bg-gray-700"
                              onClick={() => handleConfirm(reservation._id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Confirmar
                            </Button>
                          )}
                          {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
                            <>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => setShowSeatDialog(reservation)}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Sentar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="dark:border-gray-600 dark:hover:bg-gray-700"
                                onClick={() => handleNoShow(reservation._id)}
                              >
                                <AlertCircle className="h-4 w-4 mr-1" />
                                No Show
                              </Button>
                            </>
                          )}
                          {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancel(reservation._id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          )}
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

      {/* Reservation Form Dialog */}
      {showReservationForm && (
        <Dialog open={showReservationForm} onOpenChange={setShowReservationForm}>
          <DialogContent className="max-w-2xl dark:bg-gray-900 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="dark:text-gray-100">Nueva Reserva</DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                Para {selectedDate && formatDate(selectedDate)}
              </DialogDescription>
            </DialogHeader>
            <ReservationForm
              initialDate={selectedDate}
              onClose={(shouldRefresh) => {
                setShowReservationForm(false);
                if (shouldRefresh) {
                  fetchDayReservations(selectedDate);
                  fetchCalendar();
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Seat Dialog */}
      {showSeatDialog && (
        <Dialog open={!!showSeatDialog} onOpenChange={() => setShowSeatDialog(null)}>
          <DialogContent className="dark:bg-gray-900 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="dark:text-gray-100">Sentar Clientes</DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                Asignar mesa para {showSeatDialog.guestName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium dark:text-gray-200">Seleccionar Mesa</label>
                <select
                  className="w-full mt-1 p-2 border dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-200"
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                >
                  <option value="">-- Selecciona una mesa --</option>
                  {tables
                    .filter(t => t.isActive && t.status === 'available')
                    .map(table => (
                      <option key={table._id} value={table._id}>
                        Mesa {table.tableNumber} - {table.section} (Cap: {table.maxCapacity})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 dark:border-gray-700 dark:hover:bg-gray-800" onClick={() => setShowSeatDialog(null)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSeat} disabled={!selectedTable}>
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

// Day View Component
const DayView = ({ currentDate, calendarData, handleDayClick }) => {
  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-y-auto max-h-[600px]">
        {TIME_SLOTS.map((timeSlot) => {
          const reservations = calendarData.filter(res => {
            if (!res.date.startsWith(dateStr)) return false;
            const resTime = res.time || new Date(res.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false });
            return resTime === timeSlot;
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
                  {reservations.map((res) => {
                    const statusConfig = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
                    return (
                      <div
                        key={res._id}
                        className={`text-xs p-2 rounded ${statusConfig.color} flex items-center gap-2`}
                      >
                        <Users className="h-3 w-3" />
                        <span className="font-medium">{res.guestName}</span>
                        <span>({res.partySize})</span>
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
const WeekView = ({ currentDate, calendarData, handleDayClick }) => {
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
              const reservations = calendarData.filter(res => {
                if (!res.date.startsWith(dateStr)) return false;
                const resTime = res.time || new Date(res.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false });
                return resTime === timeSlot;
              });

              return (
                <div
                  key={idx}
                  className="p-1 border-l dark:border-gray-700 min-h-[50px] hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleDayClick(dateStr)}
                >
                  <div className="flex flex-col gap-1">
                    {reservations.slice(0, 2).map((res) => {
                      const statusConfig = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
                      return (
                        <div
                          key={res._id}
                          className={`text-xs p-1 rounded ${statusConfig.color} truncate`}
                          title={`${res.guestName} (${res.partySize})`}
                        >
                          <div className="flex items-center gap-1">
                            <Users className="h-2 w-2" />
                            <span className="truncate">{res.guestName}</span>
                          </div>
                        </div>
                      );
                    })}
                    {reservations.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{reservations.length - 2}
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
const MonthView = ({ currentDate, calendarData, handleDayClick }) => {
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

  const getReservationsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarData.filter(res => res.date.startsWith(dateStr));
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
          const reservations = getReservationsForDay(day);
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
                    {reservations.length > 0 && (
                      <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200">
                        {reservations.length}
                      </Badge>
                    )}
                  </div>

                  {reservations.length > 0 && (
                    <div className="space-y-1">
                      {reservations.slice(0, 3).map((res, idx) => {
                        const statusConfig = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
                        return (
                          <div
                            key={idx}
                            className={`text-xs p-1 rounded ${statusConfig.color}`}
                          >
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {res.time}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Users className="h-3 w-3" />
                              {res.partySize}
                            </div>
                          </div>
                        );
                      })}
                      {reservations.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t dark:border-gray-700 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Confirmada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Sentados</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 border-2 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Hoy</span>
        </div>
      </div>
    </>
  );
};

export default ReservationCalendar;
