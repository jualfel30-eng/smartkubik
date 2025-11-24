import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Factory,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Package
} from 'lucide-react';

/**
 * ProductionDashboard
 * Dashboard con KPIs de producción en tiempo real
 */
export function ProductionDashboard() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    setLoading(true);
    try {
      const result = await fetchApi('/manufacturing-orders');
      if (result.success) {
        // Calcular KPIs desde los datos de órdenes
        const orders = result.data || result?.data?.data || [];

        const totalOrders = orders.length;
        const draftOrders = orders.filter(o => o.status === 'draft').length;
        const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
        const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

        // Calcular órdenes atrasadas (plannedCompletionDate < hoy y no completadas)
        const today = new Date();
        const overdueOrders = orders.filter(o =>
          o.status !== 'completed' &&
          o.status !== 'cancelled' &&
          o.plannedCompletionDate &&
          new Date(o.plannedCompletionDate) < today
        ).length;

        // Calcular costos
        const totalPlannedCost = orders.reduce((sum, o) =>
          sum + (o.estimatedMaterialCost || 0) + (o.estimatedLaborCost || 0), 0
        );
        const totalActualCost = orders.reduce((sum, o) =>
          sum + (o.actualMaterialCost || 0) + (o.actualLaborCost || 0), 0
        );
        const costVariance = totalActualCost - totalPlannedCost;
        const costVariancePercentage = totalPlannedCost > 0
          ? ((costVariance / totalPlannedCost) * 100).toFixed(1)
          : 0;

        // Eficiencia (% de órdenes completadas a tiempo)
        const onTimeOrders = orders.filter(o =>
          o.status === 'completed' &&
          (!o.actualCompletionDate || !o.plannedCompletionDate ||
          new Date(o.actualCompletionDate) <= new Date(o.plannedCompletionDate))
        ).length;
        const efficiency = completedOrders > 0
          ? ((onTimeOrders / completedOrders) * 100).toFixed(1)
          : 0;

        setKpis({
          totalOrders,
          draftOrders,
          confirmedOrders,
          inProgressOrders,
          completedOrders,
          cancelledOrders,
          overdueOrders,
          totalPlannedCost,
          totalActualCost,
          costVariance,
          costVariancePercentage,
          efficiency,
          onTimeOrders,
        });
      }
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-muted-foreground">Cargando dashboard...</span>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay datos disponibles
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard de Producción</h2>
        <p className="text-muted-foreground">Resumen de indicadores clave de rendimiento</p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Órdenes</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.inProgressOrders} en proceso
            </p>
          </CardContent>
        </Card>

        {/* Completed Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Completadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.completedOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.efficiency}% a tiempo
            </p>
          </CardContent>
        </Card>

        {/* Overdue Orders */}
        <Card className={kpis.overdueOrders > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Atrasadas</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${kpis.overdueOrders > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.overdueOrders > 0 ? 'text-red-600' : ''}`}>
              {kpis.overdueOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        {/* Cost Variance */}
        <Card className={kpis.costVariance > 0 ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Varianza de Costos</CardTitle>
            {kpis.costVariance > 0 ? (
              <TrendingUp className="h-4 w-4 text-orange-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.costVariance > 0 ? 'text-orange-700' : 'text-green-600'}`}>
              {kpis.costVariancePercentage}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(Math.abs(kpis.costVariance))} {kpis.costVariance > 0 ? 'sobre' : 'bajo'} presupuesto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Órdenes por Estado</CardTitle>
            <CardDescription>Distribución de órdenes en el sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm font-medium">Borrador</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{kpis.draftOrders}</span>
                <Badge variant="outline">{((kpis.draftOrders / kpis.totalOrders) * 100).toFixed(0)}%</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">Confirmado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{kpis.confirmedOrders}</span>
                <Badge variant="outline">{((kpis.confirmedOrders / kpis.totalOrders) * 100).toFixed(0)}%</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium">En Proceso</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{kpis.inProgressOrders}</span>
                <Badge variant="outline">{((kpis.inProgressOrders / kpis.totalOrders) * 100).toFixed(0)}%</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Completado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{kpis.completedOrders}</span>
                <Badge variant="outline">{((kpis.completedOrders / kpis.totalOrders) * 100).toFixed(0)}%</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium">Cancelado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{kpis.cancelledOrders}</span>
                <Badge variant="outline">{((kpis.cancelledOrders / kpis.totalOrders) * 100).toFixed(0)}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Costos</CardTitle>
            <CardDescription>Comparación de costos planificados vs reales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Costo Planificado</span>
                <span className="text-sm font-bold">{formatCurrency(kpis.totalPlannedCost)}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Costo Real</span>
                <span className="text-sm font-bold">{formatCurrency(kpis.totalActualCost)}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${kpis.costVariance > 0 ? 'bg-orange-500' : 'bg-green-500'}`}
                  style={{
                    width: `${Math.min(100, (kpis.totalActualCost / kpis.totalPlannedCost) * 100)}%`
                  }}
                />
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Varianza Total:</span>
                <span className={`text-lg font-bold ${kpis.costVariance > 0 ? 'text-orange-700' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(kpis.costVariance))}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.costVariance > 0 ? 'Sobrecosto' : 'Ahorro'} de {Math.abs(kpis.costVariancePercentage)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Eficiencia de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">{kpis.efficiency}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.onTimeOrders} de {kpis.completedOrders} a tiempo
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Órdenes Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-600">
                  {kpis.confirmedOrders + kpis.inProgressOrders}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  En proceso de producción
                </p>
              </div>
              <Factory className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tasa de Finalización</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {((kpis.completedOrders / (kpis.totalOrders - kpis.draftOrders)) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  De órdenes iniciadas
                </p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
