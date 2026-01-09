import { useState, useEffect, useCallback } from 'react';
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
import { fetchApi } from '../lib/api';
import { useConsumables } from '@/hooks/useConsumables.ts';
import { CONSUMABLE_TYPES, APPLICABLE_CONTEXTS } from '@/types/consumables.ts';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Layers,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  Calculator
} from 'lucide-react';
import { UnitConversionDialog } from './UnitConversionDialog';
import { useUnitConversions } from '../hooks/useUnitConversions';

function ConsumablesTab() {
  // State for consumable configurations
  const [consumableConfigs, setConsumableConfigs] = useState([]);
  const [relations, setRelations] = useState([]);
  const [products, setProducts] = useState([]); // Consumable products
  const [saleProducts, setSaleProducts] = useState([]); // Sale products for relations
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isRelationDialogOpen, setIsRelationDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [editingRelation, setEditingRelation] = useState(null);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [selectedProductForUnits, setSelectedProductForUnits] = useState(null);
  const [unitConfig, setUnitConfig] = useState(null);

  // Form states for consumable config
  const [configForm, setConfigForm] = useState({
    productId: '',
    consumableType: '',
    isReusable: false,
    isAutoDeducted: true,
    defaultQuantityPerUse: 1,
    unitOfMeasure: 'unidad',
    notes: '',
    isActive: true,
  });

  // Form states for product-consumable relation
  const [relationForm, setRelationForm] = useState({
    productId: '',
    consumableId: '',
    quantityRequired: 1,
    isRequired: true,
    isAutoDeducted: true,
    priority: 1,
    applicableContext: 'always',
    notes: '',
    isActive: true,
  });

  const {
    listConsumableConfigs,
    getProductConsumables,
    createConsumableConfig,
    updateConsumableConfig,
    createProductConsumableRelation,
    updateProductConsumableRelation,
    deleteProductConsumableRelation,
  } = useConsumables();
  const { getConfigByProductId, createConfig, updateConfig } = useUnitConversions();

  // Load data on mount
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load consumable configurations
      const configsResult = await listConsumableConfigs({ isActive: true });
      if (configsResult.success) {
        setConsumableConfigs(configsResult.data || []);
      }

      // Load only consumable products (max limit is 2000)
      const productsResponse = await fetchApi('/products?limit=2000&productType=consumable');
      setProducts(productsResponse.data || productsResponse || []);

      // Load sale products (simple type) for creating relations
      const saleProductsResponse = await fetchApi('/products?limit=2000&productType=simple');
      const saleProductsList = saleProductsResponse.data || saleProductsResponse || [];
      console.log('Loaded sale products:', saleProductsList.length);
      setSaleProducts(saleProductsList);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [listConsumableConfigs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadRelationsForProduct = async (productId) => {
    if (!productId) return;
    try {
      const result = await getProductConsumables(productId);
      if (result.success) {
        setRelations(result.data || []);
      }
    } catch (error) {
      console.error('Error loading relations:', error);
    }
  };

  const handleCreateConfig = async () => {
    try {
      const result = await createConsumableConfig(configForm);
      if (result.success) {
        alert('Configuración de consumible creada exitosamente');
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
      const result = await updateConsumableConfig(editingConfig._id, configForm);
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

  const handleCreateRelation = async () => {
    try {
      const result = await createProductConsumableRelation(relationForm);
      if (result.success) {
        alert('Relación creada exitosamente');
        setIsRelationDialogOpen(false);
        resetRelationForm();
        loadRelationsForProduct(relationForm.productId);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error al crear relación: ${error.message}`);
    }
  };

  const handleUpdateRelation = async () => {
    if (!editingRelation) return;
    try {
      const result = await updateProductConsumableRelation(editingRelation._id, relationForm);
      if (result.success) {
        alert('Relación actualizada exitosamente');
        setIsRelationDialogOpen(false);
        setEditingRelation(null);
        resetRelationForm();
        loadRelationsForProduct(relationForm.productId);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error al actualizar relación: ${error.message}`);
    }
  };

  const handleDeleteRelation = async (relationId) => {
    if (!confirm('¿Estás seguro de eliminar esta relación?')) return;
    try {
      const result = await deleteProductConsumableRelation(relationId);
      if (result.success) {
        alert('Relación eliminada exitosamente');
        loadRelationsForProduct(relationForm.productId);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error al eliminar relación: ${error.message}`);
    }
  };

  const openEditConfigDialog = (config) => {
    setEditingConfig(config);
    setConfigForm({
      productId: config.productId,
      consumableType: config.consumableType,
      isReusable: config.isReusable,
      isAutoDeducted: config.isAutoDeducted,
      defaultQuantityPerUse: config.defaultQuantityPerUse,
      unitOfMeasure: config.unitOfMeasure,
      notes: config.notes || '',
      isActive: config.isActive,
    });
    setIsConfigDialogOpen(true);
  };

  const openEditRelationDialog = (relation) => {
    setEditingRelation(relation);
    setRelationForm({
      productId: relation.productId,
      consumableId: relation.consumableId,
      quantityRequired: relation.quantityRequired,
      isRequired: relation.isRequired,
      isAutoDeducted: relation.isAutoDeducted,
      priority: relation.priority,
      applicableContext: relation.applicableContext,
      notes: relation.notes || '',
      isActive: relation.isActive,
    });
    setIsRelationDialogOpen(true);
  };

  const resetConfigForm = () => {
    setConfigForm({
      productId: '',
      consumableType: '',
      isReusable: false,
      isAutoDeducted: true,
      defaultQuantityPerUse: 1,
      unitOfMeasure: 'unidad',
      notes: '',
      isActive: true,
    });
    setEditingConfig(null);
  };

  const resetRelationForm = () => {
    setRelationForm({
      productId: '',
      consumableId: '',
      quantityRequired: 1,
      isRequired: true,
      isAutoDeducted: true,
      priority: 1,
      applicableContext: 'always',
      notes: '',
      isActive: true,
    });
    setEditingRelation(null);
  };

  // Unit conversions functions
  const openUnitConversionDialog = async (config) => {
    // Get the product object
    const product = products.find(p => p._id === config.productId || p._id === config.productId?._id);
    if (!product) {
      alert('Producto no encontrado');
      return;
    }

    setSelectedProductForUnits(product);

    // Load existing unit config if any
    try {
      const existingConfig = await getConfigByProductId(product._id);
      setUnitConfig(existingConfig);
    } catch (err) {
      console.error('Error loading unit config', err);
      setUnitConfig(null);
    }

    setIsUnitDialogOpen(true);
  };

  const handleSaveUnitConfig = async (configData) => {
    if (unitConfig) {
      await updateConfig(unitConfig._id, configData);
    } else {
      await createConfig(configData);
    }
    setIsUnitDialogOpen(false);
    setSelectedProductForUnits(null);
    setUnitConfig(null);
  };

  // Get product name by ID (handles both populated objects and string IDs)
  const getProductName = (productId) => {
    // Handle populated object from MongoDB
    if (typeof productId === 'object' && productId?.name) {
      return productId.name;
    }
    // Handle string ID or ObjectId string
    const idString = typeof productId === 'object' ? productId?._id : productId;
    const product = products.find(p => p._id === idString);
    return product ? product.name : (idString || 'Desconocido');
  };

  // Filter consumables by search term
  const filteredConfigs = consumableConfigs.filter(config => {
    const productName = getProductName(config.productId).toLowerCase();
    const type = config.consumableType.toLowerCase();
    const search = searchTerm.toLowerCase();
    return productName.includes(search) || type.includes(search);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando consumibles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Gestión de Consumibles</h3>
          <p className="text-muted-foreground">
            Configura productos como consumibles y gestiona sus relaciones
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetConfigForm} className="bg-[#FB923C] hover:bg-[#F97316]">
                <Plus className="h-4 w-4 mr-2" />
                Configurar Consumible
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? 'Editar' : 'Crear'} Configuración de Consumible
                </DialogTitle>
                <DialogDescription>
                  Define cómo se comporta un producto cuando es usado como consumible
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
                      {products.map(product => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consumable-type">Tipo de Consumible *</Label>
                  <Select
                    value={configForm.consumableType}
                    onValueChange={(value) => setConfigForm({ ...configForm, consumableType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSUMABLE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cantidad por Uso</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={configForm.defaultQuantityPerUse}
                      onChange={(e) => setConfigForm({ ...configForm, defaultQuantityPerUse: parseFloat(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unidad de Medida</Label>
                    <Input
                      value={configForm.unitOfMeasure}
                      onChange={(e) => setConfigForm({ ...configForm, unitOfMeasure: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is-reusable">¿Es reutilizable?</Label>
                  <Switch
                    id="is-reusable"
                    checked={configForm.isReusable}
                    onCheckedChange={(checked) => setConfigForm({ ...configForm, isReusable: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is-auto-deducted">¿Deducción automática?</Label>
                  <Switch
                    id="is-auto-deducted"
                    checked={configForm.isAutoDeducted}
                    onCheckedChange={(checked) => setConfigForm({ ...configForm, isAutoDeducted: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is-active">¿Activo?</Label>
                  <Switch
                    id="is-active"
                    checked={configForm.isActive}
                    onCheckedChange={(checked) => setConfigForm({ ...configForm, isActive: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={configForm.notes}
                    onChange={(e) => setConfigForm({ ...configForm, notes: e.target.value })}
                    placeholder="Información adicional sobre este consumible..."
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

          <Dialog open={isRelationDialogOpen} onOpenChange={setIsRelationDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={resetRelationForm}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Crear Relación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRelation ? 'Editar' : 'Crear'} Relación Producto-Consumible
                </DialogTitle>
                <DialogDescription>
                  Define qué consumibles se necesitan para un producto
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Producto de Venta *</Label>
                  <Select
                    value={relationForm.productId}
                    onValueChange={(value) => {
                      setRelationForm({ ...relationForm, productId: value });
                      loadRelationsForProduct(value);
                    }}
                    disabled={!!editingRelation}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un producto de venta" />
                    </SelectTrigger>
                    <SelectContent>
                      {saleProducts.map(product => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name} - {product.sku}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Consumible Requerido *</Label>
                  <Select
                    value={relationForm.consumableId}
                    onValueChange={(value) => setRelationForm({ ...relationForm, consumableId: value })}
                    disabled={!!editingRelation}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un consumible" />
                    </SelectTrigger>
                    <SelectContent>
                      {consumableConfigs.map(config => (
                        <SelectItem key={config.productId} value={config.productId}>
                          {getProductName(config.productId)} ({config.consumableType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cantidad Requerida</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={relationForm.quantityRequired}
                      onChange={(e) => setRelationForm({ ...relationForm, quantityRequired: parseFloat(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Prioridad</Label>
                    <Input
                      type="number"
                      min="1"
                      value={relationForm.priority}
                      onChange={(e) => setRelationForm({ ...relationForm, priority: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Contexto Aplicable</Label>
                  <Select
                    value={relationForm.applicableContext}
                    onValueChange={(value) => setRelationForm({ ...relationForm, applicableContext: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICABLE_CONTEXTS.map(context => (
                        <SelectItem key={context.value} value={context.value}>
                          {context.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>¿Es requerido?</Label>
                  <Switch
                    checked={relationForm.isRequired}
                    onCheckedChange={(checked) => setRelationForm({ ...relationForm, isRequired: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>¿Deducción automática?</Label>
                  <Switch
                    checked={relationForm.isAutoDeducted}
                    onCheckedChange={(checked) => setRelationForm({ ...relationForm, isAutoDeducted: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>¿Activo?</Label>
                  <Switch
                    checked={relationForm.isActive}
                    onCheckedChange={(checked) => setRelationForm({ ...relationForm, isActive: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={relationForm.notes}
                    onChange={(e) => setRelationForm({ ...relationForm, notes: e.target.value })}
                    placeholder="Información adicional sobre esta relación..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRelationDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={editingRelation ? handleUpdateRelation : handleCreateRelation}>
                  {editingRelation ? 'Actualizar' : 'Crear'}
                </Button>
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
            placeholder="Buscar consumibles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Consumable Configs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones de Consumibles</CardTitle>
          <CardDescription>
            {filteredConfigs.length} consumible{filteredConfigs.length !== 1 ? 's' : ''} configurado{filteredConfigs.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredConfigs.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron consumibles' : 'No hay consumibles configurados'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad/Uso</TableHead>
                  <TableHead>Reutilizable</TableHead>
                  <TableHead>Auto-Deducción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs.map((config) => (
                  <TableRow key={config._id}>
                    <TableCell className="font-medium">
                      {getProductName(config.productId)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CONSUMABLE_TYPES.find(t => t.value === config.consumableType)?.label || config.consumableType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.defaultQuantityPerUse} {config.unitOfMeasure}
                    </TableCell>
                    <TableCell>
                      {config.isReusable ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      {config.isAutoDeducted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      {config.isActive ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditConfigDialog(config)}
                        >
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

      {/* Relations Table (shown when a product is selected) */}
      {relations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Relaciones Producto-Consumible</CardTitle>
            <CardDescription>
              Consumibles asociados al producto seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Consumible</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Contexto</TableHead>
                  <TableHead>Requerido</TableHead>
                  <TableHead>Auto-Deducción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relations.map((relation) => (
                  <TableRow key={relation._id}>
                    <TableCell>{getProductName(relation.productId)}</TableCell>
                    <TableCell>{getProductName(relation.consumableId)}</TableCell>
                    <TableCell>{relation.quantityRequired}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {APPLICABLE_CONTEXTS.find(c => c.value === relation.applicableContext)?.label || relation.applicableContext}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {relation.isRequired ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      {relation.isAutoDeducted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditRelationDialog(relation)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRelation(relation._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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

export default ConsumablesTab;
