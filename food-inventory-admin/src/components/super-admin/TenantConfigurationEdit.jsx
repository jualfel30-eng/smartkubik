import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Save, Settings, Shield } from 'lucide-react';
import api from '@/lib/api';

const MODULE_GROUPS = {
  core: {
    title: 'Módulos Core',
    description: 'Funcionalidades básicas disponibles para todos',
    modules: ['inventory', 'orders', 'customers', 'suppliers', 'reports', 'accounting']
  },
  food_service: {
    title: 'Restaurantes',
    description: 'Específico para negocios de comida',
    modules: ['tables', 'recipes', 'kitchenDisplay', 'menuEngineering']
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
  customers: 'Clientes',
  suppliers: 'Proveedores',
  reports: 'Reportes',
  accounting: 'Contabilidad',
  tables: 'Mesas',
  recipes: 'Recetas',
  kitchenDisplay: 'Display de Cocina',
  menuEngineering: 'Ingeniería de Menú',
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
  dispatch: 'Despacho'
};

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

  useEffect(() => {
    loadTenantConfiguration();
  }, [tenantId]);

  const loadTenantConfiguration = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/super-admin/tenants/${tenantId}/configuration`);
      const { tenant, roles, allPermissions } = response.data;

      setTenant(tenant);
      setRoles(roles);
      setAllPermissions(allPermissions);
      setEnabledModules(tenant.enabledModules || {});

      // Initialize role permissions state
      const rolePerms = {};
      roles.forEach(role => {
        rolePerms[role._id] = role.permissions.map(p => p._id || p);
      });
      setRolePermissions(rolePerms);
    } catch (error) {
      console.error('Error loading tenant configuration:', error);
      toast.error('Error al cargar la configuración del tenant');
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
      console.error('Error saving configuration:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by module
  const permissionsByModule = allPermissions.reduce((acc, permission) => {
    const module = permission.module || 'other';
    if (!acc[module]) acc[module] = [];
    acc[module].push(permission);
    return acc;
  }, {});

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
    </div>
  );
}
