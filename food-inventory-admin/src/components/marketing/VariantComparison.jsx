import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  TrendingUp,
  Eye,
  MousePointerClick,
  ShoppingCart,
  DollarSign,
  Users,
  BarChart3,
  Award,
  Target,
  Activity
} from 'lucide-react';
import { getAbTestResults, selectAbTestWinner } from '../../lib/api';
import { useToast } from '@/hooks/use-toast';

/**
 * VariantComparison - Displays A/B test results comparison
 * PHASE 4: A/B Testing & Campaign Optimization
 */
const VariantComparison = ({ campaignId, onWinnerSelected }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadResults();
  }, [campaignId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await getAbTestResults(campaignId);
      setResults(response.data);
    } catch (error) {
      console.error('Error loading A/B test results:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los resultados del test',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWinner = async (variantName) => {
    try {
      setSelecting(true);
      await selectAbTestWinner(campaignId, variantName);
      toast({
        title: 'Ganador Seleccionado',
        description: `${variantName} ha sido seleccionada como ganadora`,
      });
      await loadResults();
      onWinnerSelected?.();
    } catch (error) {
      console.error('Error selecting winner:', error);
      toast({
        title: 'Error',
        description: 'No se pudo seleccionar el ganador',
        variant: 'destructive'
      });
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-12 text-gray-500">
        No hay resultados disponibles
      </div>
    );
  }

  const { variants, testMetric, isCompleted, winningVariantName } = results;

  // Calculate leader based on test metric
  const getMetricValue = (variant) => {
    switch (testMetric) {
      case 'open_rate':
        return parseFloat(variant.metrics.openRate) || 0;
      case 'click_rate':
        return parseFloat(variant.metrics.clickRate) || 0;
      case 'conversion_rate':
        return parseFloat(variant.metrics.conversionRate) || 0;
      case 'revenue':
        return parseFloat(variant.metrics.revenuePerRecipient) || 0;
      default:
        return 0;
    }
  };

  const sortedVariants = [...variants].sort((a, b) => getMetricValue(b) - getMetricValue(a));
  const leader = sortedVariants[0];

  const metricConfig = {
    open_rate: { label: 'Tasa de Apertura', icon: Eye, format: (v) => `${v.toFixed(2)}%` },
    click_rate: { label: 'Tasa de Clics', icon: MousePointerClick, format: (v) => `${v.toFixed(2)}%` },
    conversion_rate: { label: 'Tasa de Conversión', icon: ShoppingCart, format: (v) => `${v.toFixed(2)}%` },
    revenue: { label: 'Ingreso por Cliente', icon: DollarSign, format: (v) => `$${v.toFixed(2)}` }
  };

  const config = metricConfig[testMetric] || metricConfig.conversion_rate;
  const MetricIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Test Status */}
      <Card className="dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold">Métrica de Optimización</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {config.label}
              </p>
            </div>
            <div className="text-right">
              {isCompleted ? (
                <Badge className="bg-green-600">
                  <Trophy className="w-3 h-3 mr-1" />
                  Test Completado
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Activity className="w-3 h-3 mr-1 animate-pulse" />
                  En Progreso
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variant Comparison */}
      <div className="space-y-4">
        {sortedVariants.map((variant, index) => {
          const isWinner = variant.status === 'winner' || variant.variantName === winningVariantName;
          const isLeader = index === 0 && !isCompleted;
          const metricValue = getMetricValue(variant);

          return (
            <Card
              key={variant.variantName}
              className={`dark:bg-gray-800 border-2 ${
                isWinner
                  ? 'border-green-500 dark:border-green-400'
                  : isLeader
                  ? 'border-yellow-500 dark:border-yellow-400'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isWinner
                        ? 'bg-green-100 dark:bg-green-900'
                        : isLeader
                        ? 'bg-yellow-100 dark:bg-yellow-900'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <span className={`text-xl font-bold ${
                        isWinner
                          ? 'text-green-600 dark:text-green-300'
                          : isLeader
                          ? 'text-yellow-600 dark:text-yellow-300'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}>
                        {variant.variantName}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{variant.variantName}</CardTitle>
                        {isWinner && (
                          <Badge className="bg-green-600">
                            <Trophy className="w-3 h-3 mr-1" />
                            Ganador
                          </Badge>
                        )}
                        {isLeader && !isWinner && (
                          <Badge className="bg-yellow-600">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Líder
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {variant.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <MetricIcon className="w-4 h-4 text-purple-600" />
                      <span className="text-2xl font-bold">{config.format(metricValue)}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {variant.trafficPercentage}% de tráfico
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-semibold">Enviados</p>
                    </div>
                    <p className="text-xl font-bold">{variant.metrics.sent}</p>
                    <p className="text-xs text-gray-500">Asignados: {variant.assignedCustomers}</p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-semibold">Aperturas</p>
                    </div>
                    <p className="text-xl font-bold">{variant.metrics.opened}</p>
                    <p className="text-xs text-gray-500">{variant.metrics.openRate}</p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <MousePointerClick className="w-4 h-4 text-purple-600" />
                      <p className="text-xs font-semibold">Clics</p>
                    </div>
                    <p className="text-xl font-bold">{variant.metrics.clicked}</p>
                    <p className="text-xs text-gray-500">{variant.metrics.clickRate}</p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingCart className="w-4 h-4 text-orange-600" />
                      <p className="text-xs font-semibold">Conversiones</p>
                    </div>
                    <p className="text-xl font-bold">{variant.metrics.orders}</p>
                    <p className="text-xs text-gray-500">{variant.metrics.conversionRate}</p>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Performance Relativo</span>
                    <span className="text-gray-500">
                      {((metricValue / getMetricValue(leader)) * 100).toFixed(0)}% del líder
                    </span>
                  </div>
                  <Progress
                    value={(metricValue / getMetricValue(leader)) * 100}
                    className="h-2"
                  />
                </div>

                {/* Select Winner Button */}
                {!isCompleted && index === 0 && (
                  <div className="mt-4 pt-4 border-t dark:border-gray-600">
                    <Button
                      onClick={() => handleSelectWinner(variant.variantName)}
                      disabled={selecting}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Seleccionar como Ganador
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Resumen del Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Enviados</p>
              <p className="text-2xl font-bold">
                {variants.reduce((sum, v) => sum + v.metrics.sent, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Aperturas</p>
              <p className="text-2xl font-bold">
                {variants.reduce((sum, v) => sum + v.metrics.opened, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Conversiones</p>
              <p className="text-2xl font-bold">
                {variants.reduce((sum, v) => sum + v.metrics.orders, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Ingresos Totales</p>
              <p className="text-2xl font-bold">
                ${variants.reduce((sum, v) => sum + v.metrics.revenue, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VariantComparison;
