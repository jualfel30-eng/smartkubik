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
import { useBusinessModel, getBusinessContextText } from '../hooks/useBusinessModel';
import ModuleAccessDenied from './ModuleAccessDenied';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  User,
  Building,
  Wrench,
  Truck
} from 'lucide-react';

const RESOURCE_TYPES = [
  { value: 'person', label: 'Persona', icon: User },
  { value: 'room', label: 'Sala/Habitación', icon: Building },
  { value: 'equipment', label: 'Equipo', icon: Wrench },
  { value: 'vehicle', label: 'Vehículo', icon: Truck },
];

const initialServiceState = {
  name: '',
  description: '',
  category: '',
  duration: 30,
  price: 0,
  cost: 0,
  status: 'active',
  color: '#3B82F6',
  requiresResource: true,
  allowedResourceTypes: [],
  bufferTimeBefore: 0,
  bufferTimeAfter: 0,
  maxSimultaneous: 1,
};

function ServicesManagement() {
  const hasAccess = useModuleAccess('appointments');
  const { isResourceCentric, isFlexible, businessType } = useBusinessModel();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState(initialServiceState);
  const [loading, setLoading] = useState(false);

  // Check module access
  if (!hasAccess) {
    return <ModuleAccessDenied moduleName="appointments" />;
  }

  useEffect(() => {
    loadServices();
    loadCategories();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, searchTerm, statusFilter, categoryFilter]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/services');
      setServices(data);
    } catch (error) {
      console.error('Error loading services:', error);
      alert('Error al cargar los servicios');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await fetchApi('/services/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const filterServices = () => {
    let filtered = [...services];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => service.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(service => service.category === categoryFilter);
    }

    setFilteredServices(filtered);
  };

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData(initialServiceState);
    setIsDialogOpen(true);
  };

  const openEditDialog = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category,
      duration: service.duration,
      price: service.price,
      cost: service.cost || 0,
      status: service.status,
      color: service.color || '#3B82F6',
      requiresResource: service.requiresResource ?? true,
      allowedResourceTypes: service.allowedResourceTypes || [],
      bufferTimeBefore: service.bufferTimeBefore || 0,
      bufferTimeAfter: service.bufferTimeAfter || 0,
      maxSimultaneous: service.maxSimultaneous || 1,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (editingService) {
        // Update
        await fetchApi(`/services/${editingService._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        // Create
        await fetchApi('/services', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }

      setIsDialogOpen(false);
      loadServices();
      loadCategories(); // Reload categories in case new one was added
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Error al guardar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este servicio?')) return;

    try {
      setLoading(true);
      await fetchApi(`/services/${id}`, { method: 'DELETE' });
      loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Error al eliminar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Servicios</h1>
          <p className="text-gray-500">Gestiona los servicios que ofreces</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio
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
                  placeholder="Buscar servicios..."
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
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredServices.length} servicio{filteredServices.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servicio</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No se encontraron servicios
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service) => (
                  <TableRow key={service._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: service.color }}
                        />
                        <div>
                          <div className="font-medium">{service.name}</div>
                          {service.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {service.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{service.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatDuration(service.duration)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        {formatCurrency(service.price)}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatCurrency(service.cost || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.status === 'active' ? 'success' : 'secondary'}>
                        {service.status === 'active' ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactivo
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service._id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nombre del Servicio *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: Consulta General"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del servicio..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="category">Categoría *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  placeholder="Ej: Consultas"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="duration">Duración (minutos) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  required
                />
              </div>

              {isResourceCentric && !isFlexible ? (
                <div className="col-span-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                      <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        {getBusinessContextText(businessType, 'service').title}
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        {getBusinessContextText(businessType, 'service').description}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="price" className="text-blue-900 dark:text-blue-100">
                            Precio desde ($)
                          </Label>
                          <Input
                            id="price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                            placeholder="Ej: 100"
                            className="bg-white dark:bg-gray-950"
                          />
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Solo referencial, el precio real está en cada recurso
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="cost" className="text-blue-900 dark:text-blue-100">
                            Costo operativo ($)
                          </Label>
                          <Input
                            id="cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.cost}
                            onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                            placeholder="Ej: 20"
                            className="bg-white dark:bg-gray-950"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="price">Precio ($) *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      required
                      placeholder="Precio que paga el cliente"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {getBusinessContextText(businessType, 'service').description}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="cost">Costo ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                      placeholder="Costo operativo"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Para calcular rentabilidad
                    </p>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="bufferTimeBefore">Preparación (min)</Label>
                <Input
                  id="bufferTimeBefore"
                  type="number"
                  min="0"
                  value={formData.bufferTimeBefore}
                  onChange={(e) => setFormData({ ...formData, bufferTimeBefore: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="bufferTimeAfter">Limpieza (min)</Label>
                <Input
                  id="bufferTimeAfter"
                  type="number"
                  min="0"
                  value={formData.bufferTimeAfter}
                  onChange={(e) => setFormData({ ...formData, bufferTimeAfter: parseInt(e.target.value) })}
                />
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
                  </SelectContent>
                </Select>
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
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>

            {/* Resource Type Selector */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Tipos de recursos permitidos</h3>
                <p className="text-sm text-muted-foreground">
                  Selecciona qué tipos de recursos pueden realizar este servicio
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-lg bg-gray-50 dark:bg-slate-900/40">
                {RESOURCE_TYPES.map((resourceType) => {
                  const Icon = resourceType.icon;
                  return (
                    <div
                      key={resourceType.value}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      <Checkbox
                        id={`resource-type-${resourceType.value}`}
                        checked={formData.allowedResourceTypes.includes(resourceType.value)}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true || checked === 'indeterminate';
                          setFormData((prev) => ({
                            ...prev,
                            allowedResourceTypes: isChecked
                              ? [...prev.allowedResourceTypes, resourceType.value]
                              : prev.allowedResourceTypes.filter((type) => type !== resourceType.value),
                          }));
                        }}
                      />
                      <Label
                        htmlFor={`resource-type-${resourceType.value}`}
                        className="flex items-center gap-2 cursor-pointer font-normal"
                      >
                        <Icon className="h-4 w-4 text-gray-500" />
                        <span>{resourceType.label}</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
              {formData.allowedResourceTypes.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Si no seleccionas ningún tipo, todos los tipos de recursos podrán realizar este servicio.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : editingService ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ServicesManagement;
