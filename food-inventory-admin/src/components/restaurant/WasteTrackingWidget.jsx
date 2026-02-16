import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  getWasteEntries,
  createWasteEntry,
  updateWasteEntry,
  deleteWasteEntry,
  getWasteAnalytics,
  getWasteTrends,
  getProducts,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  PieChart,
  BarChart3,
  Calendar,
  Filter,
  Plus,
  Edit,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const WASTE_REASONS = [
  { value: 'spoilage', label: 'Deterioro/Caducidad', icon: '🦠', color: 'bg-purple-100 text-purple-800' },
  { value: 'overproduction', label: 'Sobreproducción', icon: '📦', color: 'bg-blue-100 text-blue-800' },
  { value: 'preparation-error', label: 'Error de Preparación', icon: '👨‍🍳', color: 'bg-orange-100 text-orange-800' },
  { value: 'customer-return', label: 'Devolución Cliente', icon: '↩️', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'accident', label: 'Accidente/Derrame', icon: '💥', color: 'bg-red-100 text-red-800' },
  { value: 'quality-issue', label: 'Problema de Calidad', icon: '⚠️', color: 'bg-pink-100 text-pink-800' },
  { value: 'expired', label: 'Expirado', icon: '⏰', color: 'bg-gray-100 text-gray-800' },
  { value: 'broken-damaged', label: 'Roto/Dañado', icon: '🔨', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'other', label: 'Otro', icon: '❓', color: 'bg-slate-100 text-slate-800' },
];

