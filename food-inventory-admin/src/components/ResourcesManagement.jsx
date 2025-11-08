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
  User,
  Building,
  Wrench,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react';

const DEFAULT_SCHEDULE = {
  monday: { available: true, start: '09:00', end: '18:00' },
  tuesday: { available: true, start: '09:00', end: '18:00' },
  wednesday: { available: true, start: '09:00', end: '18:00' },
  thursday: { available: true, start: '09:00', end: '18:00' },
  friday: { available: true, start: '09:00', end: '18:00' },
  saturday: { available: false, start: '09:00', end: '13:00' },
  sunday: { available: false, start: '09:00', end: '13:00' },
};

const DEFAULT_BASE_RATE = {
  amount: '',
  currency: 'USD',
  description: '',
};

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'MXN', 'COP', 'VES', 'VEF'];

const PROMOTION_TYPES = [
  { value: 'percentage', label: 'Porcentaje (%)' },
  { value: 'fixed', label: 'Monto fijo' },
];

const createTempId = () => Math.random().toString(36).slice(2, 10);

const buildEmptyResourceForm = () => ({
  name: '',
  type: 'person',
  description: '',
  email: '',
  phone: '',
  status: 'active',
  color: '#10B981',
  schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)),
  specializations: [],
  capacity: 1,
  baseRate: { ...DEFAULT_BASE_RATE },
  pricing: [],
  promotions: [],
  allowedServiceIds: [],
});

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

const WEEKDAY_KEYS = DAYS.map((day) => day.key);

