import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getReservations,
  confirmReservation,
  seatReservation,
  cancelReservation,
  markReservationNoShow,
  getTables
} from '@/lib/api';
import { toast } from 'sonner';
import {
  Calendar,
  Users,
  Clock,
  Check,
  X,
  AlertCircle,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import ReservationForm from './ReservationForm';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Check },
  seated: { label: 'Sentados', color: 'bg-green-100 text-green-800 border-green-300', icon: Users },
  completed: { label: 'Completada', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: Check },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-300', icon: X },
  'no-show': { label: 'No Show', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertCircle },
};

const ReservationsList = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    status: 'all',
    date: '',
    search: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showSeatDialog, setShowSeatDialog] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.status && filter.status !== 'all') params.status = filter.status;
      if (filter.date) params.date = filter.date;
      if (filter.search) params.guestName = filter.search;

      const data = await getReservations(params);
      setReservations(data || []);
    } catch (error) {
      toast.error('Error al cargar reservas', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchTables = useCallback(async () => {
    try {
      const data = await getTables();
      setTables(data?.data || []);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleConfirm = async (id) => {
    try {
      await confirmReservation(id);
      toast.success('Reserva confirmada');
      fetchReservations();
    } catch (error) {
      toast.error('Error al confirmar', { description: error.message });
    }
  };

  const handleSeat = async () => {
    if (!selectedTable) {
      toast.error('Selecciona una mesa');
      return;
    }

    try {
      await seatReservation(showSeatDialog._id, { tableId: selectedTable });
      toast.success('Clientes sentados');
      setShowSeatDialog(null);
      setSelectedTable('');
      fetchReservations();
    } catch (error) {
      toast.error('Error al sentar', { description: error.message });
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta reserva?')) return;

    try {
      await cancelReservation(id, { reason: 'Cancelada por administrador' });
      toast.success('Reserva cancelada');
      fetchReservations();
    } catch (error) {
      toast.error('Error al cancelar', { description: error.message });
    }
  };

  const handleNoShow = async (id) => {
    if (!confirm('¿Marcar como No Show?')) return;

    try {
      await markReservationNoShow(id);
      toast.success('Marcada como No Show');
      fetchReservations();
    } catch (error) {
      toast.error('Error', { description: error.message });
    }
  };

  const handleEdit = (reservation) => {
    setSelectedReservation(reservation);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setSelectedReservation(null);
    setShowForm(true);
  };

  const handleFormClose = (shouldRefresh) => {
    setShowForm(false);
    setSelectedReservation(null);
    if (shouldRefresh) {
      fetchReservations();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderActionButtons = (reservation) => {
    const { status, _id } = reservation;

    if (status === 'pending') {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleConfirm(_id)}>
            <Check className="h-4 w-4 mr-1" />
            Confirmar
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleEdit(reservation)}>
            Editar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleCancel(_id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (status === 'confirmed') {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={() => setShowSeatDialog(reservation)}>
            <Users className="h-4 w-4 mr-1" />
            Sentar
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleEdit(reservation)}>
            Editar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleNoShow(_id)}>
            No Show
          </Button>
        </div>
      );
    }

    if (status === 'seated') {
      return (
        <Badge variant="outline" className="bg-green-50">
          Actualmente sentados
        </Badge>
      );
    }

    return null;
  };

  const getUpcomingReservations = () => {
    const now = new Date();
    return reservations.filter(r =>
      (r.status === 'pending' || r.status === 'confirmed') &&
      new Date(r.date) >= now
    );
  };

  const getTodayReservations = () => {
    const today = new Date().toISOString().split('T')[0];
    return reservations.filter(r => r.date.startsWith(today));
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getTodayReservations().length}</div>
            <p className="text-xs text-gray-500 mt-1">Reservas para hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Próximas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getUpcomingReservations().length}</div>
            <p className="text-xs text-gray-500 mt-1">Pendientes/Confirmadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sentados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {reservations.filter(r => r.status === 'seated').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">En este momento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reservations.length}</div>
            <p className="text-xs text-gray-500 mt-1">Todas las reservas</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Reservas</CardTitle>
              <CardDescription>Gestiona las reservas del restaurante</CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Reserva
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={filter.search}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filter.status} onValueChange={(value) => setFilter({ ...filter, status: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="confirmed">Confirmadas</SelectItem>
                <SelectItem value="seated">Sentados</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filter.date}
              onChange={(e) => setFilter({ ...filter, date: e.target.value })}
              className="w-[180px]"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : reservations.length === 0 ? (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                No hay reservas para mostrar. Crea una nueva reserva para comenzar.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-bold">Fecha/Hora</TableHead>
                    <TableHead className="font-bold">Cliente</TableHead>
                    <TableHead className="font-bold">Contacto</TableHead>
                    <TableHead className="font-bold">Personas</TableHead>
                    <TableHead className="font-bold">Mesa</TableHead>
                    <TableHead className="font-bold">Estado</TableHead>
                    <TableHead className="font-bold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => {
                    const StatusIcon = STATUS_CONFIG[reservation.status]?.icon || Clock;
                    return (
                      <TableRow key={reservation._id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <div>
                              <div className="font-medium">{formatDate(reservation.date)}</div>
                              <div className="text-sm text-gray-500">{formatTime(reservation.date)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{reservation.guestName}</div>
                          {reservation.specialRequests && (
                            <div className="text-xs text-gray-500 mt-1">
                              {reservation.specialRequests}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {reservation.guestPhone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-gray-400" />
                                {reservation.guestPhone}
                              </div>
                            )}
                            {reservation.guestEmail && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Mail className="h-3 w-3 text-gray-400" />
                                {reservation.guestEmail}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{reservation.partySize}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {reservation.tableId ? (
                            <Badge variant="outline" className="bg-blue-50">
                              {reservation.tableNumber || 'Mesa asignada'}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_CONFIG[reservation.status]?.color}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {STATUS_CONFIG[reservation.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{renderActionButtons(reservation)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seat Dialog */}
      <Dialog open={!!showSeatDialog} onOpenChange={() => setShowSeatDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sentar Reserva</DialogTitle>
            <DialogDescription>
              {showSeatDialog?.guestName} - {showSeatDialog?.partySize} personas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Selecciona Mesa</label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige una mesa..." />
                </SelectTrigger>
                <SelectContent>
                  {tables
                    .filter(t => t.status === 'available')
                    .map(table => (
                      <SelectItem key={table._id} value={table._id}>
                        Mesa {table.tableNumber} - Capacidad: {table.capacity}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSeatDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSeat}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reservation Form Dialog */}
      {showForm && (
        <ReservationForm
          reservation={selectedReservation}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};

export default ReservationsList;