const WasteTrackingWidget = () => {
  const [activeTab, setActiveTab] = useState('entries');
  const [entries, setEntries] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    location: '',
    isPreventable: undefined,
  });

  // Form state
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 0,
    unit: '',
    reason: 'spoilage',
    location: '',
    notes: '',
    wasteDate: new Date().toISOString().split('T')[0],
    isPreventable: false,
    environmentalFactors: {
      temperature: null,
      humidity: null,
      storageCondition: '',
    },
  });

  const [availableUnits, setAvailableUnits] = useState([]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWasteEntries(filters);
      setEntries(data || []);
    } catch (error) {
      toast.error('Error al cargar entradas de desperdicio', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await getWasteAnalytics(filters);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }, [filters]);

  const fetchTrends = useCallback(async () => {
    try {
      const data = await getWasteTrends(filters);
      setTrends(data);
    } catch (error) {
      console.error('Error loading trends:', error);
    }
  }, [filters]);

  const fetchProducts = useCallback(async () => {
    try {
      // Fetch all products without active filter to debug visibility
      const data = await getProducts({ limit: 1000 });
      const productList = Array.isArray(data) ? data : (data?.data || []);
      setProducts(productList);

      if (productList.length === 0) {
        console.warn('No products found via API (filters removed)');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar productos del inventario');
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchProducts();
  }, [fetchEntries, fetchProducts]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'trends') {
      fetchTrends();
    }
  }, [activeTab, fetchAnalytics, fetchTrends]);

  const handleCreateEntry = async () => {
    try {
      // Find the selected unit to get conversion factor
      const selectedUnitInfo = availableUnits.find(u => u.name === formData.unit);
      const conversionFactor = selectedUnitInfo?.conversionFactor || 1;

      // Calculate quantity in base units for accurate inventory deduction
      const baseQuantity = formData.quantity * conversionFactor;

      // We will send the BASE QUANTITY to ensure inventory is deducted correctly.
      // We also verify if we should send the base Unit name or keep the original. 
      // To ensure consistency with the backend inventory deduction which relies on base quantity, 
      // we send baseQuantity and the baseUnit name.
      // We add a note about original entry.

      const product = products.find(p => p._id === formData.productId);
      const baseUnit = product?.unitOfMeasure || 'unidad';

      const originalNote = selectedUnitInfo?.conversionFactor > 1
        ? ` (Registrado como: ${formData.quantity} ${formData.unit})`
        : '';

      // Clean environmental factors
      const cleanedData = {
        ...formData,
        quantity: baseQuantity, // Send converted quantity
        unit: baseUnit,        // Send base unit
        notes: (formData.notes || '') + originalNote,
        environmentalFactors: formData.environmentalFactors.temperature ||
          formData.environmentalFactors.humidity ||
          formData.environmentalFactors.storageCondition
          ? formData.environmentalFactors
          : undefined,
      };

      await createWasteEntry(cleanedData);
      toast.success('Entrada de desperdicio creada');
      setShowAddDialog(false);
      resetForm();
      fetchEntries();
      if (activeTab === 'analytics') fetchAnalytics();
    } catch (error) {
      toast.error('Error al crear entrada', { description: error.message });
    }
  };

  const handleUpdateEntry = async () => {
    try {
      if (!showEditDialog) return;

      // Find the selected unit to get conversion factor
      const selectedUnitInfo = availableUnits.find(u => u.name === formData.unit);
      const conversionFactor = selectedUnitInfo?.conversionFactor || 1;

      // Calculate quantity in base units for accurate inventory deduction
      const baseQuantity = formData.quantity * conversionFactor;

      const product = products.find(p => p._id === formData.productId);
      const baseUnit = product?.unitOfMeasure || 'unidad';

      const originalNote = selectedUnitInfo?.conversionFactor > 1
        ? ` (Registrado como: ${formData.quantity} ${formData.unit})`
        : '';

      const cleanedData = {
        ...formData,
        quantity: baseQuantity, // Send converted quantity
        unit: baseUnit,        // Send base unit
        notes: (formData.notes || '') + originalNote,
        environmentalFactors: formData.environmentalFactors.temperature ||
          formData.environmentalFactors.humidity ||
          formData.environmentalFactors.storageCondition
          ? formData.environmentalFactors
          : undefined,
      };

      await updateWasteEntry(showEditDialog._id, cleanedData);
      toast.success('Entrada de desperdicio actualizada');
      setShowEditDialog(null);
      resetForm();
      fetchEntries();
      if (activeTab === 'analytics') fetchAnalytics();
    } catch (error) {
      toast.error('Error al actualizar entrada', { description: error.message });
    }
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta entrada de desperdicio?')) {
      try {
        await deleteWasteEntry(id);
        toast.success('Entrada de desperdicio eliminada');
        fetchEntries();
        if (activeTab === 'analytics') fetchAnalytics();
      } catch (error) {
        toast.error('Error al eliminar entrada', { description: error.message });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      quantity: 0,
      unit: '',
      reason: 'spoilage',
      location: '',
      notes: '',
      wasteDate: new Date().toISOString().split('T')[0],
      isPreventable: false,
      environmentalFactors: {
        temperature: null,
        humidity: null,
        storageCondition: '',
      },
    });
    setAvailableUnits([]);
  };


  const openEditDialog = (entry) => {
    setFormData({
      productId: entry.productId,
      quantity: entry.quantity,
      unit: entry.unit,
      reason: entry.reason,
      location: entry.location || '',
      notes: entry.notes || '',
      wasteDate: entry.wasteDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      isPreventable: entry.isPreventable || false,
      environmentalFactors: entry.environmentalFactors || {
        temperature: null,
        humidity: null,
        storageCondition: '',
      },
    });
    setShowEditDialog(entry);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getReasonConfig = (reason) => {
    return WASTE_REASONS.find(r => r.value === reason) || WASTE_REASONS[WASTE_REASONS.length - 1];
  };

  return (
    <div className="space-y-6">
      {/* Header with quick stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Desperdiciado</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.summary?.totalCost || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Entradas</p>
                  <p className="text-2xl font-bold">{analytics.summary?.totalEntries || 0}</p>
                </div>
                <Trash2 className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Prevenible</p>
                  <p className="text-2xl font-bold">
                    {Math.round(analytics.summary?.preventableWaste?.percentage || 0)}%
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Costo Prevenible</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(analytics.summary?.preventableWaste?.cost || 0)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main content with tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestión de Desperdicios</CardTitle>
              <CardDescription>
                Rastrea y analiza desperdicios para reducir costos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Desperdicio
              </Button>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Razón</Label>
                <Select value={filters.reason} onValueChange={(val) => setFilters({ ...filters, reason: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {WASTE_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.icon} {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input
                  placeholder="Cocina, Almacén..."
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchEntries} className="w-full">
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="entries">
                <Package className="h-4 w-4 mr-2" />
                Entradas
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <PieChart className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="trends">
                <BarChart3 className="h-4 w-4 mr-2" />
                Tendencias
              </TabsTrigger>
            </TabsList>

            {/* Entries Tab */}
            <TabsContent value="entries" className="mt-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : entries.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No hay entradas de desperdicio para el período seleccionado.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Razón</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Costo</TableHead>
                        <TableHead>Prevenible</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => {
                        const reasonConfig = getReasonConfig(entry.reason);
                        return (
                          <TableRow key={entry._id}>
                            <TableCell>{formatDate(entry.wasteDate || entry.createdAt)}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{entry.productName}</div>
                                {entry.sku && (
                                  <div className="text-xs text-gray-500">SKU: {entry.sku}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {entry.quantity} {entry.unit}
                            </TableCell>
                            <TableCell>
                              <Badge className={reasonConfig.color}>
                                {reasonConfig.icon} {reasonConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{entry.location || '-'}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(entry.totalCost)}
                            </TableCell>
                            <TableCell>
                              {entry.isPreventable ? (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  Sí
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-500">
                                  No
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(entry)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEntry(entry._id)}
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-6">
              {analytics ? (
                <div className="space-y-6">
                  {/* By Reason */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Desperdicio por Razón</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analytics.byReason?.map((item) => {
                        const reasonConfig = getReasonConfig(item.reason);
                        return (
                          <Card key={item.reason}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{reasonConfig.label}</span>
                                <Badge className={reasonConfig.color}>{Math.round(item.percentage)}%</Badge>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex justify-between">
                                  <span>Entradas:</span>
                                  <span className="font-medium">{item.count}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Cantidad:</span>
                                  <span className="font-medium">{item.quantity}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Costo:</span>
                                  <span className="font-medium text-red-600">{formatCurrency(item.cost)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Wasted Products */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Productos Más Desperdiciados</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Frecuencia</TableHead>
                          <TableHead>Razón Principal</TableHead>
                          <TableHead>Costo Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.topWastedProducts?.slice(0, 10).map((product) => (
                          <TableRow key={product.productId}>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell>{product.sku}</TableCell>
                            <TableCell>{product.quantity}</TableCell>
                            <TableCell>{product.frequency}x</TableCell>
                            <TableCell>
                              <Badge className={getReasonConfig(product.mainReason).color}>
                                {getReasonConfig(product.mainReason).label}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-red-600">
                              {formatCurrency(product.cost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Recommendations */}
                  {analytics.recommendations && analytics.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Recomendaciones</h3>
                      <div className="space-y-2">
                        {analytics.recommendations.map((rec, idx) => (
                          <Alert key={idx}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{rec}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              )}
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="mt-6">
              {trends ? (
                <div className="space-y-6">
                  {/* Weekly & Monthly Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Comparación Semanal</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Semana Actual:</span>
                            <span className="font-bold">{formatCurrency(trends.weeklyComparison?.currentWeek || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Semana Anterior:</span>
                            <span className="font-bold">{formatCurrency(trends.weeklyComparison?.previousWeek || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-medium">Cambio:</span>
                            <div className="flex items-center gap-2">
                              {trends.weeklyComparison?.change > 0 ? (
                                <TrendingUp className="h-4 w-4 text-red-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-green-500" />
                              )}
                              <span className={`font-bold ${trends.weeklyComparison?.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {Math.abs(trends.weeklyComparison?.change || 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Comparación Mensual</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Mes Actual:</span>
                            <span className="font-bold">{formatCurrency(trends.monthlyComparison?.currentMonth || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Mes Anterior:</span>
                            <span className="font-bold">{formatCurrency(trends.monthlyComparison?.previousMonth || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-medium">Cambio:</span>
                            <div className="flex items-center gap-2">
                              {trends.monthlyComparison?.change > 0 ? (
                                <TrendingUp className="h-4 w-4 text-red-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-green-500" />
                              )}
                              <span className={`font-bold ${trends.monthlyComparison?.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {Math.abs(trends.monthlyComparison?.change || 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Daily Data */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Datos Diarios</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Entradas</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Costo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trends.dailyData?.slice(-14).reverse().map((day) => (
                            <TableRow key={day.date}>
                              <TableCell>{formatDate(day.date)}</TableCell>
                              <TableCell>{day.count}</TableCell>
                              <TableCell>{day.quantity}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(day.cost)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || showEditDialog !== null} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setShowEditDialog(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? 'Editar Entrada de Desperdicio' : 'Nueva Entrada de Desperdicio'}
            </DialogTitle>
            <DialogDescription>
              Registra productos desperdiciados para análisis y reducción de costos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product Selection */}
            <div>
              <Label>Producto *</Label>
              <Select value={formData.productId} onValueChange={(val) => {
                const product = products.find(p => p._id === val);

                // Prepare units list
                const units = [];
                if (product) {
                  // If product has distinct selling units, use ONLY those (as requested)
                  // Otherwise, fall back to base unitOfMeasure

                  if (product.sellingUnits && product.sellingUnits.length > 0) {
                    // Populate exclusively from sellingUnits
                    product.sellingUnits.forEach(u => {
                      if (u.isActive !== false) {
                        units.push({
                          name: u.name,
                          conversionFactor: u.conversionFactor,
                          isBase: false
                        });
                      }
                    });
                  } else {
                    // Fallback to base unit only if no selling units defined
                    if (product.unitOfMeasure) {
                      units.push({ name: product.unitOfMeasure, conversionFactor: 1, isBase: true });
                    } else {
                      units.push({ name: 'unidad', conversionFactor: 1, isBase: true }); // Fallback
                    }
                  }
                }
                setAvailableUnits(units);

                setFormData({
                  ...formData,
                  productId: val,
                  unit: units.length > 0 ? units[0].name : '', // Default to first unit (base)
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name} {product.sku && `(${product.sku})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cantidad *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Unidad *</Label>
                {availableUnits.length > 0 ? (
                  <Select
                    value={formData.unit}
                    onValueChange={(val) => setFormData({ ...formData, unit: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits.map((u, idx) => (
                        <SelectItem key={idx} value={u.name}>
                          {u.name} {u.conversionFactor > 1 && `(x${u.conversionFactor})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione producto..." />
                    </SelectTrigger>
                  </Select>
                )}
              </div>
            </div>

            <div>
              <Label>Razón *</Label>
              <Select value={formData.reason} onValueChange={(val) => setFormData({ ...formData, reason: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WASTE_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.icon} {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ubicación</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Cocina, Almacén, Bar..."
                />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.wasteDate}
                  onChange={(e) => setFormData({ ...formData, wasteDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Detalles adicionales..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isPreventable}
                onCheckedChange={(checked) => setFormData({ ...formData, isPreventable: checked })}
              />
              <Label>¿Este desperdicio era prevenible?</Label>
            </div>

            {/* Environmental Factors (Optional) */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Factores Ambientales (Opcional)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Temperatura (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.environmentalFactors.temperature || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      environmentalFactors: {
                        ...formData.environmentalFactors,
                        temperature: e.target.value ? parseFloat(e.target.value) : null,
                      },
                    })}
                  />
                </div>
                <div>
                  <Label>Humedad (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={formData.environmentalFactors.humidity || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      environmentalFactors: {
                        ...formData.environmentalFactors,
                        humidity: e.target.value ? parseFloat(e.target.value) : null,
                      },
                    })}
                  />
                </div>
                <div>
                  <Label>Almacenamiento</Label>
                  <Select
                    value={formData.environmentalFactors.storageCondition}
                    onValueChange={(val) => setFormData({
                      ...formData,
                      environmentalFactors: {
                        ...formData.environmentalFactors,
                        storageCondition: val,
                      },
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Condición" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguna</SelectItem>
                      <SelectItem value="refrigerated">Refrigerado</SelectItem>
                      <SelectItem value="frozen">Congelado</SelectItem>
                      <SelectItem value="ambient">Ambiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setShowEditDialog(null);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={showEditDialog ? handleUpdateEntry : handleCreateEntry}>
              {showEditDialog ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WasteTrackingWidget;
