import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Trophy,
  TrendingUp,
  Users,
  MousePointerClick,
  DollarSign,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { getABTestResults, autoSelectWinner, declareWinner } from '@/lib/api';

/**
 * ABTestResults - Component for displaying A/B test results with statistical analysis
 *
 * Shows:
 * - Performance metrics for each variant
 * - Winner (if determined)
 * - Statistical significance
 * - Comparison charts
 */

const METRIC_CONFIG = {
  open_rate: {
    label: 'Tasa de Apertura',
    icon: TrendingUp,
    format: (value) => `${value.toFixed(2)}%`,
    color: 'text-blue-600',
  },
  click_rate: {
    label: 'Tasa de Clics',
    icon: MousePointerClick,
    format: (value) => `${value.toFixed(2)}%`,
    color: 'text-purple-600',
  },
  conversion_rate: {
    label: 'Tasa de Conversión',
    icon: Users,
    format: (value) => `${value.toFixed(2)}%`,
    color: 'text-green-600',
  },
  revenue: {
    label: 'Ingresos por Envío',
    icon: DollarSign,
    format: (value) => `$${value.toFixed(2)}`,
    color: 'text-yellow-600',
  },
};

export default function ABTestResults({ campaignId, onClose }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResults();
  }, [campaignId]);

  const fetchResults = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getABTestResults(campaignId);
      if (response.success) {
        setResults(response.data);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar resultados');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSelect = async () => {
    setSelecting(true);
    setError('');
    try {
      const response = await autoSelectWinner(campaignId);
      if (response.success) {
        await fetchResults(); // Refresh results
      } else {
        setError(response.message || 'No se pudo determinar un ganador automáticamente');
      }
    } catch (err) {
      setError(err.message || 'Error al seleccionar ganador');
    } finally {
      setSelecting(false);
    }
  };

  const handleManualSelect = async (variantId) => {
    if (!confirm('¿Estás seguro de declarar esta variante como ganadora?')) {
      return;
    }

    setSelecting(true);
    setError('');
    try {
      await declareWinner(campaignId, variantId, 'Declarado manualmente por el usuario');
      await fetchResults(); // Refresh results
    } catch (err) {
      setError(err.message || 'Error al declarar ganador');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!results || results.variants.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay variantes configuradas para este A/B test.
        </AlertDescription>
      </Alert>
    );
  }

  const metricConfig = METRIC_CONFIG[results.optimizationMetric] || METRIC_CONFIG.conversion_rate;
  const MetricIcon = metricConfig.icon;
  const winner = results.winner;

  // Find max value for progress bars
  const maxValue = Math.max(
    ...results.variants.map((v) => {
      switch (results.optimizationMetric) {
        case 'open_rate':
          return v.openRate;
        case 'click_rate':
          return v.clickRate;
        case 'conversion_rate':
          return v.conversionRate;
        case 'revenue':
          return v.revenuePerSend;
        default:
          return 0;
      }
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Resultados del A/B Test
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Optimizando por: {metricConfig.label}
              </CardDescription>
            </div>
            {!winner && (
              <Button
                onClick={handleAutoSelect}
                disabled={selecting}
                className="dark:bg-purple-600 dark:hover:bg-purple-700"
              >
                {selecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Seleccionar Ganador Automáticamente
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Winner Announcement */}
      {winner && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
          <Trophy className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>{winner.name}</strong> es el ganador con {metricConfig.format(winner.metricValue)}
            {winner.isStatisticallySignificant && (
              <span className="ml-2">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Estadísticamente Significativo
                </Badge>
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Variants Comparison */}
      <div className="space-y-4">
        {results.variants.map((variant) => {
          const isWinner = winner && variant._id === winner._id;
          const isLoser = winner && variant.status === 'loser';

          // Get metric value
          let metricValue = 0;
          switch (results.optimizationMetric) {
            case 'open_rate':
              metricValue = variant.openRate;
              break;
            case 'click_rate':
              metricValue = variant.clickRate;
              break;
            case 'conversion_rate':
              metricValue = variant.conversionRate;
              break;
            case 'revenue':
              metricValue = variant.revenuePerSend;
              break;
          }

          const progress = maxValue > 0 ? (metricValue / maxValue) * 100 : 0;

          return (
            <Card
              key={variant._id}
              className={`dark:bg-gray-800 dark:border-gray-700 ${
                isWinner ? 'ring-2 ring-green-500 dark:ring-green-400' : ''
              } ${isLoser ? 'opacity-60' : ''}`}
            >
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Variant Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold dark:text-gray-100">
                          {variant.name}
                        </h3>
                        {isWinner && (
                          <Badge variant="default" className="bg-green-600">
                            <Trophy className="w-3 h-3 mr-1" />
                            Ganador
                          </Badge>
                        )}
                        {isLoser && (
                          <Badge variant="outline" className="dark:border-gray-600">
                            Perdedor
                          </Badge>
                        )}
                      </div>
                      {variant.subject && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {variant.subject}
                        </p>
                      )}
                    </div>
                    {!winner && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManualSelect(variant._id)}
                        disabled={selecting}
                        className="dark:border-gray-700"
                      >
                        Declarar Ganador
                      </Button>
                    )}
                  </div>

                  {/* Main Metric */}
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <MetricIcon className="w-4 h-4" />
                        {metricConfig.label}
                      </span>
                      <span className={`text-2xl font-bold ${metricConfig.color} dark:opacity-90`}>
                        {metricConfig.format(metricValue)}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Detailed Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Enviados</div>
                      <div className="text-lg font-semibold dark:text-gray-100">
                        {variant.totalSent.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Aperturas</div>
                      <div className="text-lg font-semibold dark:text-gray-100">
                        {variant.totalOpened.toLocaleString()}
                        <span className="text-sm text-gray-500 ml-1">
                          ({variant.openRate.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Clics</div>
                      <div className="text-lg font-semibold dark:text-gray-100">
                        {variant.totalClicked.toLocaleString()}
                        <span className="text-sm text-gray-500 ml-1">
                          ({variant.clickRate.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Conversiones</div>
                      <div className="text-lg font-semibold dark:text-gray-100">
                        {variant.totalConverted.toLocaleString()}
                        <span className="text-sm text-gray-500 ml-1">
                          ({variant.conversionRate.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Ingresos</div>
                      <div className="text-lg font-semibold dark:text-gray-100">
                        ${variant.revenue.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Traffic Allocation */}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Asignación de Tráfico
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={variant.trafficAllocation} className="h-2 flex-1" />
                      <span className="text-sm font-medium dark:text-gray-300">
                        {variant.trafficAllocation}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistical Note */}
      {!winner && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            El A/B test está en progreso. Se necesitan más datos para determinar un ganador con
            significancia estadística. Continúa enviando campañas para recopilar más métricas.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end">
        <Button
          onClick={onClose}
          variant="outline"
          className="dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Cerrar
        </Button>
      </div>
    </div>
  );
}