function ResourcesManagement() {
  const hasAccess = useModuleAccess('appointments');
  const { isResourceCentric, isFlexible, businessType } = useBusinessModel();
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState(buildEmptyResourceForm());
  const [loading, setLoading] = useState(false);

  if (!hasAccess) {
    return <ModuleAccessDenied moduleName="appointments" />;
  }

  const loadResources = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/resources?includePricing=true');
      setResources(data);
    } catch (error) {
      console.error('Error loading resources:', error);
      alert('Error al cargar los recursos');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const data = await fetchApi('/services');
      setServices(data);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  useEffect(() => {
    loadResources();
    loadServices();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, searchTerm, statusFilter, typeFilter]);

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
    setFormData(buildEmptyResourceForm());
    setIsDialogOpen(true);
  };

  const openEditDialog = (resource) => {
    setEditingResource(resource);
    const schedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
    if (resource.schedule) {
      Object.keys(schedule).forEach((dayKey) => {
        if (resource.schedule[dayKey]) {
          schedule[dayKey] = {
            ...schedule[dayKey],
            ...resource.schedule[dayKey],
          };
        }
      });
    }

    setFormData({
      name: resource.name,
      type: resource.type,
      description: resource.description || '',
      email: resource.email || '',
      phone: resource.phone || '',
      status: resource.status,
      color: resource.color || '#10B981',
      schedule,
      specializations: resource.specializations || [],
      capacity: resource.capacity || 1,
      allowedServiceIds: resource.allowedServiceIds || [],
      baseRate: resource.baseRate
        ? {
            amount:
              resource.baseRate.amount !== undefined
                ? resource.baseRate.amount.toString()
                : '',
            currency: resource.baseRate.currency || 'USD',
            description: resource.baseRate.description || '',
          }
        : { ...DEFAULT_BASE_RATE },
      pricing: Array.isArray(resource.pricing)
        ? resource.pricing.map((tier) => ({
            id: tier._id || createTempId(),
            label: tier.label || '',
            amount: tier.amount !== undefined ? tier.amount.toString() : '',
            currency: tier.currency || resource.baseRate?.currency || 'USD',
            startDate: tier.startDate ? tier.startDate.slice(0, 10) : '',
            endDate: tier.endDate ? tier.endDate.slice(0, 10) : '',
            daysOfWeek: Array.isArray(tier.daysOfWeek) ? tier.daysOfWeek : [],
            minNights:
              tier.minNights !== undefined ? tier.minNights.toString() : '',
            maxNights:
              tier.maxNights !== undefined ? tier.maxNights.toString() : '',
            isDefault: Boolean(tier.isDefault),
            channel: tier.channel || '',
          }))
        : [],
      promotions: Array.isArray(resource.promotions)
        ? resource.promotions.map((promo) => ({
            id: promo._id || createTempId(),
            name: promo.name || '',
            type: promo.type || 'percentage',
            value: promo.value !== undefined ? promo.value.toString() : '',
            description: promo.description || '',
            startDate: promo.startDate ? promo.startDate.slice(0, 10) : '',
            endDate: promo.endDate ? promo.endDate.slice(0, 10) : '',
            minNights:
              promo.minNights !== undefined ? promo.minNights.toString() : '',
            maxNights:
              promo.maxNights !== undefined ? promo.maxNights.toString() : '',
            bookingWindowStart: promo.bookingWindowStart
              ? promo.bookingWindowStart.slice(0, 10)
              : '',
            bookingWindowEnd: promo.bookingWindowEnd
              ? promo.bookingWindowEnd.slice(0, 10)
              : '',
            stackable: Boolean(promo.stackable),
            code: promo.code || '',
          }))
        : [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const normalizedBaseRate =
        formData.baseRate && formData.baseRate.amount !== ''
          ? {
              amount: Number(formData.baseRate.amount),
              currency: formData.baseRate.currency || 'USD',
              description: formData.baseRate.description?.trim() || undefined,
            }
          : null;

      const normalizedPricing = (formData.pricing || [])
        .map((tier) => {
          const amountValue = tier.amount === '' ? NaN : Number(tier.amount);
          if (!tier.label?.trim() || Number.isNaN(amountValue)) {
            return null;
          }

          const cleanedDays = Array.isArray(tier.daysOfWeek)
            ? tier.daysOfWeek.filter((day) => WEEKDAY_KEYS.includes(day))
            : [];

          return {
            label: tier.label.trim(),
            amount: amountValue,
            currency: tier.currency || normalizedBaseRate?.currency || 'USD',
            startDate: tier.startDate || undefined,
            endDate: tier.endDate || undefined,
            daysOfWeek: cleanedDays.length ? cleanedDays : undefined,
            minNights:
              tier.minNights !== '' && tier.minNights !== undefined
                ? Number(tier.minNights)
                : undefined,
            maxNights:
              tier.maxNights !== '' && tier.maxNights !== undefined
                ? Number(tier.maxNights)
                : undefined,
            isDefault: Boolean(tier.isDefault),
            channel: tier.channel?.trim() || undefined,
          };
        })
        .filter(Boolean);

      const normalizedPromotions = (formData.promotions || [])
        .map((promo) => {
          const valueNumber = promo.value === '' ? NaN : Number(promo.value);
          if (!promo.name?.trim() || Number.isNaN(valueNumber)) {
            return null;
          }

          return {
            name: promo.name.trim(),
            type: promo.type || 'percentage',
            value: valueNumber,
            description: promo.description?.trim() || undefined,
            startDate: promo.startDate || undefined,
            endDate: promo.endDate || undefined,
            minNights:
              promo.minNights !== '' && promo.minNights !== undefined
                ? Number(promo.minNights)
                : undefined,
            maxNights:
              promo.maxNights !== '' && promo.maxNights !== undefined
                ? Number(promo.maxNights)
                : undefined,
            bookingWindowStart: promo.bookingWindowStart || undefined,
            bookingWindowEnd: promo.bookingWindowEnd || undefined,
            stackable: Boolean(promo.stackable),
            code: promo.code?.trim() || undefined,
          };
        })
        .filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        status: formData.status,
        color: formData.color,
        schedule: formData.schedule,
        specializations: Array.isArray(formData.specializations)
          ? formData.specializations.filter(Boolean)
          : [],
        capacity: Number(formData.capacity) || 1,
        allowedServiceIds: Array.isArray(formData.allowedServiceIds)
          ? formData.allowedServiceIds.filter(Boolean)
          : [],
        baseRate: normalizedBaseRate,
        pricing: normalizedPricing,
        promotions: normalizedPromotions,
      };

      if (!payload.baseRate && !editingResource) {
        delete payload.baseRate;
      }

      if (editingResource) {
        await fetchApi(`/resources/${editingResource._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/resources', {
          method: 'POST',
          body: JSON.stringify(payload),
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

  const formatCurrency = (amount, currency = 'USD') => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      return null;
    }
    try {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const handleBaseRateChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      baseRate: {
        ...prev.baseRate,
        [field]: value,
      },
    }));
  };

  const addPricingTier = () => {
    setFormData((prev) => ({
      ...prev,
      pricing: [
        ...prev.pricing,
        {
          id: createTempId(),
          label: '',
          amount: '',
          currency: prev.baseRate?.currency || 'USD',
          startDate: '',
          endDate: '',
          daysOfWeek: [],
          minNights: '',
          maxNights: '',
          isDefault: prev.pricing.length === 0,
          channel: '',
        },
      ],
    }));
  };

  const updatePricingTier = (index, field, value) => {
    setFormData((prev) => {
      const updatedPricing = prev.pricing.map((tier, idx) =>
        idx === index
          ? {
              ...tier,
              [field]: value,
            }
          : tier,
      );

      if (field === 'isDefault' && (value === true || value === 'indeterminate')) {
        return {
          ...prev,
          pricing: updatedPricing.map((tier, idx) => ({
            ...tier,
            isDefault: idx === index,
          })),
        };
      }

      return {
        ...prev,
        pricing: updatedPricing,
      };
    });
  };

  const togglePricingDay = (index, dayKey, checked) => {
    const isChecked = checked === true || checked === 'indeterminate';
    setFormData((prev) => ({
      ...prev,
      pricing: prev.pricing.map((tier, idx) => {
        if (idx !== index) {
          return tier;
        }
        const nextDays = new Set(tier.daysOfWeek || []);
        if (isChecked) {
          nextDays.add(dayKey);
        } else {
          nextDays.delete(dayKey);
        }
        return {
          ...tier,
          daysOfWeek: Array.from(nextDays),
        };
      }),
    }));
  };

  const removePricingTier = (index) => {
    setFormData((prev) => ({
      ...prev,
      pricing: prev.pricing.filter((_, idx) => idx !== index),
    }));
  };

  const addPromotion = () => {
    setFormData((prev) => ({
      ...prev,
      promotions: [
        ...prev.promotions,
        {
          id: createTempId(),
          name: '',
          type: 'percentage',
          value: '',
          description: '',
          startDate: '',
          endDate: '',
          minNights: '',
          maxNights: '',
          bookingWindowStart: '',
          bookingWindowEnd: '',
          stackable: false,
          code: '',
        },
      ],
    }));
  };

  const updatePromotion = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      promotions: prev.promotions.map((promo, idx) =>
        idx === index
          ? {
              ...promo,
              [field]: value,
            }
          : promo,
      ),
    }));
  };

  const removePromotion = (index) => {
    setFormData((prev) => ({
      ...prev,
      promotions: prev.promotions.filter((_, idx) => idx !== index),
    }));
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
                <TableHead>Tarifas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
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
                      <TableCell>
                        {resource.baseRate && typeof resource.baseRate.amount === 'number' ? (
                          <div className="space-y-1">
                            <span className="font-medium">
                              {formatCurrency(
                                resource.baseRate.amount,
                                resource.baseRate.currency || 'USD',
                              )}
                            </span>
                            {resource.baseRate.description && (
                              <span className="text-xs text-muted-foreground">
                                {resource.baseRate.description}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin tarifa base</span>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {resource.pricing?.length ? (
                            <Badge variant="outline">
                              {resource.pricing.length} {resource.pricing.length === 1 ? 'tarifa' : 'tarifas'}
                            </Badge>
                          ) : null}
                          {resource.promotions?.length ? (
                            <Badge variant="outline">
                              {resource.promotions.length} {resource.promotions.length === 1 ? 'promo' : 'promos'}
                            </Badge>
                          ) : null}
                          {!resource.pricing?.length && !resource.promotions?.length && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Sin ajustes
                            </Badge>
                          )}
                        </div>
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

            {/* Allowed Services */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Servicios que puede realizar</h3>
                <p className="text-sm text-muted-foreground">
                  Selecciona los servicios que este recurso puede realizar
                </p>
              </div>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay servicios disponibles. Crea servicios primero para poder asignarlos.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 border rounded-lg bg-gray-50 dark:bg-slate-900/40 max-h-60 overflow-y-auto">
                  {services.map((service) => (
                    <div
                      key={service._id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      <Checkbox
                        id={`service-${service._id}`}
                        checked={formData.allowedServiceIds.includes(service._id)}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true || checked === 'indeterminate';
                          setFormData((prev) => ({
                            ...prev,
                            allowedServiceIds: isChecked
                              ? [...prev.allowedServiceIds, service._id]
                              : prev.allowedServiceIds.filter((id) => id !== service._id),
                          }));
                        }}
                      />
                      <Label
                        htmlFor={`service-${service._id}`}
                        className="flex items-center gap-2 flex-1 cursor-pointer font-normal"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: service.color || '#3B82F6' }}
                        />
                        <span>{service.name}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {service.category}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              {isResourceCentric || isFlexible ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded">
                      <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-1">
                        {getBusinessContextText(businessType, 'resource').title}
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {getBusinessContextText(businessType, 'resource').description}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-green-200 dark:border-green-800 rounded-lg bg-white dark:bg-gray-950">
                    <div className="md:col-span-3">
                      <Label htmlFor="base-rate-amount" className="text-green-900 dark:text-green-100">
                        Precio al cliente ($)
                      </Label>
                      <Input
                        id="base-rate-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.baseRate.amount}
                        onChange={(e) => handleBaseRateChange('amount', e.target.value)}
                        placeholder="Ej: 150.00"
                      />
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {getBusinessContextText(businessType, 'resource').example}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="base-rate-currency">Moneda</Label>
                      <Select
                        value={formData.baseRate.currency}
                        onValueChange={(value) => handleBaseRateChange('currency', value)}
                      >
                        <SelectTrigger id="base-rate-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(formData.baseRate.currency && !CURRENCY_OPTIONS.includes(formData.baseRate.currency)
                            ? [formData.baseRate.currency, ...CURRENCY_OPTIONS]
                            : CURRENCY_OPTIONS
                          ).map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-6">
                      <Label htmlFor="base-rate-description">Descripción (opcional)</Label>
                      <Input
                        id="base-rate-description"
                        value={formData.baseRate.description}
                        onChange={(e) => handleBaseRateChange('description', e.target.value)}
                        placeholder="Ej: Tarifa por noche, incluye desayuno"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {getBusinessContextText(businessType, 'resource').title}
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {getBusinessContextText(businessType, 'resource').description}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg bg-white dark:bg-gray-950">
                    <div className="md:col-span-3">
                      <Label htmlFor="base-rate-amount">Costo por hora/servicio ($)</Label>
                      <Input
                        id="base-rate-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.baseRate.amount}
                        onChange={(e) => handleBaseRateChange('amount', e.target.value)}
                        placeholder="Ej: 15.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {getBusinessContextText(businessType, 'resource').example}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="base-rate-currency">Moneda</Label>
                      <Select
                        value={formData.baseRate.currency}
                        onValueChange={(value) => handleBaseRateChange('currency', value)}
                      >
                        <SelectTrigger id="base-rate-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(formData.baseRate.currency && !CURRENCY_OPTIONS.includes(formData.baseRate.currency)
                            ? [formData.baseRate.currency, ...CURRENCY_OPTIONS]
                            : CURRENCY_OPTIONS
                          ).map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-6">
                      <Label htmlFor="base-rate-description">Nota interna (opcional)</Label>
                      <Input
                        id="base-rate-description"
                        value={formData.baseRate.description}
                        onChange={(e) => handleBaseRateChange('description', e.target.value)}
                        placeholder="Ej: Incluye comisiones y beneficios"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Tarifas por temporada</h3>
                  <p className="text-sm text-muted-foreground">
                    Define montos alternativos para temporadas, canales o condiciones específicas.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPricingTier}>
                  Agregar tarifa
                </Button>
              </div>

              {formData.pricing.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No has configurado tarifas adicionales para este recurso.
                </p>
              ) : (
                <div className="space-y-4">
                  {formData.pricing.map((tier, index) => (
                    <div key={tier.id || index} className="space-y-4 rounded-lg border p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="flex-1 grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Nombre</Label>
                            <Input
                              value={tier.label}
                              onChange={(e) => updatePricingTier(index, 'label', e.target.value)}
                              placeholder="Ej: Temporada alta"
                            />
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            <div className="col-span-4">
                              <Label>Monto</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={tier.amount}
                                onChange={(e) => updatePricingTier(index, 'amount', e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Moneda</Label>
                              <Select
                                value={tier.currency}
                                onValueChange={(value) => updatePricingTier(index, 'currency', value)}
                              >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(tier.currency && !CURRENCY_OPTIONS.includes(tier.currency)
                                  ? [tier.currency, ...CURRENCY_OPTIONS]
                                  : CURRENCY_OPTIONS
                                ).map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => removePricingTier(index)}
                        >
                          Eliminar
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Desde</Label>
                          <Input
                            type="date"
                            value={tier.startDate}
                            onChange={(e) => updatePricingTier(index, 'startDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Hasta</Label>
                          <Input
                            type="date"
                            value={tier.endDate}
                            onChange={(e) => updatePricingTier(index, 'endDate', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Días de la semana</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {DAYS.map((day) => (
                            <div
                              key={`${tier.id}-${day.key}`}
                              className="flex items-center gap-2 rounded border px-3 py-1 bg-white dark:bg-slate-950/40"
                            >
                              <Checkbox
                                checked={tier.daysOfWeek?.includes(day.key)}
                                onCheckedChange={(checked) => togglePricingDay(index, day.key, checked)}
                                id={`pricing-${tier.id}-${day.key}`}
                              />
                              <Label htmlFor={`pricing-${tier.id}-${day.key}`} className="text-xs font-normal">
                                {day.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label>Estadía mínima (noches)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={tier.minNights}
                            onChange={(e) => updatePricingTier(index, 'minNights', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Estadía máxima (noches)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={tier.maxNights}
                            onChange={(e) => updatePricingTier(index, 'maxNights', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Canal</Label>
                          <Input
                            value={tier.channel}
                            onChange={(e) => updatePricingTier(index, 'channel', e.target.value)}
                            placeholder="Website, OTA, corporativo..."
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`pricing-default-${tier.id}`}
                          checked={Boolean(tier.isDefault)}
                          onCheckedChange={(checked) =>
                            updatePricingTier(index, 'isDefault', checked === true)
                          }
                        />
                        <Label htmlFor={`pricing-default-${tier.id}`} className="text-sm font-normal">
                          Marcar como tarifa por defecto
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Promotions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Promociones</h3>
                  <p className="text-sm text-muted-foreground">
                    Aplica descuentos fijos o porcentuales con ventanas de reserva específicas.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPromotion}>
                  Agregar promoción
                </Button>
              </div>

              {formData.promotions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No has configurado promociones para este recurso.</p>
              ) : (
                <div className="space-y-4">
                  {formData.promotions.map((promo, index) => (
                    <div key={promo.id || index} className="space-y-4 rounded-lg border p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="flex-1 grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Nombre</Label>
                            <Input
                              value={promo.name}
                              onChange={(e) => updatePromotion(index, 'name', e.target.value)}
                              placeholder="Ej: Promo fin de semana"
                            />
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            <div className="col-span-3">
                              <Label>Tipo</Label>
                              <Select
                                value={promo.type}
                                onValueChange={(value) => updatePromotion(index, 'type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PROMOTION_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-3">
                              <Label>Valor</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={promo.value}
                                onChange={(e) => updatePromotion(index, 'value', e.target.value)}
                                placeholder={promo.type === 'fixed' ? 'Monto' : '%'}
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => removePromotion(index)}
                        >
                          Eliminar
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Desde</Label>
                          <Input
                            type="date"
                            value={promo.startDate}
                            onChange={(e) => updatePromotion(index, 'startDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Hasta</Label>
                          <Input
                            type="date"
                            value={promo.endDate}
                            onChange={(e) => updatePromotion(index, 'endDate', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Ventana de reserva (inicio)</Label>
                          <Input
                            type="date"
                            value={promo.bookingWindowStart}
                            onChange={(e) => updatePromotion(index, 'bookingWindowStart', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Ventana de reserva (fin)</Label>
                          <Input
                            type="date"
                            value={promo.bookingWindowEnd}
                            onChange={(e) => updatePromotion(index, 'bookingWindowEnd', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label>Estadía mínima</Label>
                          <Input
                            type="number"
                            min="1"
                            value={promo.minNights}
                            onChange={(e) => updatePromotion(index, 'minNights', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Estadía máxima</Label>
                          <Input
                            type="number"
                            min="1"
                            value={promo.maxNights}
                            onChange={(e) => updatePromotion(index, 'maxNights', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Código</Label>
                          <Input
                            value={promo.code}
                            onChange={(e) => updatePromotion(index, 'code', e.target.value)}
                            placeholder="Opcional"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`promo-stackable-${promo.id}`}
                          checked={Boolean(promo.stackable)}
                          onCheckedChange={(checked) =>
                            updatePromotion(index, 'stackable', checked === true)
                          }
                        />
                        <Label htmlFor={`promo-stackable-${promo.id}`} className="text-sm font-normal">
                          Permitir combinar con otras promociones
                        </Label>
                      </div>

                      <div>
                        <Label>Descripción</Label>
                        <Textarea
                          value={promo.description}
                          onChange={(e) => updatePromotion(index, 'description', e.target.value)}
                          rows={2}
                          placeholder="Condiciones, bundle aplicable, etc."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
