import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Package,
  Users,
  AlertTriangle,
  CheckCircle2,
  Target,
  BarChart3
} from 'lucide-react';

export function ProductionAnalysisDashboard({ order }) {
  if (!order) return null;

  // Cálculos de costos
  const estimatedTotal = (order.estimatedMaterialCost || 0) +
                         (order.estimatedLaborCost || 0) +
                         (order.estimatedOverheadCost || 0);

  const actualTotal = (order.actualMaterialCost || 0) +
                      (order.actualLaborCost || 0) +
                      (order.actualOverheadCost || 0);

  const costVariance = actualTotal - estimatedTotal;
  const costVariancePercent = estimatedTotal > 0 ? ((costVariance / estimatedTotal) * 100) : 0;

  // Varianzas por categoría
  const materialVariance = (order.actualMaterialCost || 0) - (order.estimatedMaterialCost || 0);
  const laborVariance = (order.actualLaborCost || 0) - (order.estimatedLaborCost || 0);
  const overheadVariance = (order.actualOverheadCost || 0) - (order.estimatedOverheadCost || 0);

  // Cálculos de tiempo
  const operations = order.operations || [];
  const completedOps = operations.filter(op => op.status === 'completed');

  const estimatedTime = operations.reduce((sum, op) =>
    sum + (op.estimatedSetupTime || 0) + (op.estimatedCycleTime || 0) + (op.estimatedTeardownTime || 0), 0
  );

  const actualTime = completedOps.reduce((sum, op) =>
    sum + (op.actualSetupTime || 0) + (op.actualCycleTime || 0) + (op.actualTeardownTime || 0), 0
  );

  const timeVariance = actualTime - estimatedTime;
  const timeVariancePercent = estimatedTime > 0 ? ((timeVariance / estimatedTime) * 100) : 0;

  // Eficiencia por operación
  const operationEfficiencies = completedOps.map(op => {
    const estimated = (op.estimatedSetupTime || 0) + (op.estimatedCycleTime || 0) + (op.estimatedTeardownTime || 0);
    const actual = (op.actualSetupTime || 0) + (op.actualCycleTime || 0) + (op.actualTeardownTime || 0);
    const efficiency = estimated > 0 && actual > 0 ? (estimated / actual) * 100 : 0;

    return {
      name: op.name,
      sequence: op.sequence,
      estimated,
      actual,
      efficiency,
      variance: actual - estimated,
      workCenterName: op.workCenterName || 'N/A'
    };
  });

  // Eficiencia general
  const overallEfficiency = estimatedTime > 0 && actualTime > 0 ? (estimatedTime / actualTime) * 100 : 0;

  // KPIs
  const onTimeDelivery = order.actualEndDate && order.scheduledEndDate
    ? new Date(order.actualEndDate) <= new Date(order.scheduledEndDate)
    : null;

  const productionYield = order.quantityProduced > 0 && order.quantityToProduce > 0
    ? (order.quantityProduced / order.quantityToProduce) * 100
    : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatTime = (minutes) => {
    if (!minutes) return '0 min';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
  };

  const getVarianceColor = (variance, percent) => {
    if (variance < 0) return 'text-green-600';
    if (percent > 10) return 'text-red-600';
    if (percent > 5) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 100) return 'text-green-600';
    if (efficiency >= 90) return 'text-blue-600';
    if (efficiency >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Eficiencia General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getEfficiencyColor(overallEfficiency)}`}>
              {overallEfficiency.toFixed(1)}%
            </div>
            <Progress value={Math.min(overallEfficiency, 100)} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {overallEfficiency >= 100 ? 'Por encima del objetivo' : 'Por debajo del objetivo'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Varianza de Costo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getVarianceColor(costVariance, Math.abs(costVariancePercent))}`}>
              {costVariancePercent > 0 ? '+' : ''}{costVariancePercent.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatCurrency(Math.abs(costVariance))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {costVariance < 0 ? 'Ahorro' : 'Sobrecosto'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              Varianza de Tiempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getVarianceColor(timeVariance, Math.abs(timeVariancePercent))}`}>
              {timeVariancePercent > 0 ? '+' : ''}{timeVariancePercent.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatTime(Math.abs(timeVariance))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {timeVariance < 0 ? 'Más rápido' : 'Más lento'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-500" />
              Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${productionYield >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
              {productionYield.toFixed(1)}%
            </div>
            <Progress value={Math.min(productionYield, 100)} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {order.quantityProduced || 0} / {order.quantityToProduce} unidades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análisis de Costos: Estimado vs Real
          </CardTitle>
          <CardDescription>
            Comparación detallada de costos por categoría
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Material Costs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Materiales</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Est:</span>
                    <span className="ml-1 font-medium">{formatCurrency(order.estimatedMaterialCost || 0)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Real:</span>
                    <span className="ml-1 font-medium">{formatCurrency(order.actualMaterialCost || 0)}</span>
                  </div>
                  <Badge className={materialVariance < 0 ? 'bg-green-500' : materialVariance > 0 ? 'bg-red-500' : 'bg-gray-500'}>
                    {materialVariance < 0 ? '-' : '+'}{formatCurrency(Math.abs(materialVariance))}
                  </Badge>
                </div>
              </div>
              <Progress
                value={Math.min(((order.actualMaterialCost || 0) / (order.estimatedMaterialCost || 1)) * 100, 100)}
                className="h-2"
              />
            </div>

            {/* Labor Costs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Mano de Obra</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Est:</span>
                    <span className="ml-1 font-medium">{formatCurrency(order.estimatedLaborCost || 0)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Real:</span>
                    <span className="ml-1 font-medium">{formatCurrency(order.actualLaborCost || 0)}</span>
                  </div>
                  <Badge className={laborVariance < 0 ? 'bg-green-500' : laborVariance > 0 ? 'bg-red-500' : 'bg-gray-500'}>
                    {laborVariance < 0 ? '-' : '+'}{formatCurrency(Math.abs(laborVariance))}
                  </Badge>
                </div>
              </div>
              <Progress
                value={Math.min(((order.actualLaborCost || 0) / (order.estimatedLaborCost || 1)) * 100, 100)}
                className="h-2"
              />
            </div>

            {/* Overhead Costs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Overhead</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Est:</span>
                    <span className="ml-1 font-medium">{formatCurrency(order.estimatedOverheadCost || 0)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Real:</span>
                    <span className="ml-1 font-medium">{formatCurrency(order.actualOverheadCost || 0)}</span>
                  </div>
                  <Badge className={overheadVariance < 0 ? 'bg-green-500' : overheadVariance > 0 ? 'bg-red-500' : 'bg-gray-500'}>
                    {overheadVariance < 0 ? '-' : '+'}{formatCurrency(Math.abs(overheadVariance))}
                  </Badge>
                </div>
              </div>
              <Progress
                value={Math.min(((order.actualOverheadCost || 0) / (order.estimatedOverheadCost || 1)) * 100, 100)}
                className="h-2"
              />
            </div>

            {/* Total */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">TOTAL</span>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">Est:</span>
                    <span className="ml-1 text-lg font-bold">{formatCurrency(estimatedTotal)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Real:</span>
                    <span className="ml-1 text-lg font-bold">{formatCurrency(actualTotal)}</span>
                  </div>
                  <Badge
                    className={`text-base ${costVariance < 0 ? 'bg-green-500' : costVariance > 0 ? 'bg-red-500' : 'bg-gray-500'}`}
                  >
                    {costVariance < 0 ? '-' : '+'}{formatCurrency(Math.abs(costVariance))}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operation Efficiency */}
      {completedOps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Eficiencia por Operación
            </CardTitle>
            <CardDescription>
              Análisis de tiempo real vs estimado por cada operación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operación</TableHead>
                  <TableHead>Centro de Trabajo</TableHead>
                  <TableHead>Tiempo Estimado</TableHead>
                  <TableHead>Tiempo Real</TableHead>
                  <TableHead>Varianza</TableHead>
                  <TableHead>Eficiencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationEfficiencies.map((op, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      {op.sequence}. {op.name}
                    </TableCell>
                    <TableCell>{op.workCenterName}</TableCell>
                    <TableCell>{formatTime(op.estimated)}</TableCell>
                    <TableCell>{formatTime(op.actual)}</TableCell>
                    <TableCell>
                      <span className={getVarianceColor(op.variance, Math.abs((op.variance / op.estimated) * 100))}>
                        {op.variance > 0 ? '+' : ''}{formatTime(Math.abs(op.variance))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getEfficiencyColor(op.efficiency)}`}>
                          {op.efficiency.toFixed(1)}%
                        </span>
                        {op.efficiency >= 100 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Alerts and Recommendations */}
      <div className="space-y-3">
        {costVariance > estimatedTotal * 0.1 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Alerta de Sobrecosto:</strong> El costo real excede el estimado en más del 10%.
              Se recomienda revisar los procesos y ajustar futuros estimados.
            </AlertDescription>
          </Alert>
        )}

        {overallEfficiency < 80 && completedOps.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Baja Eficiencia:</strong> La eficiencia general está por debajo del 80%.
              Considere capacitación adicional o revisión de procesos.
            </AlertDescription>
          </Alert>
        )}

        {onTimeDelivery === false && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Retraso en Entrega:</strong> La orden se completó después de la fecha programada.
              Analice los cuellos de botella en el proceso.
            </AlertDescription>
          </Alert>
        )}

        {costVariance < 0 && Math.abs(costVariancePercent) > 5 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Ahorro Significativo:</strong> Se logró un ahorro de {Math.abs(costVariancePercent).toFixed(1)}%
              respecto al costo estimado. Excelente gestión de recursos.
            </AlertDescription>
          </Alert>
        )}

        {overallEfficiency >= 100 && completedOps.length > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Alta Eficiencia:</strong> Las operaciones se completaron en menos tiempo del estimado.
              Considere ajustar los tiempos estándar para futuros estimados más precisos.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
