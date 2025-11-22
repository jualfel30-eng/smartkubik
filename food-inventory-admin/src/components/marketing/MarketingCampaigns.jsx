import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AudienceSelector from './AudienceSelector';
import ImageUploader from './ImageUploader';
import CampaignTemplates from './CampaignTemplates';
import TriggerBuilder from './TriggerBuilder';
import {
  getMarketingCampaigns,
  getMarketingAnalytics,
  createMarketingCampaign,
  updateMarketingCampaign,
  deleteMarketingCampaign,
  launchMarketingCampaign,
  pauseMarketingCampaign,
  getMarketingTriggers,
  createMarketingTrigger,
  updateMarketingTrigger,
  deleteMarketingTrigger,
  activateMarketingTrigger,
  pauseMarketingTrigger,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  Mail,
  MessageSquare,
  Send,
  Bell,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  DollarSign,
  Play,
  Pause,
  Edit,
  Trash2,
  Plus,
  Target,
  BarChart3,
  Zap,
  Power,
  PowerOff,
} from 'lucide-react';

const CHANNEL_CONFIG = {
  email: { label: 'Email', icon: Mail, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' },
  whatsapp: { label: 'WhatsApp', icon: Send, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200' },
  push: { label: 'Push', icon: Bell, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' },
};

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' },
  scheduled: { label: 'Programada', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' },
  running: { label: 'En Curso', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' },
  completed: { label: 'Completada', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' },
  paused: { label: 'Pausada', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200' },
};

const MarketingCampaigns = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showTriggerForm, setShowTriggerForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [filters, setFilters] = useState({
    channel: '',
    status: '',
    type: '',
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await getMarketingAnalytics();
      setAnalytics(data);
    } catch (error) {
      toast.error('Error al cargar analíticas', { description: error.message });
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMarketingCampaigns(filters);
      setCampaigns(data || []);
    } catch (error) {
      toast.error('Error al cargar campañas', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchTriggers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMarketingTriggers();
      setTriggers(response.data || []);
    } catch (error) {
      toast.error('Error al cargar triggers', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchCampaigns();
    fetchTriggers();
  }, [fetchAnalytics, fetchCampaigns, fetchTriggers]);

  const handleLaunch = async (id) => {
    if (!confirm('¿Estás seguro de lanzar esta campaña?')) return;
    try {
      await launchMarketingCampaign(id);
      toast.success('Campaña lanzada exitosamente');
      fetchCampaigns();
      fetchAnalytics();
    } catch (error) {
      toast.error('Error al lanzar campaña', { description: error.message });
    }
  };

  const handlePause = async (id) => {
    if (!confirm('¿Pausar esta campaña?')) return;
    try {
      await pauseMarketingCampaign(id);
      toast.success('Campaña pausada');
      fetchCampaigns();
      fetchAnalytics();
    } catch (error) {
      toast.error('Error al pausar campaña', { description: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta campaña permanentemente?')) return;
    try {
      await deleteMarketingCampaign(id);
      toast.success('Campaña eliminada');
      fetchCampaigns();
      fetchAnalytics();
    } catch (error) {
      toast.error('Error al eliminar campaña', { description: error.message });
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setShowCampaignForm(true);
  };

  // Trigger handlers
  const handleSaveTrigger = async (triggerData) => {
    try {
      if (editingTrigger) {
        await updateMarketingTrigger(editingTrigger._id, triggerData);
        toast.success('Trigger actualizado exitosamente');
      } else {
        await createMarketingTrigger(triggerData);
        toast.success('Trigger creado exitosamente');
      }
      setShowTriggerForm(false);
      setEditingTrigger(null);
      fetchTriggers();
    } catch (error) {
      toast.error('Error al guardar trigger', { description: error.message });
    }
  };

  const handleActivateTrigger = async (id) => {
    try {
      await activateMarketingTrigger(id);
      toast.success('Trigger activado');
      fetchTriggers();
    } catch (error) {
      toast.error('Error al activar trigger', { description: error.message });
    }
  };

  const handlePauseTrigger = async (id) => {
    try {
      await pauseMarketingTrigger(id);
      toast.success('Trigger pausado');
      fetchTriggers();
    } catch (error) {
      toast.error('Error al pausar trigger', { description: error.message });
    }
  };

  const handleDeleteTrigger = async (id) => {
    if (!confirm('¿Eliminar este trigger permanentemente?')) return;
    try {
      await deleteMarketingTrigger(id);
      toast.success('Trigger eliminado');
      fetchTriggers();
    } catch (error) {
      toast.error('Error al eliminar trigger', { description: error.message });
    }
  };

  const handleEditTrigger = (trigger) => {
    setEditingTrigger(trigger);
    setShowTriggerForm(true);
  };

  if (!analytics) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Marketing Automation</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gestiona campañas de email, SMS, WhatsApp y notificaciones push
          </p>
        </div>
        <Button onClick={() => setShowCampaignForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Campaña
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Campañas Activas
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {analytics.overview.activeCampaigns}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Mensajes Enviados
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {analytics.overview.totalSent.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Tasa de Apertura
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {analytics.overview.averageOpenRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      ROI Promedio
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {analytics.overview.averageROI.toFixed(0)}%
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                    <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Channel */}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Rendimiento por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.byChannel.map((channel) => {
                  const channelConfig = CHANNEL_CONFIG[channel.channel] || CHANNEL_CONFIG.email;
                  const ChannelIcon = channelConfig.icon;

                  return (
                    <div
                      key={channel.channel}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${channelConfig.color}`}>
                          <ChannelIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold dark:text-gray-100">{channelConfig.label}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {channel.campaigns} campañas • {channel.sent.toLocaleString()} enviados
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Apertura</p>
                            <p className="font-semibold dark:text-gray-100">
                              {channel.openRate.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Click</p>
                            <p className="font-semibold dark:text-gray-100">
                              {channel.clickRate.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Conversión</p>
                            <p className="font-semibold dark:text-gray-100">
                              {channel.conversionRate.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Campaigns */}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Top Campañas</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Campañas con mejor rendimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topPerforming.slice(0, 5).map((campaign, idx) => {
                  const channelConfig = CHANNEL_CONFIG[campaign.channel] || CHANNEL_CONFIG.email;
                  const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;

                  return (
                    <div
                      key={campaign._id}
                      className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full">
                          <span className="font-bold text-gray-700 dark:text-gray-300">
                            #{idx + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium dark:text-gray-100">{campaign.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={channelConfig.color}>{channelConfig.label}</Badge>
                            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {campaign.totalConverted || 0} conversiones
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {campaign.totalSent || 0} enviados
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6 mt-6">
          {/* Filters */}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium dark:text-gray-200">Canal</label>
                  <select
                    className="w-full mt-1 p-2 border dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-200"
                    value={filters.channel}
                    onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
                  >
                    <option value="">Todos los canales</option>
                    {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium dark:text-gray-200">Estado</label>
                  <select
                    className="w-full mt-1 p-2 border dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-200"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="">Todos los estados</option>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium dark:text-gray-200">Tipo</label>
                  <select
                    className="w-full mt-1 p-2 border dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-200"
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  >
                    <option value="">Todos los tipos</option>
                    <option value="manual">Manual</option>
                    <option value="automated">Automatizada</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaigns List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : campaigns.length === 0 ? (
              <Alert className="dark:bg-gray-800 dark:border-gray-700">
                <AlertDescription className="dark:text-gray-400">
                  No se encontraron campañas. ¡Crea tu primera campaña!
                </AlertDescription>
              </Alert>
            ) : (
              campaigns.map((campaign) => {
                const channelConfig = CHANNEL_CONFIG[campaign.channel] || CHANNEL_CONFIG.email;
                const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
                const ChannelIcon = channelConfig.icon;

                const openRate =
                  campaign.totalSent > 0
                    ? (campaign.totalOpened / campaign.totalSent) * 100
                    : 0;
                const clickRate =
                  campaign.totalOpened > 0
                    ? (campaign.totalClicked / campaign.totalOpened) * 100
                    : 0;
                const conversionRate =
                  campaign.totalSent > 0
                    ? (campaign.totalConverted / campaign.totalSent) * 100
                    : 0;

                return (
                  <Card key={campaign._id} className="dark:bg-gray-900 dark:border-gray-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${channelConfig.color}`}>
                            <ChannelIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold dark:text-gray-100">
                              {campaign.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {campaign.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                              <Badge variant="outline" className="dark:border-gray-600">
                                {campaign.type === 'automated' ? 'Automatizada' : 'Manual'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                            <Button
                              size="sm"
                              onClick={() => handleLaunch(campaign._id)}
                              className="dark:bg-green-600 dark:hover:bg-green-700"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Lanzar
                            </Button>
                          )}
                          {campaign.status === 'running' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePause(campaign._id)}
                              className="dark:border-gray-600 dark:hover:bg-gray-800"
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Pausar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(campaign)}
                            className="dark:border-gray-600 dark:hover:bg-gray-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(campaign._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Campaign Stats */}
                      {campaign.totalSent > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Enviados</p>
                            <p className="text-xl font-bold dark:text-gray-100">
                              {campaign.totalSent.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Apertura</p>
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              {openRate.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Clicks</p>
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              {clickRate.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Conversión</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">
                              {conversionRate.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos</p>
                            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                              ${(campaign.revenue || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6 mt-6">
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Métricas Clave
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Eye className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {analytics.overview.averageOpenRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Tasa de Apertura Promedio
                  </p>
                </div>

                <div className="text-center p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <MousePointer className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {analytics.overview.averageClickRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Tasa de Click Promedio
                  </p>
                </div>

                <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Users className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {analytics.overview.averageConversionRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Tasa de Conversión Promedio
                  </p>
                </div>
              </div>

              <div className="mt-6 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Retorno de Inversión (ROI)
                      </p>
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {analytics.overview.averageROI.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos Totales</p>
                    <p className="text-2xl font-bold dark:text-gray-100">
                      ${analytics.overview.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triggers Tab - Phase 3: Behavioral Triggers */}
        <TabsContent value="triggers" className="space-y-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold dark:text-gray-100">Triggers Automatizados</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Campañas que se activan automáticamente por el comportamiento del cliente
              </p>
            </div>
            <Button onClick={() => setShowTriggerForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Trigger
            </Button>
          </div>

          {/* Triggers List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : triggers.length === 0 ? (
            <Alert className="dark:bg-gray-800 dark:border-gray-700">
              <Zap className="h-4 w-4" />
              <AlertDescription className="dark:text-gray-400">
                No hay triggers configurados. ¡Crea tu primer trigger automatizado!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {triggers.map((trigger) => {
                const isActive = trigger.status === 'active';
                const eventTypeLabels = {
                  cart_abandoned: 'Carrito Abandonado',
                  first_purchase: 'Primera Compra',
                  customer_birthday: 'Cumpleaños',
                  registration_anniversary: 'Aniversario',
                  inactivity: 'Inactividad',
                  tier_upgrade: 'Mejora de Tier',
                  purchase_milestone: 'Hito de Compras',
                };

                return (
                  <Card key={trigger._id} className="dark:bg-gray-900 dark:border-gray-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            <Zap className={`h-5 w-5 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold dark:text-gray-100">{trigger.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {trigger.description || eventTypeLabels[trigger.eventType]}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={isActive ? 'bg-green-500' : 'bg-gray-500'}>
                                {isActive ? 'Activo' : 'Pausado'}
                              </Badge>
                              <Badge variant="outline" className="dark:border-gray-600">
                                {eventTypeLabels[trigger.eventType]}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePauseTrigger(trigger._id)}
                              className="dark:border-gray-600 dark:hover:bg-gray-800"
                            >
                              <PowerOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleActivateTrigger(trigger._id)}
                              className="dark:border-gray-600 dark:hover:bg-gray-800"
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTrigger(trigger)}
                            className="dark:border-gray-600 dark:hover:bg-gray-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTrigger(trigger._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Trigger Stats */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Activados</p>
                          <p className="text-xl font-bold dark:text-gray-100">
                            {trigger.totalTriggered || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Enviados</p>
                          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {trigger.totalSent || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Conversiones</p>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            {trigger.totalConverted || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Campaign Form Dialog */}
      {showCampaignForm && (
        <CampaignFormDialog
          campaign={editingCampaign}
          onClose={() => {
            setShowCampaignForm(false);
            setEditingCampaign(null);
          }}
          onSuccess={() => {
            setShowCampaignForm(false);
            setEditingCampaign(null);
            fetchCampaigns();
            fetchAnalytics();
          }}
        />
      )}

      {/* Trigger Form Dialog */}
      {showTriggerForm && (
        <Dialog open={true} onOpenChange={() => {
          setShowTriggerForm(false);
          setEditingTrigger(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="dark:text-gray-100">
                {editingTrigger ? 'Editar Trigger' : 'Nuevo Trigger Automatizado'}
              </DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                Configura un trigger que se active automáticamente según el comportamiento del cliente
              </DialogDescription>
            </DialogHeader>
            <TriggerBuilder
              trigger={editingTrigger}
              onChange={() => {}}
              onSave={handleSaveTrigger}
              onCancel={() => {
                setShowTriggerForm(false);
                setEditingTrigger(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Campaign Form Dialog Component
const CampaignFormDialog = ({ campaign, onClose, onSuccess }) => {
  const [showTemplates, setShowTemplates] = useState(!campaign); // Show templates only for new campaigns
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channel: 'email',
    type: 'manual',
    subject: '',
    message: '',
    targetAudience: '',
    targetSegment: {},
    media: [],
    ...campaign,
  });
  const [saving, setSaving] = useState(false);

  const handleTemplateSelect = (template) => {
    setFormData({
      ...formData,
      ...template,
    });
    setShowTemplates(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Clean targetSegment numeric fields to avoid validation errors
      const cleanedData = {
        ...formData,
        targetSegment: formData.targetSegment ? {
          ...formData.targetSegment,
          minSpent: formData.targetSegment.minSpent || undefined,
          maxSpent: formData.targetSegment.maxSpent || undefined,
          maxDaysSinceLastVisit: formData.targetSegment.maxDaysSinceLastVisit || undefined,
          minVisitCount: formData.targetSegment.minVisitCount || undefined,
          maxVisitCount: formData.targetSegment.maxVisitCount || undefined,
        } : undefined,
      };

      if (campaign) {
        await updateMarketingCampaign(campaign._id, cleanedData);
        toast.success('Campaña actualizada');
      } else {
        await createMarketingCampaign(cleanedData);
        toast.success('Campaña creada exitosamente');
      }
      onSuccess();
    } catch (error) {
      toast.error('Error al guardar campaña', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100">
            {campaign ? 'Editar Campaña' : 'Nueva Campaña'}
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            {showTemplates
              ? 'Selecciona una plantilla o crea una campaña desde cero'
              : 'Configura los detalles de tu campaña de marketing'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Show templates for new campaigns */}
        {showTemplates ? (
          <div className="space-y-4">
            <CampaignTemplates onSelectTemplate={handleTemplateSelect} />
            <div className="flex justify-between pt-4 border-t dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Crear desde cero
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium dark:text-gray-200">
              Nombre de la Campaña <span className="text-red-500">*</span>
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Promoción de Verano 2025"
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            />
          </div>

          <div>
            <label className="text-sm font-medium dark:text-gray-200">Descripción</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el objetivo de esta campaña..."
              rows={2}
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium dark:text-gray-200">
                Canal <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full p-2 border dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="push">Push Notification</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium dark:text-gray-200">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full p-2 border dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="manual">Manual</option>
                <option value="automated">Automatizada</option>
              </select>
            </div>
          </div>

          {formData.channel === 'email' && (
            <div>
              <label className="text-sm font-medium dark:text-gray-200">Asunto</label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Asunto del email"
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium dark:text-gray-200">
              Mensaje <span className="text-red-500">*</span>
            </label>
            <Textarea
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Escribe el mensaje de tu campaña..."
              rows={5}
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            />
          </div>

          {/* Audience Selector with RFM Segmentation */}
          <AudienceSelector
            value={formData.targetSegment}
            onChange={(segment) => setFormData({ ...formData, targetSegment: segment })}
          />

          {/* Image Uploader */}
          <ImageUploader
            value={formData.media || []}
            onChange={(media) => setFormData({ ...formData, media })}
            maxImages={5}
          />

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 dark:border-gray-700 dark:hover:bg-gray-800"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Guardando...' : campaign ? 'Actualizar' : 'Crear Campaña'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MarketingCampaigns;
