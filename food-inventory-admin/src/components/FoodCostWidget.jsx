import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getFoodCost } from '@/lib/api';
import { toast } from 'sonner';
import { TrendingDown, TrendingUp, AlertTriangle, DollarSign, ShoppingCart, Package } from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '14d', label: 'Últimos 14 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '60d', label: 'Últimos 60 días' },
  { value: '90d', label: 'Últimos 90 días' },
];

const FoodCostWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('30d');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getFoodCost(period);
      if (response.success) {
        setData(response.data);
      } else {
        toast.error('Error al cargar el Food Cost%', { description: response.message });
      }
    } catch (error) {
      toast.error('Error de red', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'text-success border-green-600 dark:border-green-400 bg-success-muted';
      case 'warning':
        return 'text-warning-foreground border-yellow-600 dark:border-yellow-400 bg-warning-muted';
      case 'danger':
        return 'text-destructive border-red-600 dark:border-red-400 bg-destructive/10';
      default:
        return 'text-gray-600 dark:text-gray-400 border-gray-600 dark:border-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return <TrendingDown className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'danger':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'good':
        return 'Excelente';
      case 'warning':
        return 'Atención';
      case 'danger':
        return 'Crítico';
      default:
        return 'N/A';
    }
  };

  const getProgressColor = (status) => {
    switch (status) {
      case 'good':
        return '#16a34a'; // green-600
      case 'warning':
        return '#ca8a04'; // yellow-600
      case 'danger':
        return '#dc2626'; // red-600
      default:
        return '#6b7280'; // gray-500
    }
  };

  const CircularProgress = ({ percentage, status }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const color = getProgressColor(status);

    return (
      <div className="relative w-48 h-48 mx-auto">
        <svg className="transform -rotate-90 w-48 h-48">
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="12"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke={color}
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>
            {percentage.toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground mt-1">Food Cost</span>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Food Cost Percentage</CardTitle>
            <CardDescription className="mt-1">
              KPI #1 para restaurantes: Costo de ingredientes vs ventas
            </CardDescription>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecciona período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Circular Progress */}
            <div className="flex justify-center py-4">
              <CircularProgress percentage={data.foodCostPercentage} status={data.status} />
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className={`${getStatusColor(data.status)} flex items-center gap-2 px-4 py-2 text-sm font-semibold`}
              >
                {getStatusIcon(data.status)}
                {getStatusText(data.status)}
              </Badge>
            </div>

            {/* Benchmark Comparison */}
            <Alert className={data.variance <= 0 ? 'border-success/30 bg-success-muted' : 'border-warning/30 bg-warning-muted'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Comparación con Benchmark ({data.benchmark}%)</AlertTitle>
              <AlertDescription>
                {data.variance > 0 ? (
                  <span className="text-yellow-800 dark:text-yellow-200">
                    Estás <strong>{data.variance.toFixed(2)}%</strong> por encima del benchmark ideal
                  </span>
                ) : data.variance < 0 ? (
                  <span className="text-green-800 dark:text-green-200">
                    Estás <strong>{Math.abs(data.variance).toFixed(2)}%</strong> por debajo del benchmark ¡Excelente!
                  </span>
                ) : (
                  <span className="text-green-800 dark:text-green-200">Estás exactamente en el benchmark ideal</span>
                )}
              </AlertDescription>
            </Alert>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="text-sm font-medium">Ventas Totales</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(data.totalSales)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.metrics.orderCount} órdenes
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <Package className="h-4 w-4" />
                  <span className="text-sm font-medium">Costo Ingredientes</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(data.totalCost)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.metrics.movementCount} movimientos
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Costo por Orden</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(data.metrics.averageCostPerOrder)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Promedio
                </div>
              </div>
            </div>

            {/* Period Info */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t">
              Período: {new Date(data.period.from).toLocaleDateString('es-VE')} -{' '}
              {new Date(data.period.to).toLocaleDateString('es-VE')}
            </div>

            {/* Recommendations */}
            {data.status !== 'good' && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTitle className="text-blue-900">💡 Recomendaciones</AlertTitle>
                <AlertDescription className="text-blue-800 text-sm space-y-2">
                  {data.status === 'danger' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Revisa tus recetas y porciones - puede haber desperdicio</li>
                      <li>Negocia mejores precios con proveedores</li>
                      <li>Considera ajustar precios de menú si no lo has hecho recientemente</li>
                      <li>Analiza platillos con bajo margen de contribución</li>
                    </ul>
                  )}
                  {data.status === 'warning' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Monitorea tendencias de costos semanalmente</li>
                      <li>Verifica que no haya merma excesiva en inventario</li>
                      <li>Optimiza el uso de ingredientes entre platillos</li>
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay datos disponibles para el período seleccionado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FoodCostWidget;
