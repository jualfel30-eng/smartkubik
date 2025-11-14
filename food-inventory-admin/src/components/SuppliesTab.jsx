import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx';
import { fetchApi } from '../lib/api';
import { useSupplies } from '@/hooks/useSupplies.ts';
import { SUPPLY_CATEGORIES, CONSUMPTION_TYPES } from '@/types/consumables.ts';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Wrench,
  ClipboardList,
  BarChart3,
  CheckCircle,
  XCircle,
  Calendar,
  Calculator
} from 'lucide-react';
import { UnitConversionDialog } from './UnitConversionDialog';
import { useUnitConversions } from '../hooks/useUnitConversions';

function SuppliesTab() {
  // State for supply configurations
  const [supplyConfigs, setSupplyConfigs] = useState([]);
  const [consumptionLogs, setConsumptionLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('configs');

  // Dialog states
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isConsumptionDialogOpen, setIsConsumptionDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [selectedProductForUnits, setSelectedProductForUnits] = useState(null);
  const [unitConfig, setUnitConfig] = useState(null);

  // Form states for supply config
  const [configForm, setConfigForm] = useState({
    productId: '',
    supplyCategory: '',
    supplySubcategory: '',
    requiresTracking: false,
    requiresAuthorization: false,
    usageDepartment: '',
    estimatedMonthlyConsumption: 0,
    unitOfMeasure: 'unidad',
    safetyInfo: {
      requiresPPE: false,
      isHazardous: false,
      storageRequirements: '',
      handlingInstructions: '',
    },
    notes: '',
  });

  // Form states for consumption log
  const [consumptionForm, setConsumptionForm] = useState({
    supplyId: '',
    quantityConsumed: 0,
    unitOfMeasure: 'unidad',
    consumptionType: 'manual',
    department: '',
    consumedBy: '',
    reason: '',
    notes: '',
    costInfo: {
      unitCost: 0,
      totalCost: 0,
      currency: 'USD',
    },
  });

  const supplies = useSupplies();
  const { getConfigByProductId, createConfig, updateConfig } = useUnitConversions();

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load supply configurations
      const configsResult = await supplies.listSupplyConfigs({ isActive: true });
      if (configsResult.success) {
        setSupplyConfigs(configsResult.data || []);
      }

      // Load only supply products (max limit is 500)
      const productsResponse = await fetchApi('/products?limit=500&productType=supply');
      setProducts(productsResponse.data || productsResponse || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConsumptionLogs = async (supplyId) => {
    if (!supplyId) return;
    try {
      const result = await supplies.getConsumptionLogs(supplyId);
      if (result.success) {
        setConsumptionLogs(result.data || []);
      }
    } catch (error) {
      console.error('Error loading consumption logs:', error);
    }
  };

  const handleCreateConfig = async () => {
    try {
      const result = await supplies.createSupplyConfig(configForm);
      if (result.success) {
        alert('Configuración de suministro creada exitosamente');
        setIsConfigDialogOpen(false);
        resetConfigForm();
        loadData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error al crear configuración: ${error.message}`);
    }
  };

  const handleUpdateConfig = async () => {
    if (!editingConfig) return;
    try {
      const result = await supplies.updateSupplyConfig(editingConfig._id, configForm);
      if (result.success) {
        alert('Configuración actualizada exitosamente');
        setIsConfigDialogOpen(false);
        setEditingConfig(null);
        resetConfigForm();
        loadData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error al actualizar configuración: ${error.message}`);
    }
  };

  const handleLogConsumption = async () => {
    try {
      const result = await supplies.logConsumption(consumptionForm);
      if (result.success) {
        alert('Consumo registrado exitosamente');
        setIsConsumptionDialogOpen(false);
        resetConsumptionForm();
        loadConsumptionLogs(consumptionForm.supplyId);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error al registrar consumo: ${error.message}`);
    }
  };

  const openEditConfigDialog = (config) => {
    setEditingConfig(config);
    setConfigForm({
      productId: config.productId,
      supplyCategory: config.supplyCategory,
      supplySubcategory: config.supplySubcategory,
      requiresTracking: config.requiresTracking,
      requiresAuthorization: config.requiresAuthorization,
      usageDepartment: config.usageDepartment || '',
      estimatedMonthlyConsumption: config.estimatedMonthlyConsumption || 0,
      unitOfMeasure: config.unitOfMeasure,
      safetyInfo: config.safetyInfo || {
        requiresPPE: false,
        isHazardous: false,
        storageRequirements: '',
        handlingInstructions: '',
      },
      notes: config.notes || '',
    });
    setIsConfigDialogOpen(true);
  };

  const resetConfigForm = () => {
    setConfigForm({
      productId: '',
      supplyCategory: '',
      supplySubcategory: '',
      requiresTracking: false,
      requiresAuthorization: false,
      usageDepartment: '',
      estimatedMonthlyConsumption: 0,
      unitOfMeasure: 'unidad',
      safetyInfo: {
        requiresPPE: false,
        isHazardous: false,
        storageRequirements: '',
        handlingInstructions: '',
      },
      notes: '',
    });
    setEditingConfig(null);
  };

  const resetConsumptionForm = () => {
    setConsumptionForm({
      supplyId: '',
      quantityConsumed: 0,
      unitOfMeasure: 'unidad',
      consumptionType: 'manual',
      department: '',
      consumedBy: '',
      reason: '',
      notes: '',
      costInfo: {
        unitCost: 0,
        totalCost: 0,
        currency: 'USD',
      },
    });
  };

  // Unit conversions functions
  const openUnitConversionDialog = async (config) => {
    const product = products.find(p => p._id === config.productId || p._id === config.productId?._id);
    if (!product) {
      alert('Producto no encontrado');
      return;
    }

    setSelectedProductForUnits(product);

    try {
      const existingConfig = await getConfigByProductId(product._id);
      setUnitConfig(existingConfig);
    } catch (error) {
      setUnitConfig(null);
    }

    setIsUnitDialogOpen(true);
  };

  const handleSaveUnitConfig = async (configData) => {
    try {
      if (unitConfig) {
        await updateConfig(unitConfig._id, configData);
      } else {
        await createConfig(configData);
      }
      setIsUnitDialogOpen(false);
      setSelectedProductForUnits(null);
      setUnitConfig(null);
    } catch (error) {
      throw error;
    }
  };

  // Get product name by ID (handles both populated objects and string IDs)
  const getProductName = (productId) => {
    // Handle populated object from MongoDB
    if (typeof productId === 'object' && productId?.name) {
      return productId.name;
    }
    // Handle string ID or ObjectId string
    const idString = typeof productId === 'object' ? productId?._id : productId;
    const product = products.find((p) => p._id === idString);
    return product ? product.name : (idString || 'Desconocido');
  };

  // Filter supplies by search term
  const filteredConfigs = supplyConfigs.filter((config) => {
    const productName = getProductName(config.productId).toLowerCase();
    const category = config.supplyCategory.toLowerCase();
    const subcategory = config.supplySubcategory.toLowerCase();
    const search = searchTerm.toLowerCase();
    return productName.includes(search) || category.includes(search) || subcategory.includes(search);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando suministros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Gestión de Suministros</h3>
          <p className="text-muted-foreground">
            Configura y rastrea suministros operacionales
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetConfigForm} className="bg-[#FB923C] hover:bg-[#F97316]">
                <Plus className="h-4 w-4 mr-2" />
                Configurar Suministro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? 'Editar' : 'Crear'} Configuración de Suministro
                </DialogTitle>
                <DialogDescription>
                  Define cómo se gestiona un producto cuando es usado como suministro operacional
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="config-product">Producto *</Label>
                  <Select
                    value={configForm.productId}
                    onValueChange={(value) => setConfigForm({ ...configForm, productId: value })}
                    disabled={!!editingConfig}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoría *</Label>
                    <Select
                      value={configForm.supplyCategory}
                      onValueChange={(value) => setConfigForm({ ...configForm, supplyCategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPLY_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Subcategoría *</Label>
                    <Input
                      value={configForm.supplySubcategory}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, supplySubcategory: e.target.value })
                      }
                      placeholder="Ej: Detergente, Papel, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departamento de Uso</Label>
                    <Input
                      value={configForm.usageDepartment}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, usageDepartment: e.target.value })
                      }
                      placeholder="Ej: Cocina, Almacén, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Consumo Mensual Estimado</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={configForm.estimatedMonthlyConsumption}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          estimatedMonthlyConsumption: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Unidad de Medida</Label>
                  <Input
                    value={configForm.unitOfMeasure}
                    onChange={(e) => setConfigForm({ ...configForm, unitOfMeasure: e.target.value })}
                  />
                </div>

                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold text-sm">Información de Seguridad</h4>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="requires-ppe">¿Requiere EPP?</Label>
                    <Switch
                      id="requires-ppe"
                      checked={configForm.safetyInfo.requiresPPE}
                      onCheckedChange={(checked) =>
                        setConfigForm({
                          ...configForm,
                          safetyInfo: { ...configForm.safetyInfo, requiresPPE: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="is-hazardous">¿Es peligroso?</Label>
                    <Switch
                      id="is-hazardous"
                      checked={configForm.safetyInfo.isHazardous}
                      onCheckedChange={(checked) =>
                        setConfigForm({
                          ...configForm,
                          safetyInfo: { ...configForm.safetyInfo, isHazardous: checked },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Requisitos de Almacenamiento</Label>
                    <Input
                      value={configForm.safetyInfo.storageRequirements}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          safetyInfo: { ...configForm.safetyInfo, storageRequirements: e.target.value },
                        })
                      }
                      placeholder="Ej: Mantener en lugar seco y fresco"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Instrucciones de Manejo</Label>
                    <Textarea
                      value={configForm.safetyInfo.handlingInstructions}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          safetyInfo: { ...configForm.safetyInfo, handlingInstructions: e.target.value },
                        })
                      }
                      placeholder="Instrucciones especiales de manejo..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="requires-tracking">¿Requiere seguimiento?</Label>
                  <Switch
                    id="requires-tracking"
                    checked={configForm.requiresTracking}
                    onCheckedChange={(checked) =>
                      setConfigForm({ ...configForm, requiresTracking: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="requires-authorization">¿Requiere autorización?</Label>
                  <Switch
                    id="requires-authorization"
                    checked={configForm.requiresAuthorization}
                    onCheckedChange={(checked) =>
                      setConfigForm({ ...configForm, requiresAuthorization: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={configForm.notes}
                    onChange={(e) => setConfigForm({ ...configForm, notes: e.target.value })}
                    placeholder="Información adicional sobre este suministro..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={editingConfig ? handleUpdateConfig : handleCreateConfig}>
                  {editingConfig ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isConsumptionDialogOpen} onOpenChange={setIsConsumptionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={resetConsumptionForm}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Registrar Consumo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Consumo de Suministro</DialogTitle>
                <DialogDescription>
                  Registra el uso de un suministro para tracking y reportes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Suministro *</Label>
                  <Select
                    value={consumptionForm.supplyId}
                    onValueChange={(value) => {
                      const config = supplyConfigs.find((c) => c.productId === value);
                      setConsumptionForm({
                        ...consumptionForm,
                        supplyId: value,
                        unitOfMeasure: config?.unitOfMeasure || 'unidad',
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un suministro" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplyConfigs.map((config) => (
                        <SelectItem key={config.productId} value={config.productId}>
                          {getProductName(config.productId)} ({config.supplyCategory})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cantidad Consumida *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={consumptionForm.quantityConsumed}
                      onChange={(e) =>
                        setConsumptionForm({
                          ...consumptionForm,
                          quantityConsumed: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unidad de Medida</Label>
                    <Input value={consumptionForm.unitOfMeasure} disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Consumo</Label>
                  <Select
                    value={consumptionForm.consumptionType}
                    onValueChange={(value) =>
                      setConsumptionForm({ ...consumptionForm, consumptionType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSUMPTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Input
                      value={consumptionForm.department}
                      onChange={(e) =>
                        setConsumptionForm({ ...consumptionForm, department: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Consumido Por</Label>
                    <Input
                      value={consumptionForm.consumedBy}
                      onChange={(e) =>
                        setConsumptionForm({ ...consumptionForm, consumedBy: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Razón</Label>
                  <Input
                    value={consumptionForm.reason}
                    onChange={(e) =>
                      setConsumptionForm({ ...consumptionForm, reason: e.target.value })
                    }
                    placeholder="Ej: Limpieza diaria, Mantenimiento preventivo, etc."
                  />
                </div>

                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold text-sm">Información de Costos (Opcional)</h4>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Costo Unitario</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={consumptionForm.costInfo.unitCost}
                        onChange={(e) =>
                          setConsumptionForm({
                            ...consumptionForm,
                            costInfo: {
                              ...consumptionForm.costInfo,
                              unitCost: parseFloat(e.target.value) || 0,
                              totalCost: (parseFloat(e.target.value) || 0) * consumptionForm.quantityConsumed,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Costo Total</Label>
                      <Input
                        type="number"
                        value={consumptionForm.costInfo.totalCost}
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Moneda</Label>
                      <Select
                        value={consumptionForm.costInfo.currency}
                        onValueChange={(value) =>
                          setConsumptionForm({
                            ...consumptionForm,
                            costInfo: { ...consumptionForm.costInfo, currency: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="VES">VES</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={consumptionForm.notes}
                    onChange={(e) =>
                      setConsumptionForm({ ...consumptionForm, notes: e.target.value })
                    }
                    placeholder="Información adicional sobre este consumo..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConsumptionDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleLogConsumption}>Registrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar suministros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Supply Configs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones de Suministros</CardTitle>
          <CardDescription>
            {filteredConfigs.length} suministro{filteredConfigs.length !== 1 ? 's' : ''} configurado
            {filteredConfigs.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredConfigs.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron suministros' : 'No hay suministros configurados'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead>Peligroso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs.map((config) => (
                  <TableRow key={config._id}>
                    <TableCell className="font-medium">{getProductName(config.productId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {SUPPLY_CATEGORIES.find((c) => c.value === config.supplyCategory)?.label ||
                          config.supplyCategory}
                      </Badge>
                    </TableCell>
                    <TableCell>{config.supplySubcategory}</TableCell>
                    <TableCell>{config.usageDepartment || '-'}</TableCell>
                    <TableCell>
                      {config.requiresTracking ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      {config.safetyInfo?.isHazardous ? (
                        <Badge variant="destructive">Sí</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUnitConversionDialog(config)}
                          title="Configurar unidades de medida"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditConfigDialog(config)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Unit Conversion Dialog */}
      {selectedProductForUnits && (
        <UnitConversionDialog
          isOpen={isUnitDialogOpen}
          onClose={() => {
            setIsUnitDialogOpen(false);
            setSelectedProductForUnits(null);
            setUnitConfig(null);
          }}
          product={selectedProductForUnits}
          existingConfig={unitConfig}
          onSave={handleSaveUnitConfig}
        />
      )}
    </div>
  );
}

export default SuppliesTab;
