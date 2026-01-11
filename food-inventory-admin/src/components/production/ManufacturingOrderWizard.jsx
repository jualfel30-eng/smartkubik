import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useProductionVersions } from '@/hooks/useProductionVersions';
import { useBillOfMaterials } from '@/hooks/useBillOfMaterials';
import { useRoutings } from '@/hooks/useRoutings';
import { fetchApi } from '@/lib/api';

export function ManufacturingOrderWizard({ open, onClose, onSave }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  // Form data
  const [productId, setProductId] = useState('');
  const [productionVersionId, setProductionVersionId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [scheduledStartDate, setScheduledStartDate] = useState('');
  const [priority, setPriority] = useState('normal');

  // Calculated data
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [bomData, setBomData] = useState(null);
  const [routingData, setRoutingData] = useState(null);
  const [materialAvailability, setMaterialAvailability] = useState(null);
  const [costEstimate, setCostEstimate] = useState(null);

  const { products, fetchProducts } = useProducts();
  const { productionVersions, fetchProductionVersions } = useProductionVersions();
  const { getBom } = useBillOfMaterials();
  const { getRouting } = useRoutings();

  const totalSteps = 4;

  useEffect(() => {
    if (open) {
      fetchProducts();
      fetchProductionVersions();
      resetForm();
    }
  }, [open, fetchProducts, fetchProductionVersions]);

  useEffect(() => {
    if (productId) {
      const product = products.find(p => p._id === productId);
      setSelectedProduct(product);
      setUnit(product?.unit || '');
    }
  }, [productId, products]);

  const loadVersionDetails = useCallback(async (version) => {
    try {
      setLoading(true);

      // Load BOM
      if (version.bomId) {
        const bom = await getBom(version.bomId);
        setBomData(bom);
      }

      // Load Routing
      if (version.routingId) {
        const routing = await getRouting(version.routingId);
        setRoutingData(routing);
      }
    } catch (error) {
      console.error('Error loading version details:', error);
    } finally {
      setLoading(false);
    }
  }, [getBom, getRouting]);

  useEffect(() => {
    if (productionVersionId) {
      const version = productionVersions.find(v => v._id === productionVersionId);
      setSelectedVersion(version);
      if (version) {
        loadVersionDetails(version);
      }
    }
  }, [productionVersionId, productionVersions, loadVersionDetails]);

  const resetForm = () => {
    setCurrentStep(1);
    setProductId('');
    setProductionVersionId('');
    setQuantity('');
    setUnit('');
    setScheduledStartDate('');
    setPriority('normal');
    setSelectedProduct(null);
    setSelectedVersion(null);
    setBomData(null);
    setRoutingData(null);
    setMaterialAvailability(null);
    setCostEstimate(null);
  };

  const checkMaterialAvailability = async () => {
    if (!bomData || !quantity) return;

    try {
      setValidating(true);
      const response = await fetchApi('/manufacturing-orders/check-materials', {
        method: 'POST',
        body: JSON.stringify({
          bomId: bomData._id,
          quantity: parseFloat(quantity),
          unit: unit
        })
      });

      if (response.success) {
        setMaterialAvailability(response.data);
      }
    } catch (error) {
      console.error('Error checking materials:', error);
    } finally {
      setValidating(false);
    }
  };

  const calculateCostEstimate = async () => {
    if (!bomData || !quantity) return;

    try {
      setValidating(true);
      const response = await fetchApi('/manufacturing-orders/estimate-cost', {
        method: 'POST',
        body: JSON.stringify({
          bomId: bomData._id,
          routingId: routingData?._id,
          quantity: parseFloat(quantity),
          unit: unit
        })
      });

      if (response.success) {
        setCostEstimate(response.data);
      }
    } catch (error) {
      console.error('Error estimating cost:', error);
    } finally {
      setValidating(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!productId || !productionVersionId) {
        alert('Por favor selecciona un producto y una versión de producción');
        return;
      }
    }

    if (currentStep === 2) {
      if (!quantity || parseFloat(quantity) <= 0) {
        alert('Por favor ingresa una cantidad válida');
        return;
      }
      if (!scheduledStartDate) {
        alert('Por favor selecciona una fecha de inicio');
        return;
      }
      await checkMaterialAvailability();
    }

    if (currentStep === 3) {
      await calculateCostEstimate();
    }

    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!selectedVersion || !quantity) {
      alert('Faltan datos requeridos');
      return;
    }

    const orderData = {
      productId: selectedProduct._id,
      productionVersionId: selectedVersion._id,
      bomId: bomData._id,
      routingId: routingData?._id,
      quantityToProduce: parseFloat(quantity),
      unit: unit,
      scheduledStartDate: new Date(scheduledStartDate),
      priority: priority,
      estimatedMaterialCost: costEstimate?.materialCost || 0,
      estimatedLaborCost: costEstimate?.laborCost || 0,
      estimatedOverheadCost: costEstimate?.overheadCost || 0,
      totalEstimatedCost: costEstimate?.totalCost || 0
    };

    await onSave(orderData);
    onClose();
  };

  const filteredVersions = productionVersions.filter(v => v.productId === productId && v.isActive);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Nueva Orden de Manufactura
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Paso {currentStep} de {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% completado</span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} />
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { num: 1, label: 'Producto' },
            { num: 2, label: 'Cantidad' },
            { num: 3, label: 'Materiales' },
            { num: 4, label: 'Costos' }
          ].map(step => (
            <div key={step.num} className={`flex items-center gap-2 ${currentStep >= step.num ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                currentStep > step.num ? 'bg-primary text-primary-foreground' :
                currentStep === step.num ? 'bg-primary/20 text-primary border-2 border-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {currentStep > step.num ? '✓' : step.num}
              </div>
              <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Step Content */}
        <div className="py-4 overflow-y-auto max-h-[calc(90vh-300px)]">
          {/* STEP 1: Product Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Selecciona el Producto a Fabricar</h3>
                <p className="text-sm text-muted-foreground">
                  Elige el producto terminado y la versión de producción a utilizar.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="product" className="text-right">Producto *</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecciona un producto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {productId && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="version" className="text-right">Versión de Producción *</Label>
                    <Select value={productionVersionId} onValueChange={setProductionVersionId}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecciona una versión..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredVersions.length > 0 ? (
                          filteredVersions.map(version => (
                            <SelectItem key={version._id} value={version._id}>
                              {version.name} {version.isDefault && '(Por defecto)'}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No hay versiones disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedProduct && (
                  <Card className="col-span-4">
                    <CardHeader>
                      <CardTitle className="text-base">Información del Producto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SKU:</span>
                        <span className="font-medium">{selectedProduct.sku}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <Badge variant="outline">{selectedProduct.productType}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unidad:</span>
                        <span className="font-medium">{selectedProduct.unit}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedVersion && bomData && (
                  <Card className="col-span-4">
                    <CardHeader>
                      <CardTitle className="text-base">Lista de Materiales (BOM)</CardTitle>
                      <CardDescription>{bomData.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {bomData.components?.map((comp, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm">{comp.componentProductName || comp.componentProductId}</span>
                            <Badge variant="secondary">
                              {comp.quantity} {comp.unit}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Quantity and Schedule */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Cantidad y Programación</h3>
                <p className="text-sm text-muted-foreground">
                  Define cuánto producir y cuándo iniciar.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">Cantidad a Producir *</Label>
                  <div className="col-span-3 flex gap-2">
                    <NumberInput
                      id="quantity"
                      value={quantity ?? ''}
                      onValueChange={(val) => setQuantity(val)}
                      step={0.01}
                      min={0.01}
                      placeholder="100"
                      className="flex-1"
                    />
                    <Input
                      value={unit}
                      disabled
                      className="w-24"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="startDate" className="text-right">Fecha de Inicio *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={scheduledStartDate}
                    onChange={(e) => setScheduledStartDate(e.target.value)}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="priority" className="text-right">Prioridad</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bomData && quantity && (
                  <Card className="col-span-4">
                    <CardHeader>
                      <CardTitle className="text-base">Materiales Necesarios</CardTitle>
                      <CardDescription>
                        Para producir {quantity} {unit} se necesitan:
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {bomData.components?.map((comp, idx) => {
                          const requiredQty = (comp.quantity * parseFloat(quantity || 0)) / bomData.productionQuantity;
                          return (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <span className="text-sm">{comp.componentProductName || comp.componentProductId}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {requiredQty.toFixed(3)} {comp.unit}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Material Availability */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Verificación de Materiales</h3>
                <p className="text-sm text-muted-foreground">
                  Comprobando disponibilidad en inventario...
                </p>
              </div>

              {validating ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : materialAvailability ? (
                <div className="space-y-4">
                  {materialAvailability.allAvailable ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Todos los materiales están disponibles en inventario
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        Algunos materiales no tienen suficiente stock disponible
                      </AlertDescription>
                    </Alert>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Estado de Materiales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {materialAvailability.components?.map((comp, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{comp.productName}</div>
                              <div className="text-xs text-muted-foreground">
                                Necesario: {comp.required} {comp.unit}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {comp.available ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <Badge className="bg-green-500">Disponible</Badge>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  <Badge className="bg-orange-500">
                                    Falta: {comp.missing} {comp.unit}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {!materialAvailability.allAvailable && (
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        Puedes crear requisiciones de compra automáticamente para los materiales faltantes después de crear la orden.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No se pudo verificar la disponibilidad de materiales
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Cost Estimate */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Estimado de Costos</h3>
                <p className="text-sm text-muted-foreground">
                  Costos estimados para esta orden de producción
                </p>
              </div>

              {validating ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : costEstimate ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Materiales
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${costEstimate.materialCost?.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {bomData?.components?.length || 0} componentes
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Mano de Obra
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${costEstimate.laborCost?.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {costEstimate.totalMinutes || 0} minutos estimados
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Overhead
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${costEstimate.overheadCost?.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {costEstimate.overheadRate || 0}% del costo directo
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Costo Total Estimado
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">
                          ${costEstimate.totalCost?.toFixed(2) || '0.00'}
                        </span>
                        <span className="text-muted-foreground">
                          ({costEstimate.currency || 'USD'})
                        </span>
                      </div>
                      <div className="mt-4 p-3 bg-muted/50 rounded">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Costo unitario:</span>
                          <span className="font-medium">
                            ${(costEstimate.totalCost / parseFloat(quantity) || 0).toFixed(2)} / {unit}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {routingData && routingData.operations?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Operaciones Estimadas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {routingData.operations.map((op, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div>
                                <div className="font-medium text-sm">{op.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {op.workCenterName || 'Centro de trabajo'}
                                </div>
                              </div>
                              <Badge variant="outline">
                                {op.cycleTime * parseFloat(quantity || 0)} min
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-1">Resumen de la Orden</div>
                      <div className="text-sm space-y-1">
                        <div>Producto: {selectedProduct?.name}</div>
                        <div>Cantidad: {quantity} {unit}</div>
                        <div>Inicio programado: {new Date(scheduledStartDate).toLocaleString()}</div>
                        <div>Prioridad: {priority === 'urgent' ? 'Urgente' : priority === 'low' ? 'Baja' : 'Normal'}</div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No se pudo calcular el costo estimado
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
          )}
          {currentStep < totalSteps ? (
            <Button onClick={handleNext} disabled={loading}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Orden de Manufactura'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
