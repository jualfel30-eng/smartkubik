import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FlaskConical,
  Plus,
  Trash2,
  TrendingUp,
  Users,
  MousePointerClick,
  DollarSign,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * ABTestBuilder - Component for creating and managing A/B tests
 *
 * Allows configuration of:
 * - Multiple variants with different content
 * - Traffic allocation (must sum to 100%)
 * - Test parameters (sample size, confidence level, optimization metric)
 * - Winner selection (manual or automatic)
 */

const OPTIMIZATION_METRICS = [
  {
    value: 'open_rate',
    label: 'Tasa de Apertura',
    icon: TrendingUp,
    description: 'Optimizar para mayor % de aperturas',
  },
  {
    value: 'click_rate',
    label: 'Tasa de Clics',
    icon: MousePointerClick,
    description: 'Optimizar para mayor % de clics',
  },
  {
    value: 'conversion_rate',
    label: 'Tasa de Conversión',
    icon: Users,
    description: 'Optimizar para mayor % de conversiones',
  },
  {
    value: 'revenue',
    label: 'Ingresos',
    icon: DollarSign,
    description: 'Optimizar para mayores ingresos',
  },
];

export default function ABTestBuilder({ campaignId, existingTest, onSave, onCancel }) {
  const [variants, setVariants] = useState(
    existingTest?.variants || [
      { name: 'Variant A', subject: '', message: '', media: [], trafficAllocation: 50 },
      { name: 'Variant B', subject: '', message: '', media: [], trafficAllocation: 50 },
    ]
  );

  const [testConfig, setTestConfig] = useState({
    minSampleSize: 1000,
    requiredConfidence: 95,
    optimizationMetric: 'conversion_rate',
    autoPromoteWinner: true,
    ...existingTest?.config,
  });

  const [allocationError, setAllocationError] = useState('');

  // Validate traffic allocation
  useEffect(() => {
    const total = variants.reduce((sum, v) => sum + (parseFloat(v.trafficAllocation) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      setAllocationError(`El total debe ser 100% (actualmente ${total.toFixed(1)}%)`);
    } else {
      setAllocationError('');
    }
  }, [variants]);

  const addVariant = () => {
    const newVariantLetter = String.fromCharCode(65 + variants.length); // A, B, C, D...
    const remainingAllocation = 100 - variants.reduce((sum, v) => sum + parseFloat(v.trafficAllocation || 0), 0);

    setVariants([
      ...variants,
      {
        name: `Variant ${newVariantLetter}`,
        subject: '',
        message: '',
        media: [],
        trafficAllocation: Math.max(0, remainingAllocation),
      },
    ]);
  };

  const removeVariant = (index) => {
    if (variants.length <= 2) {
      alert('Debe haber al menos 2 variantes para un A/B test');
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const distributeEqually = () => {
    const allocation = 100 / variants.length;
    setVariants(variants.map(v => ({ ...v, trafficAllocation: allocation })));
  };

  const handleSave = () => {
    if (allocationError) {
      alert('Por favor corrige la asignación de tráfico antes de guardar');
      return;
    }

    const testData = {
      campaignId,
      variants: variants.map(v => ({
        name: v.name,
        subject: v.subject,
        message: v.message,
        media: v.media,
        trafficAllocation: parseFloat(v.trafficAllocation),
      })),
      minSampleSize: testConfig.minSampleSize,
      requiredConfidence: testConfig.requiredConfidence,
      optimizationMetric: testConfig.optimizationMetric,
      autoPromoteWinner: testConfig.autoPromoteWinner,
    };

    onSave?.(testData);
  };

  const selectedMetric = OPTIMIZATION_METRICS.find(m => m.value === testConfig.optimizationMetric);
  const MetricIcon = selectedMetric?.icon || FlaskConical;

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <FlaskConical className="w-5 h-5 text-purple-600" />
            Configuración del A/B Test
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Define los parámetros del experimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="dark:text-gray-200">Tamaño Mínimo de Muestra</Label>
              <Input
                type="number"
                value={testConfig.minSampleSize}
                onChange={(e) => setTestConfig({ ...testConfig, minSampleSize: parseInt(e.target.value) })}
                min={100}
                className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Mínimo de envíos antes de determinar un ganador
              </p>
            </div>

            <div>
              <Label className="dark:text-gray-200">Nivel de Confianza (%)</Label>
              <Select
                value={testConfig.requiredConfidence.toString()}
                onValueChange={(value) => setTestConfig({ ...testConfig, requiredConfidence: parseInt(value) })}
              >
                <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="90" className="dark:text-gray-200">90% (menos estricto)</SelectItem>
                  <SelectItem value="95" className="dark:text-gray-200">95% (recomendado)</SelectItem>
                  <SelectItem value="99" className="dark:text-gray-200">99% (muy estricto)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Qué tan seguro debe ser el resultado
              </p>
            </div>
          </div>

          {/* Optimization Metric */}
          <div>
            <Label className="dark:text-gray-200">Métrica de Optimización</Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
              {OPTIMIZATION_METRICS.map((metric) => {
                const Icon = metric.icon;
                const isSelected = testConfig.optimizationMetric === metric.value;

                return (
                  <button
                    key={metric.value}
                    onClick={() => setTestConfig({ ...testConfig, optimizationMetric: metric.value })}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
                    <div className="font-medium text-sm dark:text-gray-100">
                      {metric.label}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {metric.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variants */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="dark:text-gray-100">Variantes</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Crea diferentes versiones del contenido a probar
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={distributeEqually}
                className="dark:border-gray-700 dark:hover:bg-gray-700"
              >
                Distribuir Equitativamente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={addVariant}
                className="dark:border-gray-700 dark:hover:bg-gray-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar Variante
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {allocationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{allocationError}</AlertDescription>
            </Alert>
          )}

          {variants.map((variant, index) => (
            <Card key={index} className="dark:bg-gray-900 dark:border-gray-700">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="dark:text-gray-200">Nombre de la Variante</Label>
                    <Input
                      value={variant.name}
                      onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      placeholder="Ej: Variante A"
                      className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                    />
                  </div>
                  {variants.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVariant(index)}
                      className="ml-2 text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div>
                  <Label className="dark:text-gray-200">Asunto del Email</Label>
                  <Input
                    value={variant.subject}
                    onChange={(e) => updateVariant(index, 'subject', e.target.value)}
                    placeholder="Asunto del mensaje..."
                    className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                  />
                </div>

                <div>
                  <Label className="dark:text-gray-200">Mensaje</Label>
                  <Textarea
                    value={variant.message}
                    onChange={(e) => updateVariant(index, 'message', e.target.value)}
                    placeholder="Contenido del mensaje..."
                    rows={4}
                    className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                  />
                </div>

                <div>
                  <Label className="dark:text-gray-200">
                    Asignación de Tráfico (%)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={variant.trafficAllocation}
                      onChange={(e) => updateVariant(index, 'trafficAllocation', e.target.value)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-24 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                    />
                    <div className="flex-1">
                      <Progress
                        value={variant.trafficAllocation}
                        className="h-2"
                      />
                    </div>
                    <span className="text-sm font-medium dark:text-gray-300">
                      {variant.trafficAllocation}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Porcentaje de usuarios que recibirán esta variante
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Total Allocation Summary */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="font-medium dark:text-gray-200">Total de Asignación:</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${
                allocationError
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {variants.reduce((sum, v) => sum + (parseFloat(v.trafficAllocation) || 0), 0).toFixed(1)}%
              </span>
              {!allocationError && (
                <Badge variant="default" className="bg-green-600">
                  <Award className="w-3 h-3 mr-1" />
                  Válido
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-promote Winner */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={testConfig.autoPromoteWinner}
              onChange={(e) => setTestConfig({ ...testConfig, autoPromoteWinner: e.target.checked })}
              className="mt-1"
            />
            <div>
              <Label className="dark:text-gray-200 cursor-pointer">
                Promover Automáticamente al Ganador
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Cuando una variante alcance significancia estadística, se declarará automáticamente como ganadora
                y se usará para todos los envíos futuros.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!!allocationError}
          className="flex-1 dark:bg-purple-600 dark:hover:bg-purple-700"
        >
          <FlaskConical className="w-4 h-4 mr-2" />
          {existingTest ? 'Actualizar A/B Test' : 'Crear A/B Test'}
        </Button>
      </div>
    </div>
  );
}
