import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { fetchApi } from '../lib/api';
import { useModuleAccess } from '../hooks/useModuleAccess';
import ModuleAccessDenied from './ModuleAccessDenied';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Building,
  Wrench,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const initialResourceState = {
  name: '',
  type: 'person',
  description: '',
  email: '',
  phone: '',
  status: 'active',
  color: '#10B981',
  schedule: {
    monday: { available: true, start: '09:00', end: '18:00' },
    tuesday: { available: true, start: '09:00', end: '18:00' },
    wednesday: { available: true, start: '09:00', end: '18:00' },
    thursday: { available: true, start: '09:00', end: '18:00' },
    friday: { available: true, start: '09:00', end: '18:00' },
    saturday: { available: false, start: '09:00', end: '13:00' },
    sunday: { available: false, start: '09:00', end: '13:00' },
  },
  specializations: [],
  capacity: 1,
};

const RESOURCE_TYPES = [
  { value: 'person', label: 'Persona', icon: User },
  { value: 'room', label: 'Sala/Habitación', icon: Building },
  { value: 'equipment', label: 'Equipo', icon: Wrench },
  { value: 'vehicle', label: 'Vehículo', icon: Truck },
];

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

function ResourcesManagement() {
  const hasAccess = useModuleAccess('appointments');
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState(initialResourceState);
  const [loading, setLoading] = useState(false);

  if (!hasAccess) {
    return <ModuleAccessDenied moduleName="appointments" />;
  }

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, searchTerm, statusFilter, typeFilter]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/resources');
      setResources(data);
    } catch (error) {
      console.error('Error loading resources:', error);
      alert('Error al cargar los recursos');
    } finally {
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = [...resources];

    if (searchTerm) {
      filtered = filtered.filter(resource =>
        resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.specializations?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(resource => resource.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(resource => resource.type === typeFilter);
    }

    setFilteredResources(filtered);
  };

  const openCreateDialog = () => {
    setEditingResource(null);
    setFormData(initialResourceState);
    setIsDialogOpen(true);
  };

  const openEditDialog = (resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      type: resource.type,
      description: resource.description || '',
      email: resource.email || '',
      phone: resource.phone || '',
      status: resource.status,
      color: resource.color || '#10B981',
      schedule: resource.schedule || initialResourceState.schedule,
      specializations: resource.specializations || [],
      capacity: resource.capacity || 1,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (editingResource) {
        await fetchApi(`/resources/${editingResource._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/resources', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }

      setIsDialogOpen(false);
      loadResources();
    } catch (error) {
      console.error('Error saving resource:', error);
      alert('Error al guardar el recurso');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este recurso?')) return;

    try {
      setLoading(true);
      await fetchApi(`/resources/${id}`, { method: 'DELETE' });
      loadResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Error al eliminar el recurso');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { variant: 'success', icon: CheckCircle, label: 'Activo' },
      inactive: { variant: 'secondary', icon: XCircle, label: 'Inactivo' },
      on_vacation: { variant: 'warning', icon: AlertCircle, label: 'De vacaciones' },
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type) => {
    const typeObj = RESOURCE_TYPES.find(t => t.value === type);
    return typeObj ? typeObj.icon : User;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Recursos</h1>
          <p className="text-gray-500">Gestiona personas, salas, equipos y vehículos</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Recurso
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar recursos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="on_vacation">De vacaciones</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {RESOURCE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resources Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredResources.length} recurso{filteredResources.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recurso</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Especialidades</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No se encontraron recursos
                  </TableCell>
                </TableRow>
              ) : (
                filteredResources.map((resource) => {
                  const Icon = getTypeIcon(resource.type);
                  return (
                    <TableRow key={resource._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: resource.color }}
                          />
                          <Icon className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{resource.name}</div>
                            {resource.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {resource.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {RESOURCE_TYPES.find(t => t.value === resource.type)?.label || resource.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {resource.email && (
                          <div className="text-sm">{resource.email}</div>
                        )}
                        {resource.phone && (
                          <div className="text-sm text-gray-500">{resource.phone}</div>
                        )}
                        {!resource.email && !resource.phone && (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {resource.specializations && resource.specializations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {resource.specializations.slice(0, 2).map((spec, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {resource.specializations.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{resource.specializations.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(resource.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(resource)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(resource._id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-950">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Editar Recurso' : 'Nuevo Recurso'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nombre del Recurso *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: Dr. Juan Pérez"
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Estado</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="on_vacation">De vacaciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del recurso..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+58 412-1234567"
                />
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#10B981"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="capacity">Capacidad</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Schedule */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Horario de Disponibilidad</h3>
              <div className="space-y-2">
                {DAYS.map((day) => (
                  <div key={day.key} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-slate-800 rounded">
                    <div className="w-32">
                      <Checkbox
                        id={`schedule-${day.key}`}
                        checked={formData.schedule[day.key].available}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            schedule: {
                              ...formData.schedule,
                              [day.key]: { ...formData.schedule[day.key], available: checked },
                            },
                          })
                        }
                      />
                      <Label htmlFor={`schedule-${day.key}`} className="ml-2">
                        {day.label}
                      </Label>
                    </div>
                    {formData.schedule[day.key].available && (
                      <>
                        <Input
                          type="time"
                          value={formData.schedule[day.key].start}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              schedule: {
                                ...formData.schedule,
                                [day.key]: { ...formData.schedule[day.key], start: e.target.value },
                              },
                            })
                          }
                          className="w-32"
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          value={formData.schedule[day.key].end}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              schedule: {
                                ...formData.schedule,
                                [day.key]: { ...formData.schedule[day.key], end: e.target.value },
                              },
                            })
                          }
                          className="w-32"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : editingResource ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ResourcesManagement;
