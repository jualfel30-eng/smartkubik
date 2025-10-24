import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, Settings, Shield, Sparkles, Building2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createScopedLogger } from '@/lib/logger';

const logger = createScopedLogger('tenant-configuration-edit');

const api = {
  get: (url) => fetchApi(url, { method: 'GET' }),
  post: (url, data) => fetchApi(url, { method: 'POST', body: JSON.stringify(data) }),
  patch: (url, data) => fetchApi(url, { method: 'PATCH', body: JSON.stringify(data) }),
  put: (url, data) => fetchApi(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (url) => fetchApi(url, { method: 'DELETE' }),
};

const BUSINESS_VERTICALS = {
  FOOD_SERVICE: {
    label: 'Restaurantes y Servicios de Comida',
    description: 'Restaurantes, cafeterías, catering, food trucks',
    icon: '🍽️',
    recommendedModules: ['restaurant', 'tables', 'kitchenDisplay', 'menuEngineering', 'orders', 'inventory', 'customers']
  },
  RETAIL: {
    label: 'Retail / Tiendas',
    description: 'Tiendas minoristas, supermercados, comercios',
    icon: '🏪',
    recommendedModules: ['pos', 'variants', 'ecommerce', 'inventory', 'orders', 'customers']
  },
  SERVICES: {
    label: 'Servicios Profesionales',
    description: 'Salones de belleza, spas, consultorios, talleres',
    icon: '💼',
    recommendedModules: ['appointments', 'resources', 'booking', 'servicePackages', 'customers']
  },
  LOGISTICS: {
    label: 'Logística y Distribución',
    description: 'Empresas de transporte, distribuidoras, almacenes',
    icon: '🚚',
    recommendedModules: ['shipments', 'tracking', 'routes', 'fleet', 'warehousing', 'dispatch', 'inventory']
  },
  MIXED: {
    label: 'Mixto / Personalizado',
    description: 'Combinación de múltiples verticales',
    icon: '🔧',
    recommendedModules: []
  }
};

const MODULE_GROUPS = {
  core: {
    title: 'Módulos Core',
    description: 'Funcionalidades básicas disponibles para todos',
    modules: ['inventory', 'orders', 'customers', 'suppliers', 'reports', 'accounting', 'bankAccounts']
  },
  communication: {
    title: 'Comunicación',
    description: 'Módulos para la interacción con clientes',
    modules: ['chat']
  },
  food_service: {
    title: 'Restaurantes',
    description: 'Específico para negocios de comida',
    modules: ['restaurant', 'tables', 'recipes', 'kitchenDisplay', 'menuEngineering']
  },
  retail: {
    title: 'Retail',
    description: 'Para tiendas y comercios',
    modules: ['pos', 'variants', 'ecommerce', 'loyaltyProgram']
  },
  services: {
    title: 'Servicios',
    description: 'Para negocios de servicios',
    modules: ['appointments', 'resources', 'booking', 'servicePackages']
  },
  logistics: {
    title: 'Logística',
    description: 'Para empresas de transporte y distribución',
    modules: ['shipments', 'tracking', 'routes', 'fleet', 'warehousing', 'dispatch']
  }
};

const MODULE_LABELS = {
  inventory: 'Inventario',
  orders: 'Órdenes',
  orders_write: 'Órdenes (escritura)',
  customers: 'Clientes',
  suppliers: 'Proveedores',
  reports: 'Reportes',
  accounting: 'Contabilidad',
  bankAccounts: 'Cuentas Bancarias',
  tables: 'Mesas',
  recipes: 'Recetas',
  kitchenDisplay: 'Display de Cocina',
  menuEngineering: 'Ingeniería de Menú',
  restaurant: 'Suite de Restaurante',
  pos: 'Punto de Venta',
  variants: 'Variantes',
  ecommerce: 'E-commerce',
  loyaltyProgram: 'Programa de Lealtad',
  appointments: 'Citas',
  resources: 'Recursos',
  booking: 'Reservas',
  servicePackages: 'Paquetes de Servicio',
  shipments: 'Envíos',
  tracking: 'Rastreo',
  routes: 'Rutas',
  fleet: 'Flota',
  warehousing: 'Almacenamiento',
  dispatch: 'Despacho',
  chat: 'WhatsApp Chat'
};

const formatDateTime = (isoString) => {
  if (!isoString) return null;
  const parsedDate = new Date(isoString);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
};

const describeTimeUntil = (targetTimestamp, ttlMs) => {
  const reference =
    typeof targetTimestamp === 'number'
      ? targetTimestamp
      : typeof ttlMs === 'number'
      ? Date.now() + ttlMs
      : null;

  if (!reference) {
    return null;
  }

  const remaining = reference - Date.now();
  if (remaining <= 0) {
    return 'Expiró; se recalculará en el próximo acceso';
  }

  if (remaining >= 60000) {
    const minutes = Math.ceil(remaining / 60000);
    return `aprox. ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const seconds = Math.max(5, Math.ceil(remaining / 1000 / 5) * 5);
  return `aprox. ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
};

const RESTAURANT_MODULES_PRESET = [
  'restaurant',
  'tables',
  'kitchenDisplay',
  'menuEngineering',
  'orders',
  'inventory',
  'customers',
];

const RESTAURANT_PERMISSION_NAMES = [
  'restaurant_read',
  'restaurant_write',
  'orders_create',
  'orders_read',
  'orders_update',
  'orders_write',
  'inventory_read',
  'inventory_update',
];

export default function TenantConfigurationEdit() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [enabledModules, setEnabledModules] = useState({});
  const [rolePermissions, setRolePermissions] = useState({});
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [selectedPresetRoles, setSelectedPresetRoles] = useState([]);
  const [businessVertical, setBusinessVertical] = useState('MIXED');
  const [snapshotInfo, setSnapshotInfo] = useState(null);

  useEffect(() => {
    loadTenantConfiguration();
  }, [tenantId]);

  const loadTenantConfiguration = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/super-admin/tenants/${tenantId}/configuration`);

      const { tenant, roles, allPermissions, cachedAt, metadata } = data;
      logger.debug('Loaded tenant configuration snapshot', {
        tenantId: tenant?._id || tenant?.id,
        roleCount: roles.length,
        permissionCount: allPermissions.length,
        cachedAt,
        expiresAt: metadata?.expiresAt ?? null,
      });

      setTenant(tenant);
      setRoles(roles);
      setSelectedPresetRoles(roles.map((role) => role._id));
      setAllPermissions(allPermissions);
      setEnabledModules(tenant.enabledModules || {});
      setBusinessVertical(tenant.vertical || 'MIXED');
      setSnapshotInfo({
        cachedAt: cachedAt ?? null,
        expiresAt: metadata?.expiresAt ?? null,
        ttlMs: metadata?.ttlMs ?? null,
      });

      // Initialize role permissions state
      const rolePerms = {};
      roles.forEach(role => {
        rolePerms[role._id] = role.permissions.map(p => p._id || p);
      });
      logger.debug('Initialized role permissions map', { roleCount: Object.keys(rolePerms).length });
      setRolePermissions(rolePerms);
    } catch (error) {
      logger.error('Error loading tenant configuration', error);
      toast.error('Error al cargar la configuración del tenant');
      setSnapshotInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = (moduleName) => {
    setEnabledModules(prev => ({
      ...prev,
      [moduleName]: !prev[moduleName]
    }));
  };

  const handlePermissionToggle = (roleId, permissionId) => {
    setRolePermissions(prev => {
      const currentPerms = prev[roleId] || [];
      const hasPermission = currentPerms.includes(permissionId);

      return {
        ...prev,
        [roleId]: hasPermission
          ? currentPerms.filter(p => p !== permissionId)
          : [...currentPerms, permissionId]
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update business vertical
      await api.patch(`/super-admin/tenants/${tenantId}`, {
        vertical: businessVertical
      });

      // Update enabled modules
      await api.patch(`/super-admin/tenants/${tenantId}/modules`, {
        enabledModules
      });

      // Update role permissions
      for (const role of roles) {
        await api.patch(`/super-admin/roles/${role._id}/permissions`, {
          permissionIds: rolePermissions[role._id] || []
        });
      }

      toast.success('Configuración guardada exitosamente');
      navigate('/super-admin/tenants');
    } catch (error) {
      logger.error('Error saving configuration', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by module (or category for legacy permissions)
  const permissionsByModule = allPermissions.reduce((acc, permission) => {
    const module = permission.module || permission.category || 'other';
    if (!acc[module]) acc[module] = [];
    acc[module].push(permission);
    return acc;
  }, {});

  logger.debug('Grouped permissions by module', { moduleGroups: Object.keys(permissionsByModule).length, roleCount: roles.length });

  const permissionIdByName = useMemo(() => {
    const map = new Map();
    allPermissions.forEach((permission) => {
      map.set(permission.name, permission._id);
    });
    return map;
  }, [allPermissions]);

  const togglePresetRole = (roleId) => {
    setSelectedPresetRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const formattedCacheAt = snapshotInfo?.cachedAt
    ? formatDateTime(snapshotInfo.cachedAt)
    : null;
  const cacheRefreshLabel = snapshotInfo
    ? describeTimeUntil(snapshotInfo.expiresAt, snapshotInfo.ttlMs)
    : null;

  const applyRestaurantPreset = () => {
    if (selectedPresetRoles.length === 0) {
      toast.error('Selecciona al menos un rol para aplicar el preset.');
      return;
    }

    setEnabledModules((prev) => {
      const updated = { ...prev };
      RESTAURANT_MODULES_PRESET.forEach((module) => {
        updated[module] = true;
      });
      return updated;
    });

    const missingPermissions = new Set();
    const updatedRolePermissions = { ...rolePermissions };

    selectedPresetRoles.forEach((roleId) => {
      const currentPermissions = new Set(updatedRolePermissions[roleId] || []);
      RESTAURANT_PERMISSION_NAMES.forEach((permissionName) => {
        const permissionId = permissionIdByName.get(permissionName);
        if (permissionId) {
          currentPermissions.add(permissionId);
        } else {
          missingPermissions.add(permissionName);
        }
      });
      updatedRolePermissions[roleId] = Array.from(currentPermissions);
    });

    setRolePermissions(updatedRolePermissions);
    setPresetDialogOpen(false);

    if (missingPermissions.size > 0) {
      toast.warning(
        `No se encontraron los siguientes permisos en el sistema: ${Array.from(
          missingPermissions
        ).join(', ')}. Ejecuta "npm run seed:permissions" para registrarlos.`
      );
    } else {
      toast.success('Preset de restaurante aplicado. Recuerda guardar los cambios.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/tenants')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Configuración de Tenant</h1>
            <p className="text-muted-foreground">
              {tenant?.name} ({tenant?.code})
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      {snapshotInfo?.cachedAt && (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/60 p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="space-y-1 text-muted-foreground">
            {formattedCacheAt && (
              <p>
                Configuración generada el{' '}
                <span className="font-medium text-foreground">{formattedCacheAt}</span>.
              </p>
            )}
            {cacheRefreshLabel && (
              cacheRefreshLabel.startsWith('Expiró') ? (
                <p className="text-xs">{cacheRefreshLabel}</p>
              ) : (
                <p className="text-xs">
                  Se actualizará automáticamente {cacheRefreshLabel}.
                </p>
              )
            )}
          </div>
        </div>
      )}

      {/* Business Vertical Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Vertical de Negocio</CardTitle>
          </div>
          <CardDescription>
            Define el tipo de negocio para adaptar la experiencia y las características disponibles.
            Solo el Super Admin puede modificar esto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="business-vertical">Tipo de Negocio</Label>
              <Select value={businessVertical} onValueChange={setBusinessVertical}>
                <SelectTrigger id="business-vertical" className="w-full">
                  <SelectValue placeholder="Seleccionar vertical" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BUSINESS_VERTICALS).map(([key, vertical]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{vertical.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">{vertical.label}</span>
                          <span className="text-xs text-muted-foreground">{vertical.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {businessVertical && BUSINESS_VERTICALS[businessVertical] && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Módulos recomendados para esta vertical:</p>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_VERTICALS[businessVertical].recommendedModules.map((module) => (
                    <Badge key={module} variant={enabledModules[module] ? "default" : "outline"}>
                      {MODULE_LABELS[module] || module}
                    </Badge>
                  ))}
                </div>
                {BUSINESS_VERTICALS[businessVertical].recommendedModules.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Los módulos resaltados están habilitados. Puedes activar/desactivar módulos individualmente abajo.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <CardTitle>Acciones rápidas</CardTitle>
          </div>
          <CardDescription>
            Usa presets para habilitar módulos y permisos recomendados según la vertical.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-muted-foreground max-w-2xl">
            <p className="font-medium text-foreground">Vertical restaurante</p>
            <p>
              Activa mesas, KDS y asigna permisos básicos (<code>restaurant_read</code>,{' '}
              <code>restaurant_write</code>, etc.) a los roles seleccionados. Ideal para probar el
              flujo completo de pedidos con cocina.
            </p>
          </div>
          <Button onClick={() => setPresetDialogOpen(true)}>Activar vertical restaurante</Button>
        </CardContent>
      </Card>

      {/* Modules Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Módulos Habilitados</CardTitle>
          </div>
          <CardDescription>
            Selecciona qué módulos estarán disponibles para este tenant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(MODULE_GROUPS).map(([groupKey, group]) => (
            <div key={groupKey}>
              <div className="mb-3">
                <h3 className="text-lg font-semibold">{group.title}</h3>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.modules.map(moduleName => (
                  <div key={moduleName} className="flex items-center space-x-2">
                    <Checkbox
                      id={`module-${moduleName}`}
                      checked={enabledModules[moduleName] || false}
                      onCheckedChange={() => handleModuleToggle(moduleName)}
                    />
                    <Label
                      htmlFor={`module-${moduleName}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {MODULE_LABELS[moduleName] || moduleName}
                    </Label>
                  </div>
                ))}
              </div>
              {groupKey !== 'logistics' && <Separator className="mt-6" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Permissions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Permisos por Rol</CardTitle>
          </div>
          <CardDescription>
            Configura qué permisos tiene cada rol en este tenant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {roles.map(role => (
            <div key={role._id}>
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {role.name}
                  <Badge variant="outline">{rolePermissions[role._id]?.length || 0} permisos</Badge>
                </h3>
              </div>

              {/* Group permissions by module */}
              <div className="space-y-4">
                {Object.entries(permissionsByModule).map(([module, permissions]) => (
                  <div key={module}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                      {module}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-4">
                      {permissions.map(permission => (
                        <div key={permission._id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${role._id}-${permission._id}`}
                            checked={rolePermissions[role._id]?.includes(permission._id) || false}
                            onCheckedChange={() => handlePermissionToggle(role._id, permission._id)}
                          />
                          <Label
                            htmlFor={`${role._id}-${permission._id}`}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {permission.description || permission.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {role._id !== roles[roles.length - 1]._id && <Separator className="mt-6" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button (Footer) */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Activar vertical restaurante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona los roles que recibirán los permisos recomendados. Puedes ajustar módulos y
              permisos manualmente antes de guardar.
            </p>
            <div className="border rounded-md p-3 space-y-2">
              {roles.map((role) => (
                <label
                  key={role._id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/60 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedPresetRoles.includes(role._id)}
                    onCheckedChange={() => togglePresetRole(role._id)}
                  />
                  <span className="text-sm font-medium">{role.name}</span>
                </label>
              ))}
              {roles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No se encontraron roles para este tenant.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPresetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={applyRestaurantPreset}>Aplicar preset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
