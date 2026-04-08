import { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '@/hooks/use-auth';
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
  Truck,
  ImageIcon
} from 'lucide-react';

const compressAndConvertImage = (file) => {
  return new Promise((resolve, reject) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      reject(new Error('Solo se permiten imágenes JPEG, PNG o WebP'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('La imagen es demasiado grande. Máximo 10MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          let { width, height } = img;
          const maxSize = 800;
          if (width > maxSize || height > maxSize) {
            if (width > height) { height = (height / width) * maxSize; width = maxSize; }
            else { width = (width / height) * maxSize; height = maxSize; }
          }
          canvas.width = width;
          canvas.height = height;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          const sizeInKB = (base64.length * 3) / 4 / 1024;
          if (sizeInKB > 500) {
            reject(new Error(`Imagen demasiado grande: ${sizeInKB.toFixed(0)}KB. Máximo 500KB`));
          } else {
            resolve(base64);
          }
        } catch (err) {
          reject(new Error(`Error al procesar imagen: ${err.message}`));
        }
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
};

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
  images: [],
};

function ServicesManagement() {
  const hasAccess = useModuleAccess('appointments');
  const { isResourceCentric, isFlexible, businessType } = useBusinessModel();
  const { tenant } = useAuth();
  const profileKey = tenant?.verticalProfile?.key || 'hospitality';

  // Beauty vertical detection - use beauty endpoints for barbershop-salon
  const isBeautyVertical = profileKey === 'barbershop-salon';
  const servicesEndpoint = isBeautyVertical ? '/beauty-services' : '/services';

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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleImageAdd = async (e) => {
    const files = Array.from(e.target.files);
    const remaining = 3 - (formData.images?.length || 0);
    const toProcess = files.slice(0, remaining);
    const results = [];
    for (const file of toProcess) {
      try {
        const base64 = await compressAndConvertImage(file);
        results.push(base64);
      } catch (err) {
        alert(err.message);
      }
    }
    if (results.length > 0) {
      setFormData((prev) => ({ ...prev, images: [...(prev.images || []), ...results] }));
      setSelectedImageIndex((formData.images?.length || 0));
    }
    e.target.value = '';
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: newImages };
    });
    setSelectedImageIndex(0);
  };

  const filterServices = useCallback(() => {
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
  }, [services, searchTerm, statusFilter, categoryFilter]);

  useEffect(() => {
    if (!hasAccess) return;
    loadServices();
    loadCategories();
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) {
      setFilteredServices([]);
      return;
    }
    filterServices();
  }, [hasAccess, filterServices]);

  // Normalize beauty service → generic format for display/edit
  const normalizeBeautyService = (svc) => ({
    ...svc,
    price: typeof svc.price === 'object' ? svc.price.amount : svc.price,
    cost: svc.cost || 0,
    status: svc.isActive !== undefined ? (svc.isActive ? 'active' : 'inactive') : (svc.status || 'active'),
    bufferTimeBefore: svc.bufferBefore ?? svc.bufferTimeBefore ?? 0,
    bufferTimeAfter: svc.bufferAfter ?? svc.bufferTimeAfter ?? 0,
    color: svc.color || '#3B82F6',
    requiresResource: svc.requiresResource ?? true,
    allowedResourceTypes: svc.allowedResourceTypes || [],
    images: svc.images || [],
  });

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await fetchApi(servicesEndpoint);
      const normalized = isBeautyVertical ? data.map(normalizeBeautyService) : data;
      setServices(normalized);
    } catch (error) {
      console.error('Error loading services:', error);
      alert('Error al cargar los servicios');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await fetchApi(`${servicesEndpoint}/categories`);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData(initialServiceState);
    setSelectedImageIndex(0);
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
      images: service.images || [],
    });
    setSelectedImageIndex(0);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      let payload = formData;
      if (isBeautyVertical) {
        payload = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          duration: formData.duration,
          price: { amount: parseFloat(formData.price) || 0, currency: 'USD' },
          cost: formData.cost,
          isActive: formData.status === 'active',
          color: formData.color,
          bufferBefore: formData.bufferTimeBefore || 0,
          bufferAfter: formData.bufferTimeAfter || 0,
          maxSimultaneous: formData.maxSimultaneous || 1,
          images: formData.images || [],
        };
      }

      if (editingService) {
        // Update
        await fetchApi(`${servicesEndpoint}/${editingService._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        await fetchApi(servicesEndpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
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
      await fetchApi(`${servicesEndpoint}/${id}`, { method: 'DELETE' });
      loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Error al eliminar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const value = typeof amount === 'object' && amount !== null ? amount.amount : amount;
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Check module access
  if (!hasAccess) {
    return <ModuleAccessDenied moduleName="appointments" />;
  }

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

            {/* Images */}
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Imágenes del servicio (máx. 3)</h3>
                <p className="text-sm text-muted-foreground">Fotos que se mostrarán en el storefront</p>
              </div>
              <div className="flex gap-4 items-start">
                {/* Main preview */}
                <label htmlFor="service-images" className={`cursor-pointer flex-shrink-0 flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted/50 overflow-hidden ${(formData.images?.length || 0) >= 3 ? 'pointer-events-none opacity-50' : ''}`}>
                  {formData.images && formData.images.length > 0 ? (
                    <img src={formData.images[selectedImageIndex]} alt="preview" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-8 w-8" />
                      <p className="mt-1 text-xs">Subir foto</p>
                    </div>
                  )}
                </label>
                <input id="service-images" type="file" multiple accept="image/*" onChange={handleImageAdd} className="hidden" />

                {/* Thumbnails */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    {(formData.images || []).map((img, index) => (
                      <div key={index} className="relative">
                        {index === 0 && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-[10px] bg-primary text-primary-foreground rounded px-1">Portada</span>
                        )}
                        <img
                          src={img}
                          alt={`thumb-${index}`}
                          className={`w-14 h-14 object-cover rounded cursor-pointer hover:opacity-80 transition-all ${selectedImageIndex === index ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                          onClick={() => setSelectedImageIndex(index)}
                        />
                        <button
                          type="button"
                          className="absolute -top-1 -right-1 z-10 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center hover:opacity-80"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {(formData.images?.length || 0) > 0 && (formData.images?.length || 0) < 3 && (
                      <label htmlFor="service-images" className="cursor-pointer flex items-center justify-center w-14 h-14 border-2 border-dashed rounded text-muted-foreground hover:bg-muted/50">
                        <Plus className="h-6 w-6" />
                      </label>
                    )}
                  </div>
                  {(formData.images?.length || 0) === 0 && (
                    <p className="text-xs text-muted-foreground">JPEG, PNG o WebP · Máx. 500KB por imagen</p>
                  )}
                </div>
              </div>
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
