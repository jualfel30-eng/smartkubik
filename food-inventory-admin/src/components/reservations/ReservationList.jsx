import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Plus, Edit, Trash2, Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useReservations } from '@/hooks/useReservations';
import { ReservationDialog } from './ReservationDialog';

export function ReservationList() {
  const { reservations, loading, error, loadReservations, createReservation, updateReservation, deleteReservation, confirmReservation, seatReservation, markNoShow } =
    useReservations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    loadReservations({ status: filterStatus === 'all' ? undefined : filterStatus });
  }, [loadReservations, filterStatus]);

  const handleCreate = () => {
    setSelectedReservation(null);
    setDialogOpen(true);
  };

  const handleEdit = (reservation) => {
    setSelectedReservation(reservation);
    setDialogOpen(true);
  };

  const handleSave = async (reservationData) => {
    try {
      if (selectedReservation) {
        await updateReservation(selectedReservation._id, reservationData);
      } else {
        await createReservation(reservationData);
      }
      setDialogOpen(false);
      setSelectedReservation(null);
    } catch (err) {
      console.error('Error saving reservation:', err);
      alert('Error al guardar la reserva: ' + err.message);
    }
  };

  const handleDelete = async (reservationId) => {
    if (window.confirm('¿Estás seguro de cancelar esta reserva?')) {
      try {
        await deleteReservation(reservationId);
      } catch (err) {
        console.error('Error deleting reservation:', err);
      }
    }
  };

  const handleConfirm = async (reservationId) => {
    try {
      await confirmReservation(reservationId);
      alert('Reserva confirmada exitosamente');
    } catch (err) {
      console.error('Error confirming reservation:', err);
      alert('Error al confirmar la reserva');
    }
  };

  const handleSeat = async (reservationId, tableId) => {
    try {
      await seatReservation(reservationId, { tableId });
      alert('Clientes sentados exitosamente');
    } catch (err) {
      console.error('Error seating reservation:', err);
      alert('Error al sentar clientes');
    }
  };

  const handleNoShow = async (reservationId) => {
    if (window.confirm('¿Marcar esta reserva como no show?')) {
      try {
        await markNoShow(reservationId);
      } catch (err) {
        console.error('Error marking no-show:', err);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary', icon: Clock },
      confirmed: { label: 'Confirmada', variant: 'default', icon: CheckCircle },
      seated: { label: 'Sentada', variant: 'success', icon: Users },
      completed: { label: 'Completada', variant: 'outline', icon: CheckCircle },
      cancelled: { label: 'Cancelada', variant: 'destructive', icon: XCircle },
      'no-show': { label: 'No show', variant: 'destructive', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filterDate && reservation.date) {
      const resDate = new Date(reservation.date).toISOString().split('T')[0];
      return resDate === filterDate;
    }
    return true;
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            <CardTitle>Reservas</CardTitle>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Reserva
          </Button>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Todas
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
              >
                Pendientes
              </Button>
              <Button
                variant={filterStatus === 'confirmed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('confirmed')}
              >
                Confirmadas
              </Button>
              <Button
                variant={filterStatus === 'seated' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('seated')}
              >
                Sentadas
              </Button>
            </div>

            <input
              type="date"
              className="px-3 py-1 border rounded-md"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              placeholder="Filtrar por fecha"
            />
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando reservas...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="text-center py-8">
              <p className="text-destructive">Error: {error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filteredReservations.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No hay reservas creadas</p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera reserva
              </Button>
            </div>
          )}

          {/* Table */}
          {!loading && !error && filteredReservations.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Personas</TableHead>
                  <TableHead>Mesa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => (
                  <TableRow key={reservation._id}>
                    <TableCell className="font-mono text-sm">
                      {reservation.reservationNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{reservation.guestName}</p>
                        <p className="text-sm text-muted-foreground">{reservation.guestPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(reservation.date)}</TableCell>
                    <TableCell>{formatTime(reservation.time)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {reservation.partySize}
                      </div>
                    </TableCell>
                    <TableCell>
                      {reservation.tableNumber ? (
                        <Badge variant="outline">Mesa {reservation.tableNumber}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {reservation.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirm(reservation._id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirmar
                          </Button>
                        )}
                        {reservation.status === 'confirmed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSeat(reservation._id, null)}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Sentar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(reservation)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {['pending', 'confirmed'].includes(reservation.status) && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(reservation._id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleNoShow(reservation._id)}
                            >
                              <AlertCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      {dialogOpen && (
        <ReservationDialog
          reservation={selectedReservation}
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedReservation(null);
          }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
