import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMenuEngineering } from '@/lib/api';
import { toast } from 'sonner';
import { Star, TrendingUp, HelpCircle, AlertCircle, DollarSign, ShoppingCart, TrendingDown } from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '14d', label: 'Últimos 14 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '60d', label: 'Últimos 60 días' },
  { value: '90d', label: 'Últimos 90 días' },
];

const CATEGORY_CONFIG = {
  star: {
    label: 'Stars (Estrellas)',
    icon: Star,
    color: 'text-warning-foreground',
    bgColor: 'bg-warning-muted',
    borderColor: 'border-warning/40',
    description: 'Alta popularidad + Alta rentabilidad',
    emoji: '⭐',
  },
  plowhorse: {
    label: 'Plowhorses (Caballos de trabajo)',
    icon: TrendingUp,
    color: 'text-info',
    bgColor: 'bg-info-muted',
    borderColor: 'border-info/40',
    description: 'Alta popularidad + Baja rentabilidad',
    emoji: '🐴',
  },
  puzzle: {
    label: 'Puzzles (Enigmas)',
    icon: HelpCircle,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    borderColor: 'border-purple-300 dark:border-purple-700',
    description: 'Baja popularidad + Alta rentabilidad',
    emoji: '🧩',
  },
  dog: {
    label: 'Dogs (Perros)',
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/40',
    description: 'Baja popularidad + Baja rentabilidad',
    emoji: '🐕',
  },
};

const MenuEngineeringWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('matrix');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMenuEngineering(period);
      if (response.success) {
        setData(response.data);
      } else {
        toast.error('Error al cargar Menu Engineering', { description: response.message });
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

  const renderProductRow = (product, index) => {
    const config = CATEGORY_CONFIG[product.category];
    const Icon = config.icon;

    return (
      <TableRow key={`${product.productId}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
        <TableCell>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="font-medium">{product.productName}</span>
          </div>
        </TableCell>
        <TableCell className="text-right font-semibold">
          {product.quantitySold}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(product.revenue)}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(product.cost)}
        </TableCell>
        <TableCell className="text-right">
          <span className={product.contributionMargin > 0 ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-red-700 dark:text-red-400'}>
            {formatCurrency(product.contributionMargin)}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <Badge variant="outline" className={`${config.bgColor} ${config.borderColor} ${config.color}`}>
            {product.contributionMarginPercent}%
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(product.avgPrice)}
        </TableCell>
      </TableRow>
    );
  };

  const renderCategoryCard = (categoryKey, products) => {
    const config = CATEGORY_CONFIG[categoryKey];
    const Icon = config.icon;

    return (
      <Card className={`${config.borderColor} border-2`}>
        <CardHeader className={config.bgColor}>
          <div className="flex items-center gap-2">
            <Icon className={`w-6 h-6 ${config.color}`} />
            <div className="flex-1">
              <CardTitle className={`text-lg ${config.color}`}>
                {config.emoji} {config.label}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {config.description}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg font-bold">
              {products.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {products.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No hay platillos en esta categoría
            </p>
          ) : (
            <div className="space-y-3">
              {products.slice(0, 3).map((product, index) => (
                <div
                  key={`${product.productId}-${index}`}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-foreground">{product.productName}</h4>
                    <Badge className={`${config.bgColor} ${config.color} border-0`}>
                      {product.quantitySold} vendidos
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Ingresos:</span>
                      <span className="ml-1 font-semibold text-foreground">
                        {formatCurrency(product.revenue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Margen:</span>
                      <span className="ml-1 font-semibold text-green-700 dark:text-green-400">
                        {product.contributionMarginPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground italic">
                    💡 {product.recommendation}
                  </div>
                </div>
              ))}
              {products.length > 3 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  + {products.length - 3} platillos más
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Menu Engineering</CardTitle>
            <CardDescription className="mt-1">
              Análisis de matriz de menú: Popularidad vs Rentabilidad
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
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-4 border border-info/30">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="text-sm font-medium">Platillos Totales</span>
                </div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {data.summary.totalItems}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg p-4 border border-success/30">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm font-medium">Ingresos Totales</span>
                </div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(data.summary.totalRevenue)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-sm font-medium">Margen Total</span>
                </div>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {formatCurrency(data.summary.totalContributionMargin)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 rounded-lg p-4 border border-warning/30">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                  <Star className="h-5 w-5" />
                  <span className="text-sm font-medium">Stars</span>
                </div>
                <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                  {data.metrics.starsCount}
                </div>
              </div>
            </div>

            {/* Period Info */}
            <div className="text-center text-sm text-muted-foreground py-2 border-y dark:border-gray-700">
              <span className="font-medium">
                {PERIOD_OPTIONS.find(p => p.value === period)?.label || 'Período seleccionado'}
              </span>
              {' • '}
              {new Date(data.period.from).toLocaleDateString('es-VE')} -{' '}
              {new Date(data.period.to).toLocaleDateString('es-VE')}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="matrix">Vista de Matriz</TabsTrigger>
                <TabsTrigger value="table">Vista de Tabla</TabsTrigger>
              </TabsList>

              {/* Matrix View */}
              <TabsContent value="matrix" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderCategoryCard('star', data.categories.stars)}
                  {renderCategoryCard('puzzle', data.categories.puzzles)}
                  {renderCategoryCard('plowhorse', data.categories.plowhorses)}
                  {renderCategoryCard('dog', data.categories.dogs)}
                </div>

                {/* Revenue Distribution */}
                <Card className="border-2 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg">Distribución de Ingresos por Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries({
                        star: { ...data.metrics, revenue: data.metrics.starsRevenue, count: data.metrics.starsCount },
                        plowhorse: { ...data.metrics, revenue: data.metrics.plowhorsesRevenue, count: data.metrics.plowhorsesCount },
                        puzzle: { ...data.metrics, revenue: data.metrics.puzzlesRevenue, count: data.metrics.puzzlesCount },
                        dog: { ...data.metrics, revenue: data.metrics.dogsRevenue, count: data.metrics.dogsCount },
                      }).map(([key, metrics]) => {
                        const config = CATEGORY_CONFIG[key];
                        const percentage = data.summary.totalRevenue > 0
                          ? (metrics.revenue / data.summary.totalRevenue) * 100
                          : 0;

                        return (
                          <div key={key}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className={`font-medium ${config.color} flex items-center gap-2`}>
                                {config.emoji} {config.label}
                                <Badge variant="outline" className="text-xs">
                                  {metrics.count} items
                                </Badge>
                              </span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(metrics.revenue)} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${config.bgColor.replace('bg-', 'bg-gradient-to-r from-').replace('-50', '-400 to-').replace(/to-$/, config.bgColor.split('-')[1] + '-600')}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Table View */}
              <TabsContent value="table" className="mt-4">
                <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800">
                        <TableHead className="font-bold">Platillo</TableHead>
                        <TableHead className="text-right font-bold">Unidades</TableHead>
                        <TableHead className="text-right font-bold">Ingresos</TableHead>
                        <TableHead className="text-right font-bold">Costo</TableHead>
                        <TableHead className="text-right font-bold">Margen $</TableHead>
                        <TableHead className="text-right font-bold">Margen %</TableHead>
                        <TableHead className="text-right font-bold">Precio Prom.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.categories.stars.length > 0 && (
                        <>
                          <TableRow className="bg-warning-muted">
                            <TableCell colSpan={7} className="font-bold text-yellow-900 dark:text-yellow-100">
                              ⭐ Stars (Estrellas)
                            </TableCell>
                          </TableRow>
                          {data.categories.stars.map((product, index) => renderProductRow(product, index))}
                        </>
                      )}
                      {data.categories.plowhorses.length > 0 && (
                        <>
                          <TableRow className="bg-info-muted">
                            <TableCell colSpan={7} className="font-bold text-blue-900 dark:text-blue-100">
                              🐴 Plowhorses (Caballos de trabajo)
                            </TableCell>
                          </TableRow>
                          {data.categories.plowhorses.map((product, index) => renderProductRow(product, index))}
                        </>
                      )}
                      {data.categories.puzzles.length > 0 && (
                        <>
                          <TableRow className="bg-purple-50 dark:bg-purple-950">
                            <TableCell colSpan={7} className="font-bold text-purple-900 dark:text-purple-100">
                              🧩 Puzzles (Enigmas)
                            </TableCell>
                          </TableRow>
                          {data.categories.puzzles.map((product, index) => renderProductRow(product, index))}
                        </>
                      )}
                      {data.categories.dogs.length > 0 && (
                        <>
                          <TableRow className="bg-destructive/10">
                            <TableCell colSpan={7} className="font-bold text-red-900 dark:text-red-100">
                              🐕 Dogs (Perros)
                            </TableCell>
                          </TableRow>
                          {data.categories.dogs.map((product, index) => renderProductRow(product, index))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>

            {/* Strategic Recommendations */}
            <Alert className="border-info/30 bg-info-muted">
              <TrendingUp className="h-4 w-4 text-blue-900 dark:text-blue-100" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">💡 Recomendaciones Estratégicas</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm space-y-2">
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li><strong>Stars:</strong> Mantén la calidad y promociónalos activamente. Son tu fuente principal de rentabilidad.</li>
                  <li><strong>Plowhorses:</strong> Considera aumentar precios gradualmente o reducir costos de ingredientes.</li>
                  <li><strong>Puzzles:</strong> Mejora su visibilidad en el menú, capacita al personal para recomendarlos.</li>
                  <li><strong>Dogs:</strong> Evalúa eliminarlos del menú o reformularlos completamente para mejorar margen.</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted" />
            <p>No hay datos disponibles para el período seleccionado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MenuEngineeringWidget;
