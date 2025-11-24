import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Info,
  Award,
  BarChart3
} from 'lucide-react';

const SEGMENT_COLORS = {
  new: 'bg-green-500',
  occasional: 'bg-blue-500',
  regular: 'bg-purple-500',
  frequent: 'bg-orange-500',
  champion: 'bg-yellow-500',
};

const SEGMENT_LABELS = {
  new: 'Nuevo',
  occasional: 'Ocasional',
  regular: 'Regular',
  frequent: 'Frecuente',
  champion: 'Champion',
};

const ENGAGEMENT_COLORS = {
  very_high: 'bg-green-500',
  high: 'bg-blue-500',
  medium: 'bg-yellow-500',
  low: 'bg-orange-500',
  at_risk: 'bg-red-500',
};

const ENGAGEMENT_LABELS = {
  very_high: 'Muy Alto',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
  at_risk: 'En Riesgo',
};

/**
 * AudiencePreview - PHASE 3 Real-time Audience Insights Component
 *
 * Displays detailed audience insights from CustomerProductAffinity cache:
 * - Total matching customers
 * - Segment distribution (new, occasional, regular, frequent, champion)
 * - Engagement level distribution (very_high, high, medium, low, at_risk)
 * - Average affinity score
 * - Average purchase frequency
 * - Estimated conversion rate
 * - Estimated revenue
 * - Sample customers preview
 *
 * @param {object} insights - Audience insights data from backend
 * @param {boolean} loading - Loading state
 * @param {string} className - Additional CSS classes
 */
export default function AudiencePreview({ insights, loading, className = '' }) {
  const [expandedSection, setExpandedSection] = useState(null);

  if (loading) {
    return (
      <Card className={`dark:bg-gray-800 dark:border-gray-700 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse delay-75"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse delay-150"></div>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
            Calculando audiencia...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Alert className="border-gray-200 dark:border-gray-700">
        <Info className="h-4 w-4" />
        <AlertDescription className="dark:text-gray-300">
          Configura los criterios de targeting para ver la audiencia estimada
        </AlertDescription>
      </Alert>
    );
  }

  const {
    totalCustomers = 0,
    segmentDistribution = {},
    engagementDistribution = {},
    averageAffinityScore = 0,
    averagePurchaseFrequency = 0,
    totalPotentialRevenue = 0,
    estimatedConversionRate = 0,
    estimatedRevenue = 0,
    topCustomerIds = [],
    sampleCustomers = [],
  } = insights;

  // Calculate percentages for segment distribution
  const segmentPercentages = {};
  Object.keys(segmentDistribution).forEach(segment => {
    segmentPercentages[segment] = totalCustomers > 0
      ? ((segmentDistribution[segment] / totalCustomers) * 100).toFixed(1)
      : 0;
  });

  // Calculate percentages for engagement distribution
  const engagementPercentages = {};
  Object.keys(engagementDistribution).forEach(level => {
    engagementPercentages[level] = totalCustomers > 0
      ? ((engagementDistribution[level] / totalCustomers) * 100).toFixed(1)
      : 0;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Summary */}
      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg text-blue-900 dark:text-blue-100">
                {totalCustomers.toLocaleString()} Clientes
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Alcance estimado de la campaña
              </p>
            </div>
            {averageAffinityScore > 0 && (
              <div className="text-right">
                <p className="font-bold text-2xl text-blue-600 dark:text-blue-400">
                  {averageAffinityScore.toFixed(1)}%
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Afinidad Promedio
                </p>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Purchase Frequency */}
        {averagePurchaseFrequency > 0 && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Frecuencia Promedio
                  </p>
                  <p className="text-xl font-bold dark:text-gray-100">
                    {averagePurchaseFrequency.toFixed(0)} días
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estimated Conversion Rate */}
        {estimatedConversionRate > 0 && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Conversión Estimada
                  </p>
                  <p className="text-xl font-bold dark:text-gray-100">
                    {estimatedConversionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estimated Revenue */}
        {estimatedRevenue > 0 && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Ingreso Estimado
                  </p>
                  <p className="text-xl font-bold dark:text-gray-100">
                    ${estimatedRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Segment Distribution */}
      {Object.keys(segmentDistribution).length > 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
              <Users className="w-5 h-5" />
              Distribución por Segmento de Cliente
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Clientes organizados por comportamiento de compra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(segmentDistribution).map(([segment, count]) => {
              const percentage = segmentPercentages[segment];
              const color = SEGMENT_COLORS[segment] || 'bg-gray-500';
              const label = SEGMENT_LABELS[segment] || segment;

              return (
                <div key={segment} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color}`}></div>
                      <span className="text-sm font-medium dark:text-gray-200">
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {count} clientes
                      </span>
                      <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                        {percentage}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={parseFloat(percentage)} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Engagement Distribution */}
      {Object.keys(engagementDistribution).length > 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
              <Sparkles className="w-5 h-5" />
              Distribución por Nivel de Engagement
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Nivel de actividad e interacción con el producto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(engagementDistribution).map(([level, count]) => {
              const percentage = engagementPercentages[level];
              const color = ENGAGEMENT_COLORS[level] || 'bg-gray-500';
              const label = ENGAGEMENT_LABELS[level] || level;

              return (
                <div key={level} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color}`}></div>
                      <span className="text-sm font-medium dark:text-gray-200">
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {count} clientes
                      </span>
                      <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                        {percentage}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={parseFloat(percentage)} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Top Customers */}
      {topCustomerIds && topCustomerIds.length > 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
              <Award className="w-5 h-5" />
              Top Clientes por Afinidad
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Clientes con mayor score de afinidad para este producto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topCustomerIds.slice(0, 10).map((customerId, index) => (
                <Badge
                  key={customerId}
                  variant="secondary"
                  className="dark:bg-yellow-900/30 dark:text-yellow-200"
                >
                  #{index + 1} {customerId.substring(0, 8)}...
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Customers Preview */}
      {sampleCustomers && sampleCustomers.length > 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
              <Users className="w-5 h-5" />
              Vista Previa de Clientes
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Primeros 10 clientes que recibirán esta campaña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sampleCustomers.slice(0, 10).map((customer, index) => (
                <div
                  key={customer._id || index}
                  className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                >
                  <div>
                    <p className="font-medium dark:text-gray-100">
                      {customer.name || customer.email || 'Cliente sin nombre'}
                    </p>
                    {customer.email && customer.name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {customer.email}
                      </p>
                    )}
                  </div>
                  {customer.affinityScore !== undefined && (
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                      Afinidad: {customer.affinityScore.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning for low audience */}
      {totalCustomers < 10 && totalCustomers > 0 && (
        <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-900 dark:text-yellow-100">
            <p className="font-semibold">Audiencia pequeña detectada</p>
            <p className="text-sm mt-1">
              Solo {totalCustomers} cliente(s) cumplen con los criterios.
              Considera ampliar los filtros para alcanzar más clientes.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* No audience warning */}
      {totalCustomers === 0 && (
        <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-900 dark:text-red-100">
            <p className="font-semibold">No se encontraron clientes</p>
            <p className="text-sm mt-1">
              Ningún cliente cumple con los criterios actuales.
              Ajusta los filtros para ampliar la audiencia.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
