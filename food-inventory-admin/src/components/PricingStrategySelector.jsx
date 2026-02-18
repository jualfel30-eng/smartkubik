import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { AlertCircle, TrendingUp, Calculator, Edit } from 'lucide-react';
import { usePricingCalculator } from '@/hooks/usePricingCalculator';
import { MarginAlert } from '@/components/MarginAlert.jsx';
import { cn } from '@/lib/utils';

/**
 * Componente para seleccionar y configurar la estrategia de pricing de un producto
 *
 * @param {Object} props
 * @param {Object} props.strategy - Estrategia actual
 * @param {number} props.costPrice - Precio de costo del producto
 * @param {number} props.basePrice - Precio de venta actual
 * @param {Function} props.onStrategyChange - Callback cuando cambia la estrategia
 * @param {Function} props.onPriceChange - Callback cuando cambia el precio calculado
 * @param {boolean} props.disabled - Si el selector está deshabilitado
 * @param {string} props.className - Clases CSS adicionales
 */
export function PricingStrategySelector({
  strategy,
  costPrice = 0,
  basePrice = 0,
  onStrategyChange,
  onPriceChange,
  disabled = false,
  className,
}) {
  const { calculatePriceWithRounding, calculateProfitMetrics, applyPsychologicalRounding } = usePricingCalculator();

  // Estado local de la estrategia
  const [localStrategy, setLocalStrategy] = useState(
    strategy || {
      mode: 'manual',
      autoCalculate: false,
      markupPercentage: 30,
      marginPercentage: 25,
      psychologicalRounding: 'none',
    }
  );

  // Sync internal state when the strategy prop changes from outside
  // (e.g. when the edit dialog opens with an existing product's saved strategy)
  useEffect(() => {
    if (strategy) {
      setLocalStrategy(strategy);
    }
  }, [
    strategy?.mode,
    strategy?.markupPercentage,
    strategy?.marginPercentage,
    strategy?.autoCalculate,
    strategy?.psychologicalRounding,
  ]);

  // Calcular precio automáticamente (incluye redondeo psicológico)
  const calculatedPrice = calculatePriceWithRounding(costPrice, localStrategy, basePrice);
  const metrics = calculateProfitMetrics(costPrice, calculatedPrice);

  // Actualizar cuando cambia la estrategia
  useEffect(() => {
    if (onStrategyChange) {
      onStrategyChange(localStrategy);
    }

    // Si está en modo auto, actualizar el precio
    if (localStrategy.autoCalculate && localStrategy.mode !== 'manual' && onPriceChange) {
      onPriceChange(calculatedPrice);
    }
  }, [localStrategy, calculatedPrice]);

  const handleModeChange = (newMode) => {
    setLocalStrategy((prev) => ({
      ...prev,
      mode: newMode,
      autoCalculate: newMode !== 'manual',
    }));
  };

  const handlePercentageChange = (field, value) => {
    setLocalStrategy((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAutoCalculateToggle = (checked) => {
    setLocalStrategy((prev) => ({
      ...prev,
      autoCalculate: checked,
    }));
  };

  return (
    <Card className={cn('border-2', className)}>
      <CardContent className="pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <Label className="text-base font-semibold">Estrategia de Precio</Label>
          </div>
          {localStrategy.mode !== 'manual' && (
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-calculate" className="text-sm font-normal">
                Auto-calcular
              </Label>
              <Switch
                id="auto-calculate"
                checked={localStrategy.autoCalculate}
                onCheckedChange={handleAutoCalculateToggle}
                disabled={disabled}
              />
            </div>
          )}
        </div>

        {/* Mode Selector */}
        <RadioGroup
          value={localStrategy.mode}
          onValueChange={handleModeChange}
          disabled={disabled}
          className="grid gap-3"
        >
          {/* Manual Mode */}
          <Label
            htmlFor="mode-manual"
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50',
              localStrategy.mode === 'manual' && 'border-primary bg-primary/5'
            )}
          >
            <RadioGroupItem value="manual" id="mode-manual" className="mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                <span className="font-medium">Manual</span>
                <Badge variant="outline" className="text-xs">
                  Por defecto
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Ingresa el precio de venta manualmente
              </p>
            </div>
          </Label>

          {/* Markup Mode */}
          <Label
            htmlFor="mode-markup"
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50',
              localStrategy.mode === 'markup' && 'border-primary bg-primary/5'
            )}
          >
            <RadioGroupItem value="markup" id="mode-markup" className="mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Margen sobre Costo (Markup)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Precio = Costo × (1 + Margen%)
              </p>
              {localStrategy.mode === 'markup' && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="markup-percentage" className="text-sm">
                    Porcentaje de Margen (%)
                  </Label>
                  <div className="flex items-center gap-3">
                    <NumberInput
                      id="markup-percentage"
                      value={localStrategy.markupPercentage ?? 30}
                      onValueChange={(val) =>
                        handlePercentageChange('markupPercentage', val)
                      }
                      min={0}
                      max={1000}
                      step={1}
                      disabled={disabled}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    Ejemplo: Costo $100 + Margen {localStrategy.markupPercentage}% = $
                    {(100 * (1 + (localStrategy.markupPercentage ?? 30) / 100)).toFixed(
                      2
                    )}
                  </div>
                </div>
              )}
            </div>
          </Label>

          {/* Margin Mode */}
          <Label
            htmlFor="mode-margin"
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50',
              localStrategy.mode === 'margin' && 'border-primary bg-primary/5'
            )}
          >
            <RadioGroupItem value="margin" id="mode-margin" className="mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Margen de Ganancia (Margin)</span>
                <Badge variant="secondary" className="text-xs">
                  Recomendado
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Precio = Costo / (1 - Margen%)
              </p>
              {localStrategy.mode === 'margin' && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="margin-percentage" className="text-sm">
                    Porcentaje de Ganancia (%)
                  </Label>
                  <div className="flex items-center gap-3">
                    <NumberInput
                      id="margin-percentage"
                      value={localStrategy.marginPercentage ?? 25}
                      onValueChange={(val) =>
                        handlePercentageChange('marginPercentage', val)
                      }
                      min={0}
                      max={99.9}
                      step={0.1}
                      disabled={disabled}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    Ejemplo: Costo $100 con {localStrategy.marginPercentage}% ganancia = $
                    {(100 / (1 - (localStrategy.marginPercentage ?? 25) / 100)).toFixed(
                      2
                    )}
                  </div>
                </div>
              )}
            </div>
          </Label>
        </RadioGroup>

        {/* Psychological Rounding Selector */}
        {localStrategy.mode !== 'manual' && localStrategy.autoCalculate && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium">Redondeo de Precio (Opcional)</Label>
            <Select
              value={localStrategy.psychologicalRounding || 'none'}
              onValueChange={(value) =>
                setLocalStrategy((prev) => ({ ...prev, psychologicalRounding: value }))
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin redondeo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin redondeo</SelectItem>
                <SelectItem value="0.99">Terminar en .99 (Ej: $99.99)</SelectItem>
                <SelectItem value="0.95">Terminar en .95 (Ej: $99.95)</SelectItem>
                <SelectItem value="0.90">Terminar en .90 (Ej: $99.90)</SelectItem>
                <SelectItem value="round_up">Redondear hacia arriba (Ej: $100.00)</SelectItem>
                <SelectItem value="round_down">Redondear hacia abajo (Ej: $99.00)</SelectItem>
              </SelectContent>
            </Select>

            {localStrategy.psychologicalRounding && localStrategy.psychologicalRounding !== 'none' && (
              <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                📊 Ejemplo: Precio calculado $127.43 → $
                {applyPsychologicalRounding(127.43, localStrategy.psychologicalRounding).toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Price Preview */}
        {localStrategy.mode !== 'manual' && localStrategy.autoCalculate && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Calculator className="h-4 w-4" />
              <span className="font-semibold text-sm">Vista Previa del Precio</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Precio de Costo</p>
                <p className="text-lg font-bold">${costPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Precio de Venta</p>
                <p className="text-lg font-bold text-primary">
                  ${calculatedPrice.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ganancia</p>
                <p className="text-sm font-semibold text-green-600">
                  ${metrics.profitAmount.toFixed(2)} ({metrics.profitPercentage.toFixed(1)}
                  %)
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margen Real</p>
                <p className="text-sm font-semibold">{metrics.margin.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Margin Alert - Mostrar siempre cuando hay precio calculado */}
        {localStrategy.mode !== 'manual' && localStrategy.autoCalculate && (
          <MarginAlert
            costPrice={costPrice}
            sellingPrice={calculatedPrice}
            minimumMargin={15}
            warningThreshold={10}
          />
        )}

        {/* Manual mode: show live markup indicator */}
        {localStrategy.mode === 'manual' && (
          <>
            {costPrice > 0 && basePrice > 0 ? (
              <div className="p-3 bg-muted/50 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Margen sobre costo actual</span>
                  <span className={cn(
                    'text-sm font-bold',
                    metrics.profitPercentage < 0 ? 'text-red-600' :
                    metrics.profitPercentage < 10 ? 'text-orange-600' :
                    metrics.profitPercentage < 30 ? 'text-blue-600' :
                    'text-green-600'
                  )}>
                    {metrics.profitPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ganancia por unidad</span>
                  <span className="font-medium">${(basePrice - costPrice).toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  Ingresa costo y precio de venta para ver el margen calculado automáticamente.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
