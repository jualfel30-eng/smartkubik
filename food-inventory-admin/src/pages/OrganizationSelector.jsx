import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Plus, ChevronRight, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import SmartKubikLogoDark from '@/assets/logo-smartkubik.png';
import SmartKubikLogoLight from '@/assets/logo-smartkubik-light.png';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const businessVerticals = [
  {
    name: 'Servicios de Comida',
    value: 'FOOD_SERVICE',
    categories: ['Restaurante', 'Cafetería', 'Food Truck', 'Catering', 'Bar'],
  },
  {
    name: 'Minoristas / Distribución',
    value: 'RETAIL',
    categories: ['Supermercado', 'Tienda de Abarrotes', 'Distribuidor Mayorista', 'Mercado de Agricultores', 'Moda', 'Calzado', 'Juguetes', 'Herramientas', 'Deporte', 'Tecnología'],
  },
  {
    name: 'Servicios',
    value: 'SERVICES',
    categories: ['Hotel', 'Hospital', 'Escuela', 'Oficina Corporativa'],
  },
  {
    name: 'Logística',
    value: 'LOGISTICS',
    categories: ['Almacén', 'Centro de Distribución', 'Transporte Refrigerado'],
  },
  {
    name: 'Mixta (Multi-vertical)',
    value: 'HYBRID',
    categories: [
      'Hotel con Restaurante',
      'Hotel con Tienda Boutique',
      'Restaurante + Tienda',
      'Resort Todo Incluido',
      'Centro Comercial Gastronómico',
    ],
  },
];

