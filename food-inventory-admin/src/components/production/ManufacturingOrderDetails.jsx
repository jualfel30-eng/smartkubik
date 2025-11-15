import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Wrench, BarChart3, Info } from 'lucide-react';
import { OperationsKanbanView } from './OperationsKanbanView';
import { ProductionAnalysisDashboard } from './ProductionAnalysisDashboard';
import { fetchApi } from '@/lib/api';

export function ManufacturingOrderDetails({ order, open, onClose }) {
  const [currentOrder, setCurrentOrder] = useState(order);

  if (!currentOrder) return null;

  const handleRefresh = async () => {
    try {
      const response = await fetchApi(`/manufacturing-orders/${currentOrder._id}`);
      if (response.success) {
        setCurrentOrder(response.data);
      }
    } catch (error) {
      console.error('Error refreshing order:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-ES');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de Orden de Manufactura: {currentOrder.orderNumber}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">
              <Info className="h-4 w-4 mr-2" />
              Información
            </TabsTrigger>
            <TabsTrigger value="components">
              <Package className="h-4 w-4 mr-2" />
              Componentes
            </TabsTrigger>
            <TabsTrigger value="operations">
              <Wrench className="h-4 w-4 mr-2" />
              Operaciones
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <BarChart3 className="h-4 w-4 mr-2" />
              Análisis
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Número de Orden</p>
                    <p className="text-lg font-semibold">{currentOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <Badge className="mt-1">{currentOrder.status}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Producto</p>
                    <p>{currentOrder.product?.name || currentOrder.productId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cantidad a Producir</p>
                    <p>{currentOrder.quantityToProduce} {currentOrder.product?.baseUnit || 'unidades'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Prioridad</p>
                    <p className="capitalize">{currentOrder.priority || 'normal'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Referencia</p>
                    <p>{currentOrder.reference || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Inicio Planificada</p>
                    <p>{formatDate(currentOrder.plannedStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Fin Planificada</p>
                    <p>{formatDate(currentOrder.plannedCompletionDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Inicio Real</p>
                    <p>{formatDate(currentOrder.actualStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Fin Real</p>
                    <p>{formatDate(currentOrder.actualCompletionDate)}</p>
                  </div>
                </div>
                {currentOrder.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notas</p>
                    <p className="text-sm">{currentOrder.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components">
            <Card>
              <CardHeader>
                <CardTitle>Componentes / Materiales</CardTitle>
              </CardHeader>
              <CardContent>
                {currentOrder.components && currentOrder.components.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad Requerida</TableHead>
                        <TableHead>Cantidad Consumida</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Costo Unitario</TableHead>
                        <TableHead>Costo Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentOrder.components.map((component, index) => {
                        const consumed = component.consumedQuantity || component.requiredQuantity;
                        const unitCost = component.unitCost || 0;
                        const totalCost = consumed * unitCost;

                        return (
                          <TableRow key={index}>
                            <TableCell>{component.product?.name || component.productId}</TableCell>
                            <TableCell>{component.requiredQuantity}</TableCell>
                            <TableCell>
                              {component.consumedQuantity || '-'}
                              {component.consumedQuantity && component.consumedQuantity !== component.requiredQuantity && (
                                <Badge variant="outline" className="ml-2">Ajustado</Badge>
                              )}
                            </TableCell>
                            <TableCell>{component.unit}</TableCell>
                            <TableCell>{formatCurrency(unitCost)}</TableCell>
                            <TableCell>{formatCurrency(totalCost)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No hay componentes registrados</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations">
            <OperationsKanbanView
              manufacturingOrder={currentOrder}
              onRefresh={handleRefresh}
              onOperationUpdate={handleRefresh}
            />
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis">
            <ProductionAnalysisDashboard order={currentOrder} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <DialogClose asChild>
            <Button variant="secondary">Cerrar</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
