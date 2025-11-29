import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Mail,
  Eye,
  MousePointer,
  ShoppingCart,
  Target,
  Award,
  AlertCircle,
  CheckCircle2,
  Package,
  Sparkles,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * ProductCampaignInsights - PHASE 3 Campaign Performance Dashboard
 *
 * Displays comprehensive campaign analytics including:
 * - Overall performance metrics (sent, delivered, opened, clicked, orders, revenue)
 * - Segment performance breakdown
 * - Engagement level performance
 * - Product-specific metrics
 * - ROI calculation
 * - Conversion tracking (new customers, reactivated, predicted conversions)
 * - Top performing customers
 *
 * @param {string} campaignId - Product campaign ID
 */
export default function ProductCampaignInsights({ campaignId }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchCampaignData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch campaign details
      const campaignResponse = await fetchApi(`/product-campaigns/${campaignId}`);
      setCampaign(campaignResponse.data);
    } catch (error) {
      console.error('Error fetching campaign data:', error);
      toast.error('Error al cargar datos de la campaña');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (campaignId) {
      fetchCampaignData();
    }
  }, [campaignId, fetchCampaignData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCampaignData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-75"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-150"></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cargando insights de campaña...
          </p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-red-900 dark:text-red-100">
          No se pudo cargar la campaña
        </AlertDescription>
      </Alert>
    );
  }

  const {
    name,
    status,
    channel,
    estimatedReach,
    totalSent = 0,
    totalDelivered = 0,
    totalOpened = 0,
    totalClicked = 0,
    totalOrders = 0,
    totalRevenue = 0,
    cost = 0,
    roi = 0,
    newCustomersAcquired = 0,
    reactivatedCustomers = 0,
    predictedCustomersConverted = 0,
    audienceInsights = {},
    productTargeting = [],
  } = campaign;

  // Calculate rates
  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 0;
  const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : 0;
  const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : 0;
  const conversionRate = totalSent > 0 ? ((totalOrders / totalSent) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Insights de Campaña
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {name}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="dark:border-gray-600 dark:text-gray-200"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge
          className={
            status === 'running'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
              : status === 'completed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }
        >
          {status === 'running' ? 'En Curso' : status === 'completed' ? 'Completada' : status}
        </Badge>
        <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
          Canal: {channel}
        </Badge>
        <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
          {estimatedReach} clientes objetivo
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="segments">
            <Users className="w-4 h-4 mr-2" />
            Segmentos
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="roi">
            <DollarSign className="w-4 h-4 mr-2" />
            ROI
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Main Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Enviados</p>
                    <p className="text-2xl font-bold dark:text-gray-100">{totalSent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Entregados</p>
                    <p className="text-2xl font-bold dark:text-gray-100">{totalDelivered}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">{deliveryRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Abiertos</p>
                    <p className="text-2xl font-bold dark:text-gray-100">{totalOpened}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">{openRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <MousePointer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Clicks</p>
                    <p className="text-2xl font-bold dark:text-gray-100">{totalClicked}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">{clickRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion & Revenue Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Órdenes</p>
                    <p className="text-2xl font-bold dark:text-gray-100">{totalOrders}</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      {conversionRate}% conversión
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Ingresos</p>
                    <p className="text-2xl font-bold dark:text-gray-100">
                      ${totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0} promedio
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    roi > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {roi > 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">ROI</p>
                    <p className={`text-2xl font-bold ${
                      roi > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PHASE 3 Metrics */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                <Sparkles className="w-5 h-5" />
                Métricas Avanzadas (Phase 3)
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Conversiones específicas de la campaña
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-medium dark:text-gray-200">
                      Nuevos Clientes
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {newCustomersAcquired}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Primera compra de este producto
                  </p>
                </div>

                <div className="p-4 border dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm font-medium dark:text-gray-200">
                      Reactivados
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {reactivatedCustomers}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Clientes en riesgo que recompraron
                  </p>
                </div>

                <div className="p-4 border dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <p className="text-sm font-medium dark:text-gray-200">
                      Predicciones Acertadas
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {predictedCustomersConverted}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Conversiones de predicción de recompra
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Funnel Chart */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg dark:text-gray-100">
                Embudo de Conversión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="dark:text-gray-200">Enviados</span>
                  <span className="font-semibold dark:text-gray-100">{totalSent}</span>
                </div>
                <Progress value={100} className="h-3" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="dark:text-gray-200">Entregados ({deliveryRate}%)</span>
                  <span className="font-semibold dark:text-gray-100">{totalDelivered}</span>
                </div>
                <Progress value={parseFloat(deliveryRate)} className="h-3" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="dark:text-gray-200">Abiertos ({openRate}%)</span>
                  <span className="font-semibold dark:text-gray-100">{totalOpened}</span>
                </div>
                <Progress value={parseFloat(openRate)} className="h-3" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="dark:text-gray-200">Clicks ({clickRate}%)</span>
                  <span className="font-semibold dark:text-gray-100">{totalClicked}</span>
                </div>
                <Progress value={parseFloat(clickRate)} className="h-3" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="dark:text-gray-200">Conversiones ({conversionRate}%)</span>
                  <span className="font-semibold dark:text-gray-100">{totalOrders}</span>
                </div>
                <Progress value={parseFloat(conversionRate)} className="h-3 bg-green-200" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Segments Performance */}
        <TabsContent value="segments" className="space-y-6">
          {audienceInsights?.segmentDistribution && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-gray-100">
                  Distribución por Segmento
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Clientes por segmento de comportamiento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(audienceInsights.segmentDistribution).map(([segment, count]) => {
                  const percentage = audienceInsights.totalMatchingCustomers > 0
                    ? ((count / audienceInsights.totalMatchingCustomers) * 100).toFixed(1)
                    : 0;

                  return (
                    <div key={segment} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize dark:text-gray-200">
                          {segment}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {count} clientes
                          </span>
                          <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                            {percentage}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={parseFloat(percentage)} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {audienceInsights?.engagementDistribution && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-gray-100">
                  Distribución por Engagement
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Niveles de actividad e interacción
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(audienceInsights.engagementDistribution).map(([level, count]) => {
                  const percentage = audienceInsights.totalMatchingCustomers > 0
                    ? ((count / audienceInsights.totalMatchingCustomers) * 100).toFixed(1)
                    : 0;

                  const levelLabels = {
                    very_high: 'Muy Alto',
                    high: 'Alto',
                    medium: 'Medio',
                    low: 'Bajo',
                    at_risk: 'En Riesgo',
                  };

                  return (
                    <div key={level} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium dark:text-gray-200">
                          {levelLabels[level] || level}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {count} clientes
                          </span>
                          <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                            {percentage}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={parseFloat(percentage)} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Product Performance */}
        <TabsContent value="products" className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg dark:text-gray-100">
                Productos Targeted
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Criterios de targeting configurados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {productTargeting.map((targeting, index) => (
                <div
                  key={index}
                  className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                >
                  <p className="font-semibold text-lg dark:text-gray-100">
                    {targeting.productName}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    {targeting.minAffinityScore && (
                      <span className="text-gray-600 dark:text-gray-400">
                        Afinidad mín: {targeting.minAffinityScore}%
                      </span>
                    )}
                    {targeting.maxAffinityScore && (
                      <span className="text-gray-600 dark:text-gray-400">
                        Afinidad máx: {targeting.maxAffinityScore}%
                      </span>
                    )}
                    {targeting.minPurchaseCount && (
                      <span className="text-gray-600 dark:text-gray-400">
                        Compras mín: {targeting.minPurchaseCount}
                      </span>
                    )}
                    {targeting.minTotalSpent && (
                      <span className="text-gray-600 dark:text-gray-400">
                        Gasto mín: ${targeting.minTotalSpent}
                      </span>
                    )}
                  </div>
                  {targeting.customerSegments && targeting.customerSegments.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {targeting.customerSegments.map(seg => (
                        <Badge key={seg} variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-200">
                          {seg}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: ROI Analysis */}
        <TabsContent value="roi" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-gray-100">
                  Costo de Campaña
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                  ${cost.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Inversión total en la campaña
                </p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-gray-100">
                  Ingresos Generados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  ${totalRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Ingresos atribuidos a la campaña
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg dark:text-gray-100">
                ROI Detallado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-sm font-medium dark:text-gray-200">
                  Retorno de Inversión (ROI)
                </span>
                <span className={`text-2xl font-bold ${
                  roi > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-sm font-medium dark:text-gray-200">
                  Beneficio Neto
                </span>
                <span className={`text-2xl font-bold ${
                  (totalRevenue - cost) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  ${(totalRevenue - cost).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-sm font-medium dark:text-gray-200">
                  Costo por Conversión (CPA)
                </span>
                <span className="text-2xl font-bold dark:text-gray-100">
                  ${totalOrders > 0 ? (cost / totalOrders).toFixed(2) : 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-sm font-medium dark:text-gray-200">
                  Valor Promedio de Orden (AOV)
                </span>
                <span className="text-2xl font-bold dark:text-gray-100">
                  ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
