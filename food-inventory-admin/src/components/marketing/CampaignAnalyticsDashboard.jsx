import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  MousePointerClick,
  Eye,
  ShoppingCart,
  RefreshCw,
  Download,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Clock,
  Target,
  Percent,
} from 'lucide-react';
import { getCampaignAnalytics, refreshCampaignAnalytics, exportCampaignAnalytics } from '../../lib/api';
import { useToast } from '@/hooks/use-toast';
import PerformanceCharts from './PerformanceCharts';

/**
 * CampaignAnalyticsDashboard - Comprehensive analytics dashboard for campaigns
 * PHASE 5: Advanced Analytics & Reporting
 */
const CampaignAnalyticsDashboard = ({ campaignId, campaignName }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCampaignAnalytics(campaignId);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las analíticas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [campaignId, toast]);

  useEffect(() => {
    if (campaignId) {
      loadAnalytics();
    }
  }, [campaignId, loadAnalytics]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const response = await refreshCampaignAnalytics(campaignId);
      setAnalytics(response.data);
      toast({
        title: 'Analíticas Actualizadas',
        description: 'Los datos han sido recalculados exitosamente',
      });
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar las analíticas',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await exportCampaignAnalytics(campaignId, format);

      if (format === 'csv') {
        // Convert CSV array to downloadable file
        const csvContent = response.data.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaign-analytics-${campaignId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Download JSON
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaign-analytics-${campaignId}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: 'Exportación Exitosa',
        description: `Analíticas exportadas en formato ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting analytics:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron exportar las analíticas',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No hay analíticas disponibles
      </div>
    );
  }

  const MetricCard = ({ title, value, icon, trend, trendValue, subtitle, color = 'purple' }) => {
    const IconEl = icon;
    return (
      <Card className="dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <IconEl className={`w-4 h-4 text-${color}-600`} />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
              </div>
              <p className="text-2xl font-bold dark:text-gray-100">{value}</p>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
              )}
            </div>
            {trend && (
              <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{trendValue}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold dark:text-gray-100">Analíticas de Campaña</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{campaignName || analytics.campaignName}</p>
          {analytics.lastCalculatedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Última actualización: {new Date(analytics.lastCalculatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="dark:border-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            className="dark:border-gray-700"
          >
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            className="dark:border-gray-700"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Overall Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tasa de Apertura"
          value={`${analytics.openRate.toFixed(2)}%`}
          icon={Eye}
          subtitle={`${analytics.totalOpened} de ${analytics.totalDelivered} abiertos`}
          color="blue"
        />
        <MetricCard
          title="Tasa de Clics"
          value={`${analytics.clickRate.toFixed(2)}%`}
          icon={MousePointerClick}
          subtitle={`${analytics.totalClicked} clics`}
          color="purple"
        />
        <MetricCard
          title="Tasa de Conversión"
          value={`${analytics.conversionRate.toFixed(2)}%`}
          icon={ShoppingCart}
          subtitle={`${analytics.totalOrders} órdenes`}
          color="orange"
        />
        <MetricCard
          title="ROI"
          value={`${analytics.roi.toFixed(2)}%`}
          icon={TrendingUp}
          subtitle={analytics.roi > 0 ? 'Ganancia' : 'Pérdida'}
          color={analytics.roi > 0 ? 'green' : 'red'}
        />
      </div>

      {/* Revenue and Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Ingresos Totales"
          value={`$${analytics.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          subtitle={`$${analytics.revenuePerRecipient.toFixed(2)} por destinatario`}
          color="green"
        />
        <MetricCard
          title="Costo Total"
          value={`$${analytics.totalCost.toFixed(2)}`}
          icon={Target}
          subtitle={`$${analytics.costPerAcquisition.toFixed(2)} por conversión`}
          color="red"
        />
        <MetricCard
          title="Ganancia Neta"
          value={`$${(analytics.totalRevenue - analytics.totalCost).toFixed(2)}`}
          icon={Award}
          subtitle={`$${analytics.revenuePerOrder.toFixed(2)} por orden`}
          color={analytics.totalRevenue > analytics.totalCost ? 'green' : 'red'}
        />
      </div>

      {/* Engagement Metrics */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <Activity className="w-5 h-5 text-purple-600" />
            Métricas de Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold dark:text-gray-200">Clientes Comprometidos</p>
              </div>
              <p className="text-2xl font-bold dark:text-gray-100">{analytics.uniqueCustomersEngaged}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {analytics.totalSent > 0 ? ((analytics.uniqueCustomersEngaged / analytics.totalSent) * 100).toFixed(1) : 0}% del total
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold dark:text-gray-200">Compradores Recurrentes</p>
              </div>
              <p className="text-2xl font-bold dark:text-gray-100">{analytics.repeatPurchasers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {analytics.totalOrders > 0 ? ((analytics.repeatPurchasers / analytics.totalOrders) * 100).toFixed(1) : 0}% de órdenes
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-sm font-semibold dark:text-gray-200">Tiempo Promedio</p>
              </div>
              <p className="text-2xl font-bold dark:text-gray-100">
                {analytics.averageTimeToPurchase ? `${analytics.averageTimeToPurchase.toFixed(1)}h` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Hasta primera compra</p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-purple-600" />
                <p className="text-sm font-semibold dark:text-gray-200">Score de Engagement</p>
              </div>
              <p className="text-2xl font-bold dark:text-gray-100">{analytics.engagementScore.toFixed(1)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ponderado por acción</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* A/B Test Summary (if applicable) */}
      {analytics.isAbTest && (
        <Card className="dark:bg-gray-800 border-2 border-purple-500 dark:border-purple-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Resultados del A/B Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Métrica de Optimización</p>
                  <p className="text-lg font-bold dark:text-gray-100">
                    {analytics.testMetric === 'open_rate' && 'Tasa de Apertura'}
                    {analytics.testMetric === 'click_rate' && 'Tasa de Clics'}
                    {analytics.testMetric === 'conversion_rate' && 'Tasa de Conversión'}
                    {analytics.testMetric === 'revenue' && 'Ingresos'}
                  </p>
                </div>
                {analytics.winningVariant && (
                  <Badge className="bg-green-600">
                    <Award className="w-3 h-3 mr-1" />
                    Ganador: {analytics.winningVariant}
                  </Badge>
                )}
              </div>

              {analytics.improvementPercentage !== undefined && analytics.improvementPercentage !== null && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="font-semibold text-green-900 dark:text-green-100">Mejora del Ganador</p>
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    +{analytics.improvementPercentage.toFixed(2)}%
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Comparado con la variante de control
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Detailed Analytics */}
      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="dark:bg-gray-800">
          <TabsTrigger value="charts">Gráficas</TabsTrigger>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
        </TabsList>

        <TabsContent value="charts">
          <PerformanceCharts
            dailyPerformance={analytics.dailyPerformance}
            segmentPerformance={analytics.segmentPerformance}
          />
        </TabsContent>

        <TabsContent value="segments">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Performance por Segmento de Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.segmentPerformance && analytics.segmentPerformance.length > 0 ? (
                <div className="space-y-4">
                  {analytics.segmentPerformance.map((segment) => (
                    <div
                      key={segment.segmentName}
                      className="p-4 border dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{segment.segmentName}</Badge>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {segment.customerCount} clientes
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold dark:text-gray-200">
                            ${segment.revenue.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${segment.revenuePerCustomer.toFixed(2)}/cliente
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Órdenes</p>
                          <p className="font-bold dark:text-gray-100">{segment.orders}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Conversión</p>
                          <p className="font-bold dark:text-gray-100">{segment.conversionRate.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Click Rate</p>
                          <p className="font-bold dark:text-gray-100">{segment.clickRate.toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No hay datos de segmentos disponibles
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Performance por Producto</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.productPerformance && analytics.productPerformance.length > 0 ? (
                <div className="space-y-3">
                  {analytics.productPerformance.map((product, index) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-300">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-semibold dark:text-gray-100">{product.productName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {product.quantitySold} unidades vendidas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 dark:text-green-400">
                          ${product.revenue.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {product.orderCount} órdenes · {product.conversionRate.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No hay datos de productos disponibles
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Análisis de Timing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 dark:text-gray-200">Timeline de Campaña</h3>
                  <div className="space-y-3">
                    {analytics.firstSentAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Primer Envío:</span>
                        <span className="font-medium dark:text-gray-100">
                          {new Date(analytics.firstSentAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {analytics.firstOrderAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Primera Orden:</span>
                        <span className="font-medium dark:text-gray-100">
                          {new Date(analytics.firstOrderAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {analytics.lastOrderAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Última Orden:</span>
                        <span className="font-medium dark:text-gray-100">
                          {new Date(analytics.lastOrderAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 dark:text-gray-200">Duración y Velocidad</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Duración Total:</span>
                      <span className="font-medium dark:text-gray-100">
                        {analytics.campaignDurationHours
                          ? `${(analytics.campaignDurationHours / 24).toFixed(1)} días`
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tiempo a Primera Compra:</span>
                      <span className="font-medium dark:text-gray-100">
                        {analytics.averageTimeToPurchase
                          ? `${analytics.averageTimeToPurchase.toFixed(1)} horas`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignAnalyticsDashboard;
