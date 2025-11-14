import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, ShoppingCart, AlertTriangle, CheckCircle2, Package } from 'lucide-react';

/**
 * MRPView - Material Requirements Planning
 * Muestra requerimientos de materiales para una orden de manufactura
 */
export function MRPView({ orderId }) {
  const [mrpData, setMrpData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    if (!orderId) {
      alert('ID de orden no válido');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/mrp/order/${orderId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setMrpData(result.data);
      } else {
        throw new Error(result.message || 'Error al calcular MRP');
      }
    } catch (error) {
      console.error('Error al calcular MRP:', error);
      alert(error.message || 'Error al calcular MRP');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Planificación de Requerimientos de Materiales (MRP)
              </CardTitle>
              <CardDescription>
                Calcula exactamente qué materiales necesitas y cuáles faltan en inventario
              </CardDescription>
            </div>
            <Button onClick={handleCalculate} disabled={loading}>
              {loading ? 'Calculando...' : 'Calcular Requerimientos'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Results */}
      {mrpData && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Orden de Manufactura</CardDescription>
                <CardTitle className="text-2xl">{mrpData.orderNumber}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {mrpData.product.name} ({mrpData.product.sku})
                </p>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Cantidad a Producir</CardDescription>
                <CardTitle className="text-2xl">{mrpData.quantityToProduce}</CardTitle>
              </CardHeader>
            </Card>

            <Card className={mrpData.summary.allAvailable ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
              <CardHeader className="pb-3">
                <CardDescription>Estado de Materiales</CardDescription>
                <CardTitle className={`text-2xl flex items-center gap-2 ${mrpData.summary.allAvailable ? 'text-green-700' : 'text-red-700'}`}>
                  {mrpData.summary.allAvailable ? (
                    <>
                      <CheckCircle2 className="h-6 w-6" />
                      Completo
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-6 w-6" />
                      Faltantes
                    </>
                  )}
                </CardTitle>
                {!mrpData.summary.allAvailable && (
                  <p className="text-sm text-red-600 mt-1">
                    {mrpData.summary.shortageCount} material(es) faltante(s)
                  </p>
                )}
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Costo de Faltantes</CardDescription>
                <CardTitle className="text-2xl text-orange-700">
                  {formatCurrency(mrpData.summary.totalEstimatedCost)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Requirements Table */}
          <Card>
            <CardHeader>
              <CardTitle>Desglose de Requerimientos de Materiales</CardTitle>
              <CardDescription>
                Comparación entre inventario disponible y cantidad requerida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Requerido</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Faltante</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">Costo Estimado</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mrpData.requirements && mrpData.requirements.length > 0 ? (
                    mrpData.requirements.map((req, index) => (
                      <TableRow key={index} className={req.status === 'shortage' ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {req.productName}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{req.sku}</TableCell>
                        <TableCell className="text-right font-semibold">{req.requiredQuantity.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{req.availableQuantity.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-bold ${req.shortageQuantity > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {req.shortageQuantity > 0 ? req.shortageQuantity.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell>{req.unit}</TableCell>
                        <TableCell className="text-right">
                          {req.estimatedCost > 0 ? formatCurrency(req.estimatedCost) : '-'}
                        </TableCell>
                        <TableCell>
                          {req.status === 'shortage' ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Faltante
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Disponible
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No hay requerimientos de materiales
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Purchase Suggestions */}
          {mrpData.summary.shortageCount > 0 && (
            <Card className="border-orange-300 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <ShoppingCart className="h-5 w-5" />
                  Sugerencias de Compra
                </CardTitle>
                <CardDescription className="text-orange-600">
                  Materiales que necesitas adquirir para completar la producción
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mrpData.requirements
                    .filter((r) => r.status === 'shortage')
                    .map((r, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                        <div>
                          <p className="font-medium">{r.productName}</p>
                          <p className="text-sm text-muted-foreground">SKU: {r.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-700">
                            Comprar: {r.shortageQuantity.toFixed(2)} {r.unit}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(r.estimatedCost)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <p className="font-semibold">Total Estimado de Compras:</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {formatCurrency(mrpData.summary.totalEstimatedCost)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
