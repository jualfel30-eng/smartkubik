import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ProductCampaignBuilder from '../components/marketing/ProductCampaignBuilder';
import ProductCampaignInsights from '../components/marketing/ProductCampaignInsights';
import CampaignAnalyticsDashboard from '../components/marketing/CampaignAnalyticsDashboard';
import {
  getProductCampaigns,
  createProductCampaign,
  deleteProductCampaign,
  launchProductCampaign,
  refreshProductCampaignSegment,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  Plus,
  Package,
  TrendingUp,
  Users,
  Play,
  RefreshCw,
  Trash2,
  BarChart3,
  Target,
  Mail,
  MessageSquare,
  Send,
} from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' },
  scheduled: { label: 'Programada', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' },
  running: { label: 'En Curso', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' },
  completed: { label: 'Completada', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' },
};

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Send,
};

export default function ProductCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [filters] = useState({
    status: '',
    productId: '',
  });

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getProductCampaigns(filters);
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Error al cargar campañas de producto');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreateCampaign = async (campaignData) => {
    try {
      await createProductCampaign(campaignData);
      toast.success('Campaña de producto creada exitosamente');
      setShowBuilder(false);
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Error al crear la campaña');
      throw error;
    }
  };

  const handleLaunchCampaign = async (campaignId) => {
    try {
      await launchProductCampaign(campaignId);
      toast.success('Campaña lanzada exitosamente');
      fetchCampaigns();
    } catch (error) {
      console.error('Error launching campaign:', error);
      toast.error('Error al lanzar la campaña');
    }
  };

  const handleRefreshSegment = async (campaignId) => {
    try {
      await refreshProductCampaignSegment(campaignId);
      toast.success('Segmento actualizado');
      fetchCampaigns();
    } catch (error) {
      console.error('Error refreshing segment:', error);
      toast.error('Error al actualizar el segmento');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta campaña?')) {
      return;
    }

    try {
      await deleteProductCampaign(campaignId);
      toast.success('Campaña eliminada');
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Error al eliminar la campaña');
    }
  };

  const handleViewInsights = (campaign) => {
    setSelectedCampaign(campaign);
    setShowInsights(true);
  };

  const handleViewAnalytics = (campaign) => {
    setSelectedCampaign(campaign);
    setShowAnalytics(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-gray-100 flex items-center gap-2">
            <Package className="w-8 h-8" />
            Campañas de Producto
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Segmentación avanzada basada en afinidad de productos
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Campaña de Producto
        </Button>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <p className="font-semibold">Phase 3: Targeting Avanzado con CustomerProductAffinity</p>
          <p className="text-sm mt-1">
            Crea campañas inteligentes usando 20+ filtros: afinidad 0-100, segmentos de cliente,
            engagement, predicción de recompra, y más.
          </p>
        </AlertDescription>
      </Alert>

      {/* Campaigns List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="space-y-3 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-75"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-150"></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cargando campañas...
            </p>
          </div>
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-lg font-semibold dark:text-gray-100 mb-2">
              No hay campañas de producto
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Crea tu primera campaña basada en afinidad de productos
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Campaña
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
            const ChannelIcon = CHANNEL_ICONS[campaign.channel] || Mail;

            return (
              <Card key={campaign._id} className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg dark:text-gray-100">
                        {campaign.name}
                      </CardTitle>
                      {campaign.description && (
                        <CardDescription className="dark:text-gray-400 mt-1">
                          {campaign.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                    <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                      <ChannelIcon className="w-3 h-3 mr-1" />
                      {campaign.channel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Product Targeting Info */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Productos Targeted:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {campaign.productTargeting?.slice(0, 3).map((targeting, index) => (
                        <Badge key={index} variant="secondary" className="text-xs dark:bg-purple-900/30 dark:text-purple-200">
                          {targeting.productName}
                        </Badge>
                      ))}
                      {campaign.productTargeting?.length > 3 && (
                        <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">
                          +{campaign.productTargeting.length - 3} más
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <p className="text-xs text-blue-600 dark:text-blue-400">Alcance</p>
                      </div>
                      <p className="text-lg font-bold dark:text-gray-100">
                        {campaign.estimatedReach || 0}
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <p className="text-xs text-green-600 dark:text-green-400">Conversiones</p>
                      </div>
                      <p className="text-lg font-bold dark:text-gray-100">
                        {campaign.totalOrders || 0}
                      </p>
                    </div>
                  </div>

                  {/* Audience Insights Summary */}
                  {campaign.audienceInsights && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
                        Insights de Audiencia
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {campaign.audienceInsights.averageAffinityScore && (
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Afinidad Prom.</p>
                            <p className="font-semibold dark:text-gray-100">
                              {campaign.audienceInsights.averageAffinityScore.toFixed(1)}%
                            </p>
                          </div>
                        )}
                        {campaign.audienceInsights.estimatedConversionRate && (
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Conv. Estimada</p>
                            <p className="font-semibold dark:text-gray-100">
                              {campaign.audienceInsights.estimatedConversionRate.toFixed(1)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {campaign.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handleLaunchCampaign(campaign._id)}
                          className="flex-1"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Lanzar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewInsights(campaign)}
                        className="flex-1 dark:border-gray-600 dark:text-gray-200"
                      >
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Insights
                      </Button>
                      {campaign.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRefreshSegment(campaign._id)}
                            className="dark:text-gray-200"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCampaign(campaign._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                    {(campaign.status === 'running' || campaign.status === 'completed') && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleViewAnalytics(campaign)}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Ver Analíticas
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Campaign Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">
              Nueva Campaña de Producto
            </DialogTitle>
          </DialogHeader>
          <ProductCampaignBuilder
            onSubmit={handleCreateCampaign}
            onCancel={() => setShowBuilder(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Campaign Insights Dialog */}
      <Dialog open={showInsights} onOpenChange={setShowInsights}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">
              Insights de Campaña
            </DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <ProductCampaignInsights campaignId={selectedCampaign._id} />
          )}
        </DialogContent>
      </Dialog>

      {/* Campaign Analytics Dialog - PHASE 5 */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">
              Analíticas Avanzadas - {selectedCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <CampaignAnalyticsDashboard
              campaignId={selectedCampaign._id}
              campaignName={selectedCampaign.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
