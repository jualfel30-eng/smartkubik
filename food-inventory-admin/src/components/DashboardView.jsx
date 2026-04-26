import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorState } from '@/components/ui/error-state';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { AnimatedTableBody, AnimatedTableRow } from "@/components/ui/animated-table-body.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  TrendingUp,
  Boxes
} from "lucide-react";
import { fetchApi } from '../lib/api';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { ChartSkeleton } from '@/components/charts/BaseChart.jsx';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
import { useDashboardCharts } from '@/hooks/use-dashboard-charts.js';
import { SalesTrendChart } from '@/components/charts/SalesTrendChart.jsx';
import { SalesByCategoryChart } from '@/components/charts/SalesByCategoryChart.jsx';
import { SalesComparisonCard } from '@/components/charts/SalesComparisonCard.jsx';
import { StockLevelsChart } from '@/components/charts/StockLevelsChart.jsx';
import { InventoryMovementChart } from '@/components/charts/InventoryMovementChart.jsx';
import { ProductRotationTable } from '@/components/charts/ProductRotationTable.jsx';
import { ProfitAndLossChart } from '@/components/charts/ProfitAndLossChart.jsx';
import { CustomerSegmentationChart } from '@/components/charts/CustomerSegmentationChart.jsx';
import { EmployeePerformanceChart } from '@/components/charts/EmployeePerformanceChart.jsx';
import { InventoryAttributeTable } from '@/components/tables/InventoryAttributeTable.jsx';
import { SalesAttributeTable } from '@/components/tables/SalesAttributeTable.jsx';
import { RubikLoader } from './RubikLoader';
import { FinancialKpisDashboard } from '@/components/charts/FinancialKpisDashboard.jsx';
import { CustomAnalytics } from '@/components/charts/CustomAnalytics.jsx';
import { useAuth } from '@/hooks/use-auth';
import OnboardingChecklist from './OnboardingChecklist';
import BeautyDashboardView from './BeautyDashboardView';
import { ScrollRevealGroup } from '@/components/ui/scroll-reveal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DashboardGreeting from '@/components/dashboard/DashboardGreeting';
import DashboardKpiCard from '@/components/dashboard/DashboardKpiCard';
import PriorityAlerts from '@/components/dashboard/PriorityAlerts';
import QuickActions from '@/components/dashboard/QuickActions';
import { useDashboardAutoRefresh } from '@/hooks/use-dashboard-auto-refresh';
import { useDashboardMilestones } from '@/hooks/use-dashboard-milestones';

