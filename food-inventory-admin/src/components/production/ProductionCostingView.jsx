import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export function ProductionCostingView({ order }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: order?.currency || 'USD' }).format(amount || 0);
  };

  const calculateVariance = (estimated, actual) => {
    if (!estimated || !actual) return { amount: 0, percentage: 0, isPositive: true };
    const amount = actual - estimated;
    const percentage = estimated > 0 ? (amount / estimated) * 100 : 0;
    return {
      amount,
      percentage,
      isPositive: amount <= 0, // Positivo si el real es menor o igual al estimado
    };
  };

  // Calcular costos totales
  const totalEstimated =
    (order?.estimatedMaterialCost || 0) +
    (order?.estimatedLaborCost || 0) +
    (order?.estimatedOverheadCost || 0);

  const totalActual =
    (order?.actualMaterialCost || 0) +
    (order?.actualLaborCost || 0) +
    (order?.actualOverheadCost || 0);

  const materialVariance = calculateVariance(order?.estimatedMaterialCost, order?.actualMaterialCost);
  const laborVariance = calculateVariance(order?.estimatedLaborCost, order?.actualLaborCost);
  const overheadVariance = calculateVariance(order?.estimatedOverheadCost, order?.actualOverheadCost);
  const totalVariance = calculateVariance(totalEstimated, totalActual);

  const CostRow = ({ label, estimated, actual, variance }) => (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell className="text-right">{formatCurrency(estimated)}</TableCell>
      <TableCell className="text-right">{formatCurrency(actual)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {variance.isPositive ? (
            <TrendingDown className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingUp className="h-4 w-4 text-red-600" />
          )}
          <span className={variance.isPositive ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(Math.abs(variance.amount))}
          </span>
          <Badge variant={variance.isPositive ? 'default' : 'destructive'} className="ml-2">
            {variance.percentage >= 0 ? '+' : ''}
            {variance.percentage.toFixed(1)}%
          </Badge>
        </div>
      </TableCell>
    </TableRow>
  );

  // Calcular costo unitario
  const unitCostEstimated = order?.quantityToProduce > 0 ? totalEstimated / order.quantityToProduce : 0;
  const unitCostActual = order?.quantityProduced > 0 ? totalActual / order.quantityProduced : 0;

  return (
    <div className="space-y-4">
      {/* Resumen de Costos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Costo Total Estimado</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalEstimated)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Costo Total Real</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalActual)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Varianza Total</CardDescription>
            <CardTitle className={`text-2xl ${totalVariance.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(totalVariance.amount))}
            </CardTitle>
            <div className="flex items-center gap-1 text-sm">
              {totalVariance.isPositive ? (
                <>
                  <TrendingDown className="h-4 w-4" />
                  <span>Ahorro de {totalVariance.percentage.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span>Sobrecosto de {totalVariance.percentage.toFixed(1)}%</span>
                </>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Costo Unitario Real</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(unitCostActual)}</CardTitle>
            <div className="text-sm text-muted-foreground">
              Estimado: {formatCurrency(unitCostEstimated)}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Desglose de Costos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Desglose de Costos
          </CardTitle>
          <CardDescription>
            Comparación entre costos estimados y reales por categoría
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Estimado</TableHead>
                <TableHead className="text-right">Real</TableHead>
                <TableHead className="text-right">Varianza</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <CostRow
                label="Materiales"
                estimated={order?.estimatedMaterialCost || 0}
                actual={order?.actualMaterialCost || 0}
                variance={materialVariance}
              />
              <CostRow
                label="Mano de Obra"
                estimated={order?.estimatedLaborCost || 0}
                actual={order?.actualLaborCost || 0}
                variance={laborVariance}
              />
              <CostRow
                label="Costos Indirectos (Overhead)"
                estimated={order?.estimatedOverheadCost || 0}
                actual={order?.actualOverheadCost || 0}
                variance={overheadVariance}
              />
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{formatCurrency(totalEstimated)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalActual)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {totalVariance.isPositive ? (
                      <TrendingDown className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-600" />
                    )}
                    <span className={totalVariance.isPositive ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(Math.abs(totalVariance.amount))}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Desglose de Materiales */}
      {order?.components && order.components.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Desglose de Materiales</CardTitle>
            <CardDescription>Costo detallado por componente</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo Unitario</TableHead>
                  <TableHead className="text-right">Costo Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.components.map((component, index) => (
                  <TableRow key={component._id || index}>
                    <TableCell>{component.product?.name || 'Componente'}</TableCell>
                    <TableCell className="text-right">
                      {component.consumedQuantity || component.requiredQuantity} {component.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(component.unitCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(component.totalCost)}</TableCell>
                    <TableCell>
                      <Badge variant={component.status === 'consumed' ? 'default' : 'outline'}>
                        {component.status === 'consumed' ? 'Consumido' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Alertas de Varianza */}
      {!totalVariance.isPositive && Math.abs(totalVariance.percentage) > 10 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Alerta de Sobrecosto
            </CardTitle>
            <CardDescription className="text-red-600">
              El costo real excede el estimado en un {Math.abs(totalVariance.percentage).toFixed(1)}% (
              {formatCurrency(Math.abs(totalVariance.amount))})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {!materialVariance.isPositive && Math.abs(materialVariance.percentage) > 10 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>
                    Materiales: +{Math.abs(materialVariance.percentage).toFixed(1)}% sobre presupuesto
                  </span>
                </div>
              )}
              {!laborVariance.isPositive && Math.abs(laborVariance.percentage) > 10 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>
                    Mano de Obra: +{Math.abs(laborVariance.percentage).toFixed(1)}% sobre presupuesto
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
