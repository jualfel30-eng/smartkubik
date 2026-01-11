import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  Target,
  TrendingUp,
  Users,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  DollarSign,
  Calendar,
  Info,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { debounce } from 'lodash';

const CUSTOMER_SEGMENTS = [
  { value: 'new', label: 'Nuevo', description: 'Clientes con pocas compras', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
  { value: 'occasional', label: 'Ocasional', description: 'Compran de vez en cuando', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
  { value: 'regular', label: 'Regular', description: 'Compras frecuentes', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' },
  { value: 'frequent', label: 'Frecuente', description: 'Muy activos', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' },
  { value: 'champion', label: 'Champion', description: 'Top clientes', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' },
];

const ENGAGEMENT_LEVELS = [
  { value: 'very_high', label: 'Muy Alto', color: 'bg-green-500' },
  { value: 'high', label: 'Alto', color: 'bg-blue-500' },
  { value: 'medium', label: 'Medio', color: 'bg-yellow-500' },
  { value: 'low', label: 'Bajo', color: 'bg-orange-500' },
  { value: 'at_risk', label: 'En Riesgo', color: 'bg-red-500' },
];

const CAMPAIGN_CATEGORIES = [
  { value: 'retention', label: 'Retención', description: 'Mantener clientes activos' },
  { value: 'acquisition', label: 'Adquisición', description: 'Conseguir nuevos compradores' },
  { value: 'upsell', label: 'Upsell', description: 'Aumentar valor de compra' },
  { value: 'cross-sell', label: 'Cross-sell', description: 'Vender productos complementarios' },
  { value: 'reactivation', label: 'Reactivación', description: 'Recuperar clientes inactivos' },
  { value: 'loyalty', label: 'Fidelización', description: 'Premiar lealtad' },
];

const CAMPAIGN_TYPES = [
  { value: 'single_product', label: 'Producto Único' },
  { value: 'product_bundle', label: 'Bundle de Productos' },
  { value: 'category', label: 'Categoría' },
  { value: 'complementary', label: 'Productos Complementarios' },
];

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'whatsapp', label: 'WhatsApp', icon: Send },
];

const OFFER_TYPES = [
  { value: 'percentage', label: 'Porcentaje de descuento' },
  { value: 'fixed_amount', label: 'Monto fijo' },
  { value: 'free_shipping', label: 'Envío gratis' },
  { value: 'bogo', label: 'BOGO (2x1)' },
];

/**
 * ProductCampaignBuilder - PHASE 3 Advanced Product Campaign Builder
 *
 * Features:
 * - 20+ advanced targeting filters based on CustomerProductAffinity
 * - Real-time audience preview with insights
 * - Affinity score filtering (0-100)
 * - Customer segment targeting
 * - Engagement level filtering
 * - Predictive analytics (repurchase predictions)
 * - Multi-product targeting with AND/OR logic
 */
export default function ProductCampaignBuilder({ onSubmit, onCancel, initialData }) {
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(false);
  const [testingAudience, setTestingAudience] = useState(false);

  // Campaign form state
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    campaignCategory: initialData?.campaignCategory || 'retention',
    productCampaignType: initialData?.productCampaignType || 'single_product',
    targetingLogic: initialData?.targetingLogic || 'ANY',
    channel: initialData?.channel || 'email',
    subject: initialData?.subject || '',
    message: initialData?.message || '',
    htmlContent: initialData?.htmlContent || '',
    productTargeting: initialData?.productTargeting || [],
    offer: initialData?.offer || null,
    scheduledDate: initialData?.scheduledDate || null,
    cost: initialData?.cost || 0,
    notes: initialData?.notes || '',
  });

  // Audience preview state
  const [audiencePreview, setAudiencePreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Current product targeting being edited
  const [editingTargeting, setEditingTargeting] = useState({
    productId: '',
    productName: '',
    productCode: '',
    // Purchase filters
    minPurchaseCount: '',
    maxPurchaseCount: '',
    minTotalSpent: '',
    maxTotalSpent: '',
    minDaysSinceLastPurchase: '',
    maxDaysSinceLastPurchase: '',
    // PHASE 3: Affinity filters
    minAffinityScore: '',
    maxAffinityScore: '',
    customerSegments: [],
    engagementLevels: [],
    // Purchase frequency
    minPurchaseFrequencyDays: '',
    maxPurchaseFrequencyDays: '',
    // Quantity filters
    minTotalQuantity: '',
    maxTotalQuantity: '',
    minAverageQuantity: '',
    maxAverageQuantity: '',
    // AOV filters
    minAverageOrderValue: '',
    maxAverageOrderValue: '',
    // Predictive filters
    includeRepurchasePredictions: false,
    repurchaseWindowDays: '',
    // Acquisition/Retention
    hasPurchasedProduct: undefined,
    neverPurchasedProduct: false,
    includeInactiveCustomers: true,
  });

  // Search products
  const searchProducts = useMemo(
    () =>
      debounce(async (query) => {
        if (!query || query.length < 2) {
          setSearchResults([]);
          return;
        }

        setSearchLoading(true);
        try {
          const response = await fetchApi(`/products?search=${encodeURIComponent(query)}&limit=20`);
          setSearchResults(response.data || []);
        } catch (error) {
          console.error('Error searching products:', error);
          toast.error('Error buscando productos');
        } finally {
          setSearchLoading(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    searchProducts(searchQuery);
  }, [searchQuery, searchProducts]);

  // Test audience criteria (real-time preview)
  const testAudienceCriteria = useMemo(
    () =>
      debounce(async (productTargeting, targetingLogic) => {
        if (!productTargeting || productTargeting.length === 0) {
          setAudiencePreview(null);
          return;
        }

        setTestingAudience(true);
        try {
          const response = await fetchApi('/product-campaigns/test-audience', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productTargeting, targetingLogic }),
          });

          setAudiencePreview(response.data || null);
        } catch (error) {
          console.error('Error testing audience:', error);
          setAudiencePreview(null);
        } finally {
          setTestingAudience(false);
        }
      }, 800),
    []
  );

  // Auto-test audience when product targeting changes
  useEffect(() => {
    if (formData.productTargeting.length > 0) {
      testAudienceCriteria(formData.productTargeting, formData.targetingLogic);
    } else {
      setAudiencePreview(null);
    }
  }, [formData.productTargeting, formData.targetingLogic, testAudienceCriteria]);

  const handleAddProduct = (product) => {
    setEditingTargeting({
      ...editingTargeting,
      productId: product._id,
      productName: product.name,
      productCode: product.code || '',
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSaveProductTargeting = () => {
    if (!editingTargeting.productId) {
      toast.error('Selecciona un producto');
      return;
    }

    // Clean up empty values
    const cleanTargeting = Object.fromEntries(
      Object.entries(editingTargeting).filter(([, value]) => {
        if (value === '' || value === undefined || value === null) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      })
    );

    setFormData({
      ...formData,
      productTargeting: [...formData.productTargeting, cleanTargeting],
    });

    // Reset editing state
    setEditingTargeting({
      productId: '',
      productName: '',
      productCode: '',
      minPurchaseCount: '',
      maxPurchaseCount: '',
      minTotalSpent: '',
      maxTotalSpent: '',
      minDaysSinceLastPurchase: '',
      maxDaysSinceLastPurchase: '',
      minAffinityScore: '',
      maxAffinityScore: '',
      customerSegments: [],
      engagementLevels: [],
      minPurchaseFrequencyDays: '',
      maxPurchaseFrequencyDays: '',
      minTotalQuantity: '',
      maxTotalQuantity: '',
      minAverageQuantity: '',
      maxAverageQuantity: '',
      minAverageOrderValue: '',
      maxAverageOrderValue: '',
      includeRepurchasePredictions: false,
      repurchaseWindowDays: '',
      hasPurchasedProduct: undefined,
      neverPurchasedProduct: false,
      includeInactiveCustomers: true,
    });

    toast.success('Criterio de producto agregado');
  };

  const handleRemoveProductTargeting = (index) => {
    setFormData({
      ...formData,
      productTargeting: formData.productTargeting.filter((_, i) => i !== index),
    });
  };

  const toggleCustomerSegment = (segment) => {
    const current = editingTargeting.customerSegments || [];
    const updated = current.includes(segment)
      ? current.filter(s => s !== segment)
      : [...current, segment];
    setEditingTargeting({ ...editingTargeting, customerSegments: updated });
  };

  const toggleEngagementLevel = (level) => {
    const current = editingTargeting.engagementLevels || [];
    const updated = current.includes(level)
      ? current.filter(l => l !== level)
      : [...current, level];
    setEditingTargeting({ ...editingTargeting, engagementLevels: updated });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name) {
      toast.error('Ingresa un nombre para la campaña');
      return;
    }

    if (formData.productTargeting.length === 0) {
      toast.error('Agrega al menos un criterio de producto');
      return;
    }

    if (!formData.message) {
      toast.error('Ingresa el mensaje de la campaña');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      toast.success('Campaña de producto creada exitosamente');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Error al crear la campaña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold dark:text-gray-100 flex items-center gap-2">
          <Target className="w-6 h-6" />
          Crear Campaña de Producto Avanzada
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Segmentación basada en CustomerProductAffinity con 20+ filtros avanzados
        </p>
      </div>

      {/* Audience Preview Card */}
      {audiencePreview && (
        <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Alcance Estimado: {audiencePreview.totalCustomers || 0} clientes</p>
                {audiencePreview.averageAffinityScore && (
                  <p className="text-sm mt-1">
                    Afinidad promedio: {audiencePreview.averageAffinityScore.toFixed(1)}%
                  </p>
                )}
              </div>
              {testingAudience && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              )}
            </div>
            {audiencePreview.segmentDistribution && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {Object.entries(audiencePreview.segmentDistribution).map(([segment, count]) => (
                  <Badge key={segment} variant="secondary" className="text-xs">
                    {segment}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Productos & Targeting
          </TabsTrigger>
          <TabsTrigger value="details">
            <Info className="w-4 h-4 mr-2" />
            Detalles
          </TabsTrigger>
          <TabsTrigger value="content">
            <Mail className="w-4 h-4 mr-2" />
            Contenido
          </TabsTrigger>
          <TabsTrigger value="offer">
            <Sparkles className="w-4 h-4 mr-2" />
            Oferta
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Product Targeting */}
        <TabsContent value="products" className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Targeting Logic</CardTitle>
              <CardDescription className="dark:text-gray-400">
                ¿Cómo deben combinarse los criterios de productos?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.targetingLogic}
                onValueChange={(value) => setFormData({ ...formData, targetingLogic: value })}
              >
                <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="ANY" className="dark:text-gray-200">
                    ANY - Cliente compró CUALQUIERA de los productos
                  </SelectItem>
                  <SelectItem value="ALL" className="dark:text-gray-200">
                    ALL - Cliente compró TODOS los productos
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Existing Product Targeting Rules */}
          {formData.productTargeting.length > 0 && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">
                  Criterios Configurados ({formData.productTargeting.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formData.productTargeting.map((targeting, index) => (
                  <div
                    key={index}
                    className="border dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {targeting.customerSegments.map(seg => {
                              const segConfig = CUSTOMER_SEGMENTS.find(s => s.value === seg);
                              return (
                                <Badge key={seg} className={segConfig?.color || ''}>
                                  {segConfig?.label || seg}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                        {targeting.engagementLevels && targeting.engagementLevels.length > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {targeting.engagementLevels.map(level => {
                              const levelConfig = ENGAGEMENT_LEVELS.find(l => l.value === level);
                              return (
                                <Badge key={level} className={`${levelConfig?.color || ''} text-white`}>
                                  {levelConfig?.label || level}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProductTargeting(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add New Product Targeting */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Agregar Criterio de Producto</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Define filtros avanzados basados en CustomerProductAffinity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Search */}
              <div className="space-y-2">
                <Label className="dark:text-gray-200">Buscar Producto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar producto..."
                    value={editingTargeting.productName || searchQuery}
                    onChange={(e) => {
                      if (!editingTargeting.productId) {
                        setSearchQuery(e.target.value);
                      }
                    }}
                    disabled={!!editingTargeting.productId}
                    className="pl-10 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                  />
                  {editingTargeting.productId && (
                    <button
                      onClick={() => setEditingTargeting({ ...editingTargeting, productId: '', productName: '', productCode: '' })}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 && !editingTargeting.productId && (
                  <div className="border rounded-md max-h-48 overflow-y-auto dark:border-gray-600 dark:bg-gray-900">
                    {searchLoading ? (
                      <div className="p-3 text-sm text-gray-500 dark:text-gray-400">Buscando...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y dark:divide-gray-700">
                        {searchResults.map((product) => (
                          <button
                            key={product._id}
                            onClick={() => handleAddProduct(product)}
                            className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="font-medium dark:text-gray-200">{product.name}</div>
                            {product.category && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {product.category}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                        No se encontraron productos
                      </div>
                    )}
                  </div>
                )}
              </div>

              {editingTargeting.productId && (
                <>
                  {/* Affinity Score Filters */}
                  <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <Label className="text-purple-900 dark:text-purple-100 font-semibold">
                        Filtros de Afinidad (0-100)
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="dark:text-gray-200">Afinidad Mínima (%)</Label>
                        <NumberInput
                          value={editingTargeting.minAffinityScore ?? ''}
                          onValueChange={(val) => setEditingTargeting({ ...editingTargeting, minAffinityScore: val })}
                          min={0}
                          max={100}
                          placeholder="0"
                          className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                        />
                      </div>
                      <div>
                        <Label className="dark:text-gray-200">Afinidad Máxima (%)</Label>
                        <NumberInput
                          value={editingTargeting.maxAffinityScore ?? ''}
                          onValueChange={(val) => setEditingTargeting({ ...editingTargeting, maxAffinityScore: val })}
                          min={0}
                          max={100}
                          placeholder="100"
                          className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer Segments */}
                  <div className="space-y-3">
                    <Label className="dark:text-gray-200">Segmentos de Cliente</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {CUSTOMER_SEGMENTS.map((segment) => {
                        const isSelected = (editingTargeting.customerSegments || []).includes(segment.value);
                        return (
                          <div
                            key={segment.value}
                            onClick={() => toggleCustomerSegment(segment.value)}
                            className={`cursor-pointer p-3 border-2 rounded-lg transition-all ${
                              isSelected
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <div className="font-medium text-sm dark:text-gray-100">{segment.label}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {segment.description}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Engagement Levels */}
                  <div className="space-y-3">
                    <Label className="dark:text-gray-200">Niveles de Engagement</Label>
                    <div className="flex gap-2 flex-wrap">
                      {ENGAGEMENT_LEVELS.map((level) => {
                        const isSelected = (editingTargeting.engagementLevels || []).includes(level.value);
                        return (
                          <button
                            key={level.value}
                            onClick={() => toggleEngagementLevel(level.value)}
                            className={`px-4 py-2 rounded-lg text-white font-medium text-sm transition-all ${
                              level.color
                            } ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : 'opacity-50 hover:opacity-100'}`}
                          >
                            {level.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Purchase Filters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="dark:text-gray-200">Compras Mínimas</Label>
                      <NumberInput
                        value={editingTargeting.minPurchaseCount ?? ''}
                        onValueChange={(val) => setEditingTargeting({ ...editingTargeting, minPurchaseCount: val })}
                        min={1}
                        placeholder="ej: 3"
                        className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                      />
                    </div>
                    <div>
                      <Label className="dark:text-gray-200">Compras Máximas</Label>
                      <NumberInput
                        value={editingTargeting.maxPurchaseCount ?? ''}
                        onValueChange={(val) => setEditingTargeting({ ...editingTargeting, maxPurchaseCount: val })}
                        min={1}
                        placeholder="ej: 10"
                        className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                      />
                    </div>
                  </div>

                  {/* Spending Filters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="dark:text-gray-200">Gasto Mínimo ($)</Label>
                      <NumberInput
                        value={editingTargeting.minTotalSpent ?? ''}
                        onValueChange={(val) => setEditingTargeting({ ...editingTargeting, minTotalSpent: val })}
                        step={0.01}
                        min={0}
                        placeholder="0"
                        className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                      />
                    </div>
                    <div>
                      <Label className="dark:text-gray-200">Gasto Máximo ($)</Label>
                      <NumberInput
                        value={editingTargeting.maxTotalSpent ?? ''}
                        onValueChange={(val) => setEditingTargeting({ ...editingTargeting, maxTotalSpent: val })}
                        step={0.01}
                        min={0}
                        placeholder="Sin límite"
                        className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                      />
                    </div>
                  </div>

                  {/* Recency Filters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="dark:text-gray-200">Días Sin Comprar (Mín)</Label>
                      <NumberInput
                        value={editingTargeting.minDaysSinceLastPurchase ?? ''}
                        onValueChange={(val) => setEditingTargeting({ ...editingTargeting, minDaysSinceLastPurchase: val })}
                        min={0}
                        placeholder="ej: 30"
                        className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                      />
                    </div>
                    <div>
                      <Label className="dark:text-gray-200">Días Sin Comprar (Máx)</Label>
                      <NumberInput
                        value={editingTargeting.maxDaysSinceLastPurchase ?? ''}
                        onValueChange={(val) => setEditingTargeting({ ...editingTargeting, maxDaysSinceLastPurchase: val })}
                        min={0}
                        placeholder="ej: 90"
                        className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                      />
                    </div>
                  </div>

                  {/* Predictive Filters */}
                  <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <Label className="text-green-900 dark:text-green-100 font-semibold">
                        Filtros Predictivos
                      </Label>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={editingTargeting.includeRepurchasePredictions || false}
                        onCheckedChange={(checked) => setEditingTargeting({
                          ...editingTargeting,
                          includeRepurchasePredictions: checked
                        })}
                      />
                      <span className="text-sm dark:text-gray-200">
                        Incluir clientes con predicción de recompra
                      </span>
                    </label>
                    {editingTargeting.includeRepurchasePredictions && (
                      <div>
                        <Label className="dark:text-gray-200">Ventana de Recompra (días)</Label>
                        <NumberInput
                          value={editingTargeting.repurchaseWindowDays ?? ''}
                          onValueChange={(val) => setEditingTargeting({ ...editingTargeting, repurchaseWindowDays: val })}
                          min={1}
                          placeholder="7"
                          className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                        />
                      </div>
                    )}
                  </div>

                  {/* Acquisition vs Retention */}
                  <div className="space-y-3">
                    <Label className="dark:text-gray-200">Tipo de Campaña</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg dark:border-gray-700">
                        <Checkbox
                          checked={editingTargeting.neverPurchasedProduct || false}
                          onCheckedChange={(checked) => setEditingTargeting({
                            ...editingTargeting,
                            neverPurchasedProduct: checked,
                            hasPurchasedProduct: checked ? false : undefined,
                          })}
                        />
                        <span className="text-sm dark:text-gray-200">
                          Clientes que NUNCA compraron (Adquisición)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg dark:border-gray-700">
                        <Checkbox
                          checked={editingTargeting.includeInactiveCustomers || false}
                          onCheckedChange={(checked) => setEditingTargeting({
                            ...editingTargeting,
                            includeInactiveCustomers: checked
                          })}
                        />
                        <span className="text-sm dark:text-gray-200">
                          Incluir clientes inactivos
                        </span>
                      </label>
                    </div>
                  </div>

                  <Button onClick={handleSaveProductTargeting} className="w-full">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Guardar Criterio de Producto
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Campaign Details */}
        <TabsContent value="details" className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Información de la Campaña</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="dark:text-gray-200">Nombre de la Campaña *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej: Reactivación Aceite de Coco - Clientes Champion"
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                />
              </div>

              <div>
                <Label className="dark:text-gray-200">Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el objetivo de esta campaña..."
                  rows={3}
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="dark:text-gray-200">Categoría de Campaña</Label>
                  <Select
                    value={formData.campaignCategory}
                    onValueChange={(value) => setFormData({ ...formData, campaignCategory: value })}
                  >
                    <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      {CAMPAIGN_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value} className="dark:text-gray-200">
                          <div>
                            <div className="font-medium">{cat.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{cat.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="dark:text-gray-200">Tipo de Campaña</Label>
                  <Select
                    value={formData.productCampaignType}
                    onValueChange={(value) => setFormData({ ...formData, productCampaignType: value })}
                  >
                    <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      {CAMPAIGN_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value} className="dark:text-gray-200">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="dark:text-gray-200">Costo Estimado</Label>
                  <NumberInput
                    value={formData.cost ?? ''}
                    onValueChange={(val) => setFormData({ ...formData, cost: val || 0 })}
                    step={0.01}
                    min={0}
                    placeholder="0"
                    className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                  />
                </div>

                <div>
                  <Label className="dark:text-gray-200">Fecha Programada (Opcional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduledDate || ''}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                  />
                </div>
              </div>

              <div>
                <Label className="dark:text-gray-200">Notas Internas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas para tu equipo..."
                  rows={2}
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Content */}
        <TabsContent value="content" className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Canal y Contenido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="dark:text-gray-200">Canal de Comunicación *</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {CHANNELS.map((channel) => {
                    const Icon = channel.icon;
                    const isSelected = formData.channel === channel.value;
                    return (
                      <button
                        key={channel.value}
                        onClick={() => setFormData({ ...formData, channel: channel.value })}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${
                          isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                        }`} />
                        <p className="text-sm font-medium dark:text-gray-100">{channel.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.channel === 'email' && (
                <div>
                  <Label className="dark:text-gray-200">Asunto del Email *</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="ej: ¡Te extrañamos! 20% de descuento en tu producto favorito"
                    className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                  />
                </div>
              )}

              <div>
                <Label className="dark:text-gray-200">Mensaje *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Escribe el mensaje de tu campaña..."
                  rows={6}
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                />
              </div>

              {formData.channel === 'email' && (
                <div>
                  <Label className="dark:text-gray-200">Contenido HTML (Opcional)</Label>
                  <Textarea
                    value={formData.htmlContent}
                    onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                    placeholder="<html>...</html>"
                    rows={8}
                    className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200 font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Offer */}
        <TabsContent value="offer" className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Configuración de Oferta</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Opcional - Agrega un descuento o promoción especial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="dark:text-gray-200">Tipo de Oferta</Label>
                <Select
                  value={formData.offer?.type || ''}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    offer: { ...formData.offer, type: value, value: 0 }
                  })}
                >
                  <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue placeholder="Seleccionar tipo de oferta" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {OFFER_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value} className="dark:text-gray-200">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.offer?.type && (
                <>
                  <div>
                    <Label className="dark:text-gray-200">
                      Valor {formData.offer.type === 'percentage' ? '(%)' : '($)'}
                    </Label>
                    <NumberInput
                      value={formData.offer.value ?? ''}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        offer: { ...formData.offer, value: val || 0 }
                      })}
                      step={0.01}
                      min={0}
                      placeholder="ej: 20"
                      className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                    />
                  </div>

                  <div>
                    <Label className="dark:text-gray-200">Código de Cupón (Opcional)</Label>
                    <Input
                      value={formData.offer.couponCode || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        offer: { ...formData.offer, couponCode: e.target.value }
                      })}
                      placeholder="ej: REACTIVATE20"
                      className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                    />
                  </div>

                  <div>
                    <Label className="dark:text-gray-200">Fecha de Expiración (Opcional)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.offer.expiresAt || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        offer: { ...formData.offer, expiresAt: e.target.value }
                      })}
                      className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t dark:border-gray-700">
        <Button variant="outline" onClick={onCancel} className="dark:border-gray-600 dark:text-gray-200">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Crear Campaña de Producto
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