const statusMap = {
  draft: { label: 'Borrador', colorClassName: 'bg-gray-200 text-gray-800' },
  pending: { label: 'Pendiente', colorClassName: 'bg-warning/10 text-yellow-800' },
  confirmed: { label: 'Confirmado', colorClassName: 'bg-info/10 text-blue-800' },
  processing: { label: 'Procesando', colorClassName: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'Enviado', colorClassName: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Entregado', colorClassName: 'bg-success/10 text-green-800' },
  cancelled: { label: 'Cancelado', colorClassName: 'bg-destructive/10 text-red-800' },
  refunded: { label: 'Reembolsado', colorClassName: 'bg-pink-100 text-pink-800' },
};

const getStatusBadge = (status) => {
  const statusInfo = statusMap[status] || { label: status, colorClassName: 'bg-gray-200' };
  return <Badge className={statusInfo.colorClassName}>{statusInfo.label}</Badge>;
};

function DashboardView() {
  const { flags } = useFeatureFlags();
  const { user, tenant } = useAuth();
  const isBeautyProfile = ['barbershop-salon', 'clinic-spa'].includes(tenant?.verticalProfile?.key);
  if (isBeautyProfile) return <BeautyDashboardView />;
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30d');
  const {
    data: chartData,
    loading: chartsLoading,
    error: chartsError,
  } = useDashboardCharts(period);
  const navigate = useNavigate();
  const periodOptions = [
    { value: '7d', label: 'Últimos 7 días' },
    { value: '14d', label: 'Últimos 14 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: '60d', label: 'Últimos 60 días' },
    { value: '90d', label: 'Últimos 90 días' },
  ];

  const fetchSummary = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await fetchApi('/dashboard/summary');
      setSummaryData(response.data);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const { lastUpdated } = useDashboardAutoRefresh(
    useCallback(() => fetchSummary(true), [fetchSummary]),
    60000
  );

  useDashboardMilestones({
    salesToday: summaryData?.salesToday || 0,
    lowStockAlertCount: summaryData?.lowStockAlertCount || 0,
    dailyGoal: 500,
  });

  if (loading) {
    return <RubikLoader />;
  }

  if (error) {
    return <ErrorState message={`Error al cargar el dashboard: ${error}`} onRetry={fetchSummary} />;
  }

  if (!summaryData) {
    return <div>No hay datos para mostrar.</div>;
  }

  return (
    <div className="space-y-6">
      <DashboardGreeting user={user} tenant={tenant} lastUpdated={lastUpdated} />

      {/* Onboarding checklist — visible until setup tasks are complete */}
      {tenant && !tenant.onboardingCompleted && (
        <OnboardingChecklist summaryData={summaryData} />
      )}

      {/* Priority Alerts — only visible when there are actionable items */}
      <PriorityAlerts
        lowStockCount={summaryData.lowStockAlertCount || 0}
        pendingPurchaseOrders={summaryData.pendingPurchaseOrders || 0}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* KPI Cards with Comparison */}
      <ScrollRevealGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardKpiCard
          title="Ventas de Hoy"
          icon={DollarSign}
          value={summaryData.salesToday || 0}
          format={(n) => `$${n.toFixed(2)}`}
          previousValue={summaryData.salesYesterday}
          goalValue={500}
          goalLabel="Meta diaria"
        />
        <DashboardKpiCard
          title="Ordenes de Hoy"
          icon={ShoppingCart}
          value={summaryData.ordersToday || 0}
          format={(n) => `+${Math.round(n)}`}
          previousValue={summaryData.ordersYesterday}
        />
        <DashboardKpiCard
          title="Clientes Activos"
          icon={Users}
          value={summaryData.activeCustomers || 0}
          format={(n) => Math.round(n).toLocaleString()}
        />
        <DashboardKpiCard
          title="Productos en Stock"
          icon={Package}
          value={summaryData.productsInStock || 0}
          format={(n) => Math.round(n).toLocaleString()}
        />
      </ScrollRevealGroup>

      {/* === Progressive Disclosure Tabs === */}
      <Tabs defaultValue="resumen" className="mt-2">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="finanzas">Finanzas</TabsTrigger>
          {flags.DASHBOARD_CHARTS && <TabsTrigger value="ventas">Ventas</TabsTrigger>}
          {flags.DASHBOARD_CHARTS && <TabsTrigger value="inventario">Inventario</TabsTrigger>}
          <TabsTrigger value="analisis">Analisis</TabsTrigger>
        </TabsList>

        {/* ── Resumen ── */}
        <TabsContent value="resumen" className="space-y-6">
          {/* Inventory Value Cards */}
          {summaryData.inventoryValue && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="glass-card-subtle">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor de Inventario (Costo)</CardTitle>
                  <Boxes className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <AnimatedNumber
                    value={summaryData.inventoryValue.totalCostValue || 0}
                    format={(n) => `$${n.toFixed(2)}`}
                    duration={0.6}
                    className="text-2xl font-bold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Inversion total en inventario
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card-subtle">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor de Inventario (Retail)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <AnimatedNumber
                    value={summaryData.inventoryValue.totalRetailValue || 0}
                    format={(n) => `$${n.toFixed(2)}`}
                    duration={0.6}
                    className="text-2xl font-bold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor potencial de venta
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card-subtle">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ganancia Potencial</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <AnimatedNumber
                    value={summaryData.inventoryValue.potentialProfit || 0}
                    format={(n) => `$${n.toFixed(2)}`}
                    duration={0.6}
                    className="text-2xl font-bold text-success"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Margen si se vende todo
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card-subtle">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Items</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <AnimatedNumber
                    value={summaryData.inventoryValue.totalItems || 0}
                    format={(n) => Math.round(n).toLocaleString()}
                    duration={0.6}
                    className="text-2xl font-bold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unidades en inventario
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Orders + Inventory Alerts */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Ordenes Recientes</CardTitle>
                <CardDescription>
                  Un vistazo a las ultimas ordenes registradas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead># Orden</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <AnimatedTableBody>
                    {summaryData.recentOrders?.length > 0 ? (
                      summaryData.recentOrders.map((order) => (
                        <AnimatedTableRow key={order.orderNumber}>
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>${(order.totalAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                        </AnimatedTableRow>
                      ))
                    ) : (
                      <AnimatedTableRow>
                        <TableCell colSpan="4" className="text-center">No hay ordenes recientes.</TableCell>
                      </AnimatedTableRow>
                    )}
                  </AnimatedTableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                  Alertas de Inventario
                </CardTitle>
                <CardDescription>Productos que requieren atencion.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summaryData.inventoryAlerts?.length > 0 ? (
                    summaryData.inventoryAlerts.map((alert, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="font-medium">{alert.productName}</span>
                        {
                          alert.alerts.lowStock ? (
                            <Badge variant="destructive">Stock Bajo</Badge>
                          ) : alert.alerts.nearExpiration ? (
                            <Badge variant="secondary">Proximo a Vencer</Badge>
                          ) : null
                        }
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay alertas de inventario.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Finanzas ── */}
        <TabsContent value="finanzas" className="space-y-6">
          <FinancialKpisDashboard />
        </TabsContent>

        {/* ── Ventas ── */}
        {flags.DASHBOARD_CHARTS && (
          <TabsContent value="ventas" className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Ventas</h3>
                <p className="text-sm text-muted-foreground">
                  Tendencias, categorias y comparativas de ventas.
                </p>
              </div>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecciona periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {chartsLoading ? (
              <ChartSkeleton />
            ) : chartsError ? (
              <Alert variant="destructive">
                <AlertTitle>No se pudieron cargar las graficas</AlertTitle>
                <AlertDescription>{chartsError}</AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <SalesTrendChart data={chartData.sales.trend} />
                  <SalesByCategoryChart data={chartData.sales.categories} />
                  {((chartData.sales.attributes?.schema?.length ?? 0) > 0 &&
                    (chartData.sales.attributes?.combinations?.length ?? 0) > 0) ? (
                    <SalesAttributeTable
                      schema={chartData.sales.attributes.schema}
                      combinations={chartData.sales.attributes.combinations}
                    />
                  ) : null}
                </div>
                <SalesComparisonCard comparison={chartData.sales.comparison} />
              </div>
            )}
          </TabsContent>
        )}

        {/* ── Inventario ── */}
        {flags.DASHBOARD_CHARTS && (
          <TabsContent value="inventario" className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Inventario</h3>
                <p className="text-sm text-muted-foreground">
                  Distribucion de stock, movimientos y rotacion de productos.
                </p>
              </div>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecciona periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {chartsLoading ? (
              <ChartSkeleton />
            ) : chartsError ? (
              <Alert variant="destructive">
                <AlertTitle>No se pudieron cargar las graficas</AlertTitle>
                <AlertDescription>{chartsError}</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-3">
                  <StockLevelsChart data={chartData.inventory.status} />
                  <InventoryMovementChart data={chartData.inventory.movement} />
                  <ProductRotationTable data={chartData.inventory.rotation} />
                </div>

                {((chartData.inventory.attributes?.schema?.length ?? 0) > 0 &&
                  (chartData.inventory.attributes?.combinations?.length ?? 0) > 0) ? (
                  <InventoryAttributeTable
                    schema={chartData.inventory.attributes.schema}
                    combinations={chartData.inventory.attributes.combinations}
                  />
                ) : null}
              </>
            )}
          </TabsContent>
        )}

        {/* ── Analisis ── */}
        <TabsContent value="analisis" className="space-y-6">
          <CustomAnalytics />

          {flags.DASHBOARD_CHARTS && flags.ADVANCED_REPORTS && !chartsLoading && !chartsError && (
            <div className="space-y-6">
              <ProfitAndLossChart data={chartData.advanced.pnl} />
              <div className="grid gap-6 lg:grid-cols-2">
                <CustomerSegmentationChart data={chartData.advanced.rfm} />
                <EmployeePerformanceChart data={chartData.advanced.employees} />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
            <CardDescription><Skeleton className="h-4 w-2/4" /></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-3/4" /></CardTitle>
            <CardDescription><Skeleton className="h-4 w-2/4" /></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardView;
