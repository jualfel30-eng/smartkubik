import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { getSubsidiaries, getConsolidatedDashboard } from '@/lib/api';
import { Button } from '@/components/ui/button.jsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  MapPin,
  Building2,
  ShoppingCart,
  DollarSign,
  Package,
  ArrowRightLeft,
  Plus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SubsidiariesPanel() {
  const navigate = useNavigate();
  const { tenant, memberships, selectTenant } = useAuth();
  const [subsidiaries, setSubsidiaries] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setIsDashboardLoading(true);
    try {
      const [subsRes, dashRes] = await Promise.all([
        getSubsidiaries(),
        getConsolidatedDashboard(),
      ]);
      setSubsidiaries(subsRes);
      setDashboard(dashRes?.data || null);
    } catch (err) {
      console.error('Error fetching subsidiaries data:', err);
      toast.error('Error al cargar datos de sedes');
    } finally {
      setIsLoading(false);
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenant?._id || tenant?.id]);

  const handleSwitchToSede = async (tenantId) => {
    const membership = memberships.find((m) => {
      const mTenantId = m.tenant?._id || m.tenant?.id || m.tenantId;
      return mTenantId === tenantId;
    });

    if (!membership) {
      toast.error('No tienes acceso a esta sede');
      return;
    }

    setIsSwitching(true);
    try {
      await selectTenant(membership.id, { rememberAsDefault: true });
      navigate('/dashboard');
    } catch (err) {
      console.error('Error switching to sede:', err);
      toast.error('Error al cambiar de sede');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleCreateSede = () => {
    navigate('/organizations');
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '$0.00';
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency: tenant?.settings?.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const isParent = subsidiaries?.isParent;
  const isSubsidiary = subsidiaries?.isSubsidiary;
  const parentTenant = subsidiaries?.parentTenant;
  const sedesList = subsidiaries?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis Sedes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isParent
              ? `${sedesList.length} sede${sedesList.length !== 1 ? 's' : ''} vinculada${sedesList.length !== 1 ? 's' : ''}`
              : isSubsidiary && parentTenant
                ? `Sede de ${parentTenant.name}`
                : 'Gestión de sedes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {isParent && (
            <Button size="sm" onClick={handleCreateSede}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Sede
            </Button>
          )}
        </div>
      </div>

      {/* Consolidated Dashboard Cards (parent only) */}
      {isDashboardLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dashboard ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Órdenes Hoy (Total)</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.totals?.ordersToday || 0}</div>
              <p className="text-xs text-muted-foreground">
                En {dashboard.familySize} {dashboard.familySize === 1 ? 'sede' : 'sedes'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ventas Hoy (Total)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboard.totals?.salesToday)}</div>
              <p className="text-xs text-muted-foreground">Consolidado todas las sedes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Productos en Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.totals?.productsInStock || 0}</div>
              <p className="text-xs text-muted-foreground">Productos activos con stock</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Subsidiaries Comparison Table */}
      {dashboard?.subsidiaries && dashboard.subsidiaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparativa por Sede</CardTitle>
            <CardDescription>Desempeño del día de hoy por sede</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sede</TableHead>
                  <TableHead className="text-right">Órdenes</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Productos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.subsidiaries.map((sede) => {
                  const currentTenantId = tenant?._id || tenant?.id;
                  const isCurrent = sede.tenantId === currentTenantId;

                  return (
                    <TableRow key={sede.tenantId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sede.isSubsidiary ? (
                            <MapPin className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Building2 className="h-4 w-4 text-primary" />
                          )}
                          <span className="font-medium">{sede.name}</span>
                          {!sede.isSubsidiary && (
                            <Badge variant="outline" className="text-[10px]">
                              Casa Matriz
                            </Badge>
                          )}
                          {isCurrent && (
                            <Badge variant="secondary" className="text-[10px]">
                              Actual
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{sede.ordersToday}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sede.salesToday)}</TableCell>
                      <TableCell className="text-right">{sede.productsInStock}</TableCell>
                      <TableCell className="text-right">
                        {!isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSwitchToSede(sede.tenantId)}
                            disabled={isSwitching}
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Ir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Subsidiaries Cards List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-24 mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sedesList.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            {isParent ? 'Sedes' : 'Sedes del Grupo'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sedesList.map((sede) => {
              const sedeId = sede._id || sede.id;
              const currentTenantId = tenant?._id || tenant?.id;
              const isCurrent = sedeId === currentTenantId;

              return (
                <Card key={sedeId} className={isCurrent ? 'ring-2 ring-primary' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <CardTitle className="text-sm">{sede.name}</CardTitle>
                      </div>
                      {isCurrent && (
                        <Badge variant="default" className="text-[10px]">
                          Actual
                        </Badge>
                      )}
                    </div>
                    {sede.contactInfo?.address && (
                      <CardDescription className="text-xs mt-1">
                        {typeof sede.contactInfo.address === 'string'
                          ? sede.contactInfo.address
                          : [
                              sede.contactInfo.address.street,
                              sede.contactInfo.address.city,
                              sede.contactInfo.address.state,
                              sede.contactInfo.address.country
                            ].filter(Boolean).join(', ')}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 mt-2">
                      {!isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleSwitchToSede(sedeId)}
                          disabled={isSwitching}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Cambiar a esta sede
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay sedes registradas</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Crea tu primera sede para gestionar múltiples ubicaciones
            </p>
            <Button onClick={handleCreateSede}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Sede
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {(isParent || isSubsidiary) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/inventory-management?tab=transfers')}
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transferencias entre Sedes
              </Button>
              {isParent && (
                <Button variant="outline" size="sm" onClick={handleCreateSede}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Sede
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
