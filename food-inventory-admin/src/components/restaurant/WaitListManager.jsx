import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getWaitListEntries,
  createWaitListEntry,
  updateWaitListStatus,
  notifyWaitListCustomer,
  seatFromWaitList,
  getWaitListStats,
  estimateWaitTime,
  getAvailableTables,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  Users,
  Clock,
  Phone,
  Mail,
  Bell,
  Check,
  X,
  UserPlus,
  AlertCircle,
  TrendingUp,
  MapPin,
} from 'lucide-react';

const STATUS_CONFIG = {
  waiting: { label: 'Esperando', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  notified: { label: 'Notificado', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Bell },
  seated: { label: 'Sentado', color: 'bg-green-100 text-green-800 border-green-300', icon: Check },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-300', icon: X },
  'no-show': { label: 'No Show', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertCircle },
};

const WaitListManager = () => {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSeatDialog, setShowSeatDialog] = useState(null);
  const [showNotifyDialog, setShowNotifyDialog] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [notificationMethod, setNotificationMethod] = useState('sms');

  // Form state for adding new entry
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    email: '',
    partySize: 2,
    notes: '',
  });
  const [estimatedWait, setEstimatedWait] = useState(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWaitListEntries({ activeOnly: true });
      setEntries(data || []);
    } catch (error) {
      toast.error('Error al cargar lista de espera', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getWaitListStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const fetchAvailableTables = useCallback(async () => {
    try {
      const response = await getAvailableTables();
      setAvailableTables(response?.data || []);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchStats();
    fetchAvailableTables();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchEntries();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchEntries, fetchStats, fetchAvailableTables]);

  // Estimate wait time when party size changes
  useEffect(() => {
    const fetchEstimate = async () => {
      if (formData.partySize > 0) {
        try {
          const estimate = await estimateWaitTime(formData.partySize);
          setEstimatedWait(estimate);
        } catch (error) {
          console.error('Error estimating wait time:', error);
        }
      }
    };

    if (showAddDialog) {
      fetchEstimate();
    }
  }, [formData.partySize, showAddDialog]);

  const handleAddEntry = async (e) => {
    e.preventDefault();

    if (!formData.customerName || !formData.phoneNumber) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    try {
      await createWaitListEntry(formData);
      toast.success('Cliente agregado a la lista de espera');
      setShowAddDialog(false);
      resetForm();
      fetchEntries();
      fetchStats();
    } catch (error) {
      toast.error('Error al agregar cliente', { description: error.message });
    }
  };

  const handleNotify = async () => {
    if (!showNotifyDialog) return;

    try {
      await notifyWaitListCustomer({
        entryId: showNotifyDialog._id,
        method: notificationMethod,
      });
      toast.success(`Cliente notificado vía ${notificationMethod.toUpperCase()}`);
      setShowNotifyDialog(null);
      setNotificationMethod('sms');
      fetchEntries();
    } catch (error) {
      toast.error('Error al notificar', { description: error.message });
    }
  };

  const handleSeat = async () => {
    if (!showSeatDialog || !selectedTable) {
      toast.error('Selecciona una mesa');
      return;
    }

    try {
      await seatFromWaitList({
        entryId: showSeatDialog._id,
        tableId: selectedTable,
      });
      toast.success('Cliente sentado exitosamente');
      setShowSeatDialog(null);
      setSelectedTable('');
      fetchEntries();
      fetchStats();
      fetchAvailableTables();
    } catch (error) {
      toast.error('Error al sentar cliente', { description: error.message });
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta entrada?')) return;

    try {
      await updateWaitListStatus(id, { status: 'cancelled' });
      toast.success('Entrada cancelada');
      fetchEntries();
      fetchStats();
    } catch (error) {
      toast.error('Error al cancelar', { description: error.message });
    }
  };

  const handleNoShow = async (id) => {
    if (!confirm('¿Marcar como No Show?')) return;

    try {
      await updateWaitListStatus(id, { status: 'no-show' });
      toast.success('Marcado como No Show');
      fetchEntries();
      fetchStats();
    } catch (error) {
      toast.error('Error', { description: error.message });
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      phoneNumber: '',
      email: '',
      partySize: 2,
      notes: '',
    });
    setEstimatedWait(null);
  };

  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderActionButtons = (entry) => {
    const { status, _id } = entry;

    if (status === 'waiting') {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNotifyDialog(entry)}
          >
            <Bell className="h-4 w-4 mr-1" />
            Notificar
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowSeatDialog(entry)}
          >
            <MapPin className="h-4 w-4 mr-1" />
            Sentar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleCancel(_id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (status === 'notified') {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowSeatDialog(entry)}
          >
            <MapPin className="h-4 w-4 mr-1" />
            Sentar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleNoShow(_id)}
          >
            No Show
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Esperando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalWaiting || 0}</div>
            <p className="text-xs text-gray-500 mt-1">En cola actualmente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Notificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalNotified || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Mesa lista</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tiempo Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.averageWaitTime || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Minutos de espera</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total en Cola</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(stats?.totalWaiting || 0) + (stats?.totalNotified || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Grupos activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Lista de Espera</CardTitle>
              <CardDescription>Gestiona la cola de clientes esperando mesa</CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : entries.length === 0 ? (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                No hay clientes en la lista de espera.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-bold">Posición</TableHead>
                    <TableHead className="font-bold">Cliente</TableHead>
                    <TableHead className="font-bold">Contacto</TableHead>
                    <TableHead className="font-bold">Personas</TableHead>
                    <TableHead className="font-bold">Llegada</TableHead>
                    <TableHead className="font-bold">Tiempo Estimado</TableHead>
                    <TableHead className="font-bold">Estado</TableHead>
                    <TableHead className="font-bold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const StatusIcon = STATUS_CONFIG[entry.status]?.icon || Clock;
                    return (
                      <TableRow key={entry._id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              #{entry.position}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{entry.customerName}</div>
                          {entry.notes && (
                            <div className="text-xs text-gray-500 mt-1">{entry.notes}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {entry.phoneNumber && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-gray-400" />
                                {entry.phoneNumber}
                              </div>
                            )}
                            {entry.email && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Mail className="h-3 w-3 text-gray-400" />
                                {entry.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{entry.partySize}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {formatDateTime(entry.arrivalTime)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-50">
                            {formatTime(entry.estimatedWaitTime)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_CONFIG[entry.status]?.color}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {STATUS_CONFIG[entry.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{renderActionButtons(entry)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Cliente a Lista de Espera</DialogTitle>
            <DialogDescription>
              Ingresa la información del cliente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEntry} className="space-y-4 py-4">
            <div>
              <Label htmlFor="customerName">Nombre del Cliente *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Teléfono *</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+58 414 123 4567"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@example.com"
              />
            </div>

            <div>
              <Label htmlFor="partySize">Número de Personas *</Label>
              <Input
                id="partySize"
                type="number"
                min="1"
                value={formData.partySize}
                onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) })}
                required
              />
            </div>

            {estimatedWait && (
              <Alert className="bg-blue-50 border-blue-200">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <strong>Tiempo estimado de espera:</strong> {formatTime(estimatedWait.estimatedWaitTime)}
                  <br />
                  <span className="text-sm text-gray-600">
                    Posición: #{estimatedWait.position} ({estimatedWait.partiesAhead} grupos adelante)
                  </span>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="notes">Notas Especiales (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Requerimientos especiales, preferencias, etc."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowAddDialog(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button type="submit">Agregar a Lista</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notify Dialog */}
      <Dialog open={!!showNotifyDialog} onOpenChange={() => setShowNotifyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notificar Cliente</DialogTitle>
            <DialogDescription>
              {showNotifyDialog?.customerName} - {showNotifyDialog?.partySize} personas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Método de Notificación</Label>
              <Select value={notificationMethod} onValueChange={setNotificationMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                Se enviará un mensaje notificando al cliente que su mesa está lista.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotifyDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleNotify}>
              <Bell className="h-4 w-4 mr-2" />
              Enviar Notificación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seat Dialog */}
      <Dialog open={!!showSeatDialog} onOpenChange={() => setShowSeatDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sentar Cliente</DialogTitle>
            <DialogDescription>
              {showSeatDialog?.customerName} - {showSeatDialog?.partySize} personas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Selecciona Mesa</Label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige una mesa disponible..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTables
                    .filter(t => t.capacity >= (showSeatDialog?.partySize || 0))
                    .map(table => (
                      <SelectItem key={table._id} value={table._id}>
                        Mesa {table.tableNumber} - Capacidad: {table.capacity}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {showSeatDialog && (
              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Tiempo de espera: {formatTime(
                    Math.floor((new Date() - new Date(showSeatDialog.arrivalTime)) / 60000)
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSeatDialog(null);
              setSelectedTable('');
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSeat}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaitListManager;