export default function OrganizationSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, memberships, selectTenant, logout, activeMembershipId, tenant, getLastLocation, token, refreshSession } = useAuth();
  const { theme } = useTheme();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creationType, setCreationType] = useState('new-business'); // 'new-business' or 'new-location'
  const [selectedParentOrg, setSelectedParentOrg] = useState('');
  const [shouldCloneData, setShouldCloneData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    vertical: '',
    businessType: '',
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return theme === 'dark' ? 'dark' : 'light';
  });

  // Auto-select tenant if there's one saved and we don't have a tenant selected yet
  useEffect(() => {
    const autoSelectTenant = async () => {
      // Solo auto-seleccionar si NO hay tenant y hay un membership guardado
      if (activeMembershipId && memberships.length > 0 && !tenant && !isAutoSelecting) {
        const savedMembership = memberships.find(m => m.id === activeMembershipId);

        if (savedMembership) {
          console.log('Auto-selecting previously selected organization:', savedMembership.tenant?.name);
          setIsAutoSelecting(true);
          try {
            await selectTenant(activeMembershipId, { rememberAsDefault: true });

            // Prioridad 1: Si venimos de una ruta protegida (ej: refresh en /inventory-management)
            const fromRoute = location.state?.from;
            if (fromRoute && fromRoute !== '/organizations') {
              console.log('Redirecting to original route from refresh:', fromRoute);
              navigate(fromRoute, { replace: true });
              return;
            }

            // Prioridad 2: Usar lastLocation guardado
            const lastLocation = getLastLocation();
            console.log('Last location:', lastLocation);

            // Solo redirigir si NO estamos en la página de organizaciones
            // Esto permite ver "Mis Organizaciones" sin ser redirigido
            if (lastLocation !== '/organizations') {
              console.log('Redirecting to last location:', lastLocation);
              navigate(lastLocation, { replace: true });
            } else {
              console.log('Staying on organizations page (user is here intentionally)');
            }
          } catch (error) {
            console.error('Failed to auto-select tenant:', error);
            toast.error('No se pudo restaurar la organización anterior');
          } finally {
            setIsAutoSelecting(false);
          }
        }
      }
    };

    autoSelectTenant();
  }, [activeMembershipId, memberships, tenant, isAutoSelecting, selectTenant, navigate, getLastLocation, location.state]);

  const handleSelectOrganization = useCallback(async (membership) => {
    try {
      console.log('Selecting organization:', membership);
      console.log('Membership ID:', membership.id);
      await selectTenant(membership.id, { rememberAsDefault: true });
      const lastLocation = getLastLocation();
      console.log('Navigating to:', lastLocation);
      navigate(lastLocation);
    } catch (error) {
      console.error('Error selecting organization:', error);
      toast.error('No se pudo seleccionar la organización');
    }
  }, [selectTenant, getLastLocation, navigate]);

  // Auto-select if there is only one membership
  useEffect(() => {
    if (memberships.length === 1 && !activeMembershipId && !tenant && !isAutoSelecting) {
      const singleMembership = memberships[0];
      console.log('Only one membership found, auto-selecting:', singleMembership.tenant?.name);
      handleSelectOrganization(singleMembership);
    }
  }, [memberships, activeMembershipId, tenant, isAutoSelecting, handleSelectOrganization]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = (event) => setResolvedTheme(event.matches ? 'dark' : 'light');
      setResolvedTheme(media.matches ? 'dark' : 'light');
      media.addEventListener('change', updateTheme);
      return () => media.removeEventListener('change', updateTheme);
    }

    setResolvedTheme(theme);
  }, [theme]);

  // Update available categories when vertical changes
  useEffect(() => {
    if (formData.vertical) {
      const vertical = businessVerticals.find(v => v.value === formData.vertical);
      if (vertical) {
        setAvailableCategories(vertical.categories);
      } else {
        setAvailableCategories([]);
      }
    } else {
      setAvailableCategories([]);
    }
  }, [formData.vertical]);

  const logoSrc = resolvedTheme === 'dark' ? SmartKubikLogoDark : SmartKubikLogoLight;

  const handleCreateOrganization = async () => {
    setIsLoading(true);
    try {
      const tokenFromAuth = token || localStorage.getItem('accessToken');
      if (!tokenFromAuth) {
        throw new Error('No se encontró un token de autenticación. Inicia sesión nuevamente.');
      }

      const payload = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        type: creationType,
        vertical: formData.vertical,
        businessType: formData.businessType,
      };

      // Si es nueva sede y se debe clonar
      if (creationType === 'new-location' && selectedParentOrg) {
        payload.parentOrganizationId = selectedParentOrg;

        if (shouldCloneData) {
          payload.cloneData = true;
        }

        // Find parent org to inherit vertical/businessType
        const parentOrg = uniqueOrganizations.find(org => org.tenantId === selectedParentOrg);
        if (parentOrg) {
          payload.vertical = parentOrg.vertical;
          payload.businessType = parentOrg.businessType;
        }

        console.log('Creating Sede - Payload Check:', {
          parentOrg,
          vertical: payload.vertical,
          businessType: payload.businessType,
          selectedParentOrg
        });
      }

      console.log('Final Request Payload:', payload);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenFromAuth}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear organización');
      }

      await response.json(); // Parse response
      toast.success('Organización creada exitosamente');

      // Recargar memberships y seleccionar la nueva organización
      // Recargar memberships y seleccionar la nueva organización
      await refreshSession();
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Error al crear la organización');
    } finally {
      setIsLoading(false);
      setIsCreateDialogOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      vertical: '',
      businessType: '',
    });
    setCreationType('new-business');
    setSelectedParentOrg('');
    setShouldCloneData(false);
    setAvailableCategories([]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Obtener organizaciones únicas (para el select de organización padre)
  const uniqueOrganizations = memberships.reduce((acc, membership) => {
    // Robustly extract tenant ID checking all possible locations
    let tenantId = membership.tenantId;

    if (membership.tenant) {
      if (typeof membership.tenant === 'string') {
        tenantId = membership.tenant;
      } else {
        // Check for _id, id, or fallback to existing tenantId
        tenantId = membership.tenant._id || membership.tenant.id || tenantId;
      }
    }

    // Skip if no ID found
    if (!tenantId) return acc;

    // Enhance data with current tenant context if IDs match (fallback for incomplete membership data)
    let vertical = membership.tenant?.vertical;
    let businessType = membership.tenant?.businessType;
    let name = membership.tenant?.name;

    // Check against active tenant to backfill missing data
    if (tenant && (tenant.id === tenantId || tenant._id === tenantId)) {
      vertical = vertical || tenant.vertical;
      businessType = businessType || tenant.businessType;
      name = name || tenant.name;
    }

    const existingOrg = acc.find(org => org.tenantId === tenantId);
    if (!existingOrg) {
      acc.push({
        tenantId: tenantId,
        name: name || 'Sin nombre',
        vertical: vertical || '',
        businessType: businessType || '',
      });
    }
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logoSrc} alt="Smart Kubik" className="h-[30px] w-auto" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-semibold">Bienvenido, {user?.firstName || 'Usuario'}</h1>
          <p className="text-sm text-muted-foreground mt-1">Selecciona una organización para continuar</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Mis Organizaciones</h2>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Organización
            </Button>
          </div>

          {memberships.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tienes organizaciones</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crea tu primera organización para comenzar
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Organización
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {memberships.map((membership, index) => (
                <Card
                  key={membership._id || membership.id || `membership-${index}`}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleSelectOrganization(membership)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Building className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg line-clamp-2 break-words leading-tight">
                            {membership.tenant?.name || 'Sin nombre'}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {membership.role === 'owner' ? 'Propietario' :
                              membership.role === 'admin' ? 'Administrador' :
                                'Miembro'}
                          </CardDescription>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {membership.tenant?.address && (
                        <p className="truncate">{membership.tenant.address}</p>
                      )}
                      {membership.tenant?.phone && (
                        <p>{membership.tenant.phone}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Organización</DialogTitle>
            <DialogDescription>
              Elige el tipo de organización que deseas crear
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Tipo de Organización */}
            <div className="space-y-3">
              <Label>Tipo de Organización</Label>
              <RadioGroup value={creationType} onValueChange={setCreationType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new-business" id="new-business" />
                  <Label htmlFor="new-business" className="font-normal cursor-pointer">
                    Nuevo Negocio - Crear un negocio completamente nuevo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new-location" id="new-location" />
                  <Label htmlFor="new-location" className="font-normal cursor-pointer">
                    Nueva Sede - Añadir una sede a un negocio existente
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Seleccionar Organización Padre (solo para nueva sede) */}
            {creationType === 'new-location' && uniqueOrganizations.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="parent-org">Negocio Principal</Label>
                  <Select value={selectedParentOrg} onValueChange={setSelectedParentOrg}>
                    <SelectTrigger id="parent-org">
                      <SelectValue placeholder="Selecciona el negocio" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueOrganizations.map((org) => (
                        <SelectItem key={org.tenantId} value={org.tenantId}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Opción de clonar datos */}
                {selectedParentOrg && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clone-data"
                      checked={shouldCloneData}
                      onCheckedChange={setShouldCloneData}
                    />
                    <Label htmlFor="clone-data" className="font-normal cursor-pointer">
                      Clonar datos del negocio principal (productos, categorías, configuraciones)
                    </Label>
                  </div>
                )}
              </>
            )}

            {/* Formulario de Datos */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="org-name">
                  Nombre de la {creationType === 'new-location' ? 'Sede' : 'Organización'} *
                </Label>
                <Input
                  id="org-name"
                  placeholder="Ej: Sede Centro, Mi Restaurante"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Vertical de Negocio (solo para nuevo negocio) */}
              {creationType === 'new-business' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="vertical">Vertical de Negocio *</Label>
                    <Select
                      value={formData.vertical}
                      onValueChange={(value) => setFormData({ ...formData, vertical: value, businessType: '' })}
                    >
                      <SelectTrigger id="vertical">
                        <SelectValue placeholder="Seleccione una vertical" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessVerticals.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Categoría Específica */}
                  {formData.vertical && availableCategories.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Categoría Específica *</Label>
                      <Select
                        value={formData.businessType}
                        onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                      >
                        <SelectTrigger id="businessType">
                          <SelectValue placeholder="Seleccione una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="org-address">Dirección *</Label>
                <Input
                  id="org-address"
                  placeholder="Calle, Ciudad, País"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org-phone">Teléfono *</Label>
                  <Input
                    id="org-phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-email">Email *</Label>
                  <Input
                    id="org-email"
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateOrganization}
              disabled={
                isLoading ||
                !formData.name ||
                !formData.address ||
                !formData.phone ||
                !formData.email ||
                (creationType === 'new-business' && (!formData.vertical || !formData.businessType)) ||
                (creationType === 'new-location' && !selectedParentOrg)
              }
            >
              {isLoading ? 'Creando...' : 'Crear Organización'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
