import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { fetchApi } from '../lib/api';
import { useModuleAccess } from '../hooks/useModuleAccess';
import ModuleAccessDenied from './ModuleAccessDenied';
import {
  Plus,
  Calendar,
  Clock,
  User,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle
} from 'lucide-react';

const UNASSIGNED_RESOURCE = '__UNASSIGNED__';

const initialAppointmentState = {
  customerId: '',
  serviceId: '',
  resourceId: UNASSIGNED_RESOURCE,
  startTime: '',
  endTime: '',
  notes: '',
  status: 'pending',
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', variant: 'secondary', icon: AlertCircle },
  confirmed: { label: 'Confirmada', variant: 'default', icon: CheckCircle },
  in_progress: { label: 'En progreso', variant: 'warning', icon: PlayCircle },
  completed: { label: 'Completada', variant: 'success', icon: CheckCircle },
  cancelled: { label: 'Cancelada', variant: 'destructive', icon: XCircle },
  no_show: { label: 'No asistió', variant: 'destructive', icon: XCircle },
};

function AppointmentsManagement() {
  const hasAccess = useModuleAccess('appointments');
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [formData, setFormData] = useState({ ...initialAppointmentState });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const normalizeListResponse = (apiResponse) => {
    if (Array.isArray(apiResponse)) {
      return apiResponse;
    }
    if (apiResponse && Array.isArray(apiResponse.data)) {
      return apiResponse.data;
    }
    return [];
  };

  if (!hasAccess) {
    return <ModuleAccessDenied moduleName="appointments" />;
  }

  useEffect(() => {
    // Set default date range (current week)
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    setDateFrom(weekStart.toISOString().split('T')[0]);
    setDateTo(weekEnd.toISOString().split('T')[0]);

    loadServices();
    loadResources();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadAppointments();
    }
  }, [dateFrom, dateTo, statusFilter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const data = await fetchApi(`/appointments?${params}`);
      setAppointments(normalizeListResponse(data));
    } catch (error) {
      console.error('Error loading appointments:', error);
      alert('Error al cargar las citas');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const data = await fetchApi('/services/active');
      setServices(normalizeListResponse(data));
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
    }
  };

  const loadResources = async () => {
    try {
      const data = await fetchApi('/resources/active');
      setResources(normalizeListResponse(data));
    } catch (error) {
      console.error('Error loading resources:', error);
      setResources([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await fetchApi('/customers');
      setCustomers(normalizeListResponse(data));
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const openCreateDialog = () => {
    setEditingAppointment(null);
    setFormData({ ...initialAppointmentState });
    setIsDialogOpen(true);
  };

  const openEditDialog = (appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      customerId: appointment.customerId._id || appointment.customerId,
      serviceId: appointment.serviceId._id || appointment.serviceId,
      resourceId: appointment.resourceId?._id || appointment.resourceId || UNASSIGNED_RESOURCE,
      startTime: new Date(appointment.startTime).toISOString().slice(0, 16),
      endTime: new Date(appointment.endTime).toISOString().slice(0, 16),
      notes: appointment.notes || '',
      status: appointment.status,
    });
    setIsDialogOpen(true);
  };

  const handleServiceChange = (serviceId) => {
    const serviceList = Array.isArray(services) ? services : [];
    const service = serviceList.find(s => s._id === serviceId);
    setFormData(prev => {
      const next = { ...prev, serviceId };
      if (prev.startTime && service?.duration) {
        const start = new Date(prev.startTime);
        if (!Number.isNaN(start.getTime())) {
          const end = new Date(start.getTime() + service.duration * 60000);
          next.endTime = end.toISOString().slice(0, 16);
        }
      }
      return next;
    });
  };

  const handleStartTimeChange = (startTime) => {
    const serviceList = Array.isArray(services) ? services : [];
    setFormData(prev => {
      const next = { ...prev, startTime };
      if (prev.serviceId) {
        const service = serviceList.find(s => s._id === prev.serviceId);
        if (service?.duration) {
          const start = new Date(startTime);
          if (!Number.isNaN(start.getTime())) {
            const end = new Date(start.getTime() + service.duration * 60000);
            next.endTime = end.toISOString().slice(0, 16);
          }
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        resourceId:
          (formData.resourceId || UNASSIGNED_RESOURCE) === UNASSIGNED_RESOURCE
            ? undefined
            : formData.resourceId,
      };

      if (editingAppointment) {
        await fetchApi(`/appointments/${editingAppointment._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/appointments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsDialogOpen(false);
      loadAppointments();
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert(error.message || 'Error al guardar la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta cita?')) return;

    try {
      setLoading(true);
      await fetchApi(`/appointments/${id}`, { method: 'DELETE' });
      loadAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Error al eliminar la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      setLoading(true);
      await fetchApi(`/appointments/${appointmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      loadAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-VE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agenda de Citas</h1>
          <p className="text-gray-500">Gestiona las citas y reservas</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <Label>Hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div>
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="confirmed">Confirmadas</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadAppointments} className="w-full">
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {appointments.length} cita{appointments.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No se encontraron citas en este rango de fechas
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((apt) => (
                  <TableRow key={apt._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {new Date(apt.startTime).toLocaleDateString('es-VE', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(apt.startTime).toLocaleTimeString('es-VE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{apt.customerName}</div>
                          {apt.customerPhone && (
                            <div className="text-sm text-gray-500">{apt.customerPhone}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{apt.serviceName}</Badge>
                    </TableCell>
                    <TableCell>
                      {apt.resourceName || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={apt.status}
                        onValueChange={(value) => handleStatusChange(apt._id, value)}
                      >
                        <SelectTrigger className="w-[160px]">
                          {getStatusBadge(apt.status)}
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(apt)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(apt._id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
            </DialogTitle>
            <DialogDescription>
              Completa la información de la cita y asigna un recurso opcional antes de guardar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="customerId">Cliente *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                  required
                >
                  <SelectTrigger id="customerId">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="serviceId">Servicio *</Label>
                <Select
                  value={formData.serviceId}
                  onValueChange={handleServiceChange}
                  required
                >
                  <SelectTrigger id="serviceId">
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(services) ? services : []).map((service) => (
                      <SelectItem key={service._id} value={service._id}>
                        {service.name} ({service.duration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="resourceId">Recurso</Label>
                <Select
                  value={formData.resourceId || UNASSIGNED_RESOURCE}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      resourceId: value || UNASSIGNED_RESOURCE,
                    })
                  }
                >
                  <SelectTrigger id="resourceId">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_RESOURCE}>Sin asignar</SelectItem>
                    {(Array.isArray(resources) ? resources : []).map((resource) => (
                      <SelectItem key={resource._id} value={resource._id}>
                        {resource.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startTime">Inicio *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endTime">Fin *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : editingAppointment ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AppointmentsManagement;
