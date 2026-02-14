import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx';

/**
 * Componente para mostrar alertas visuales sobre el margen de ganancia
 *
 * @param {Object} props
 * @param {number} props.costPrice - Precio de costo
 * @param {number} props.sellingPrice - Precio de venta
 * @param {number} props.minimumMargin - Margen mínimo recomendado (%)
 * @param {number} props.warningThreshold - Umbral de warning (%)
 */
export function MarginAlert({ costPrice, sellingPrice, minimumMargin = 15, warningThreshold = 10 }) {
  const profitAmount = sellingPrice - costPrice;
  const marginPercentage = sellingPrice > 0 ? (profitAmount / sellingPrice) * 100 : 0;

  // Critical: Margen negativo (pérdida)
  if (marginPercentage < 0) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>⚠️ Precio con Pérdida</AlertTitle>
        <AlertDescription>
          El precio de venta (${sellingPrice.toFixed(2)}) es menor que el costo ($
          {costPrice.toFixed(2)}). Tendrás una pérdida de ${Math.abs(profitAmount).toFixed(2)} por
          unidad.
        </AlertDescription>
      </Alert>
    );
  }

  // Warning: Margen crítico (< warningThreshold)
  if (marginPercentage < warningThreshold) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>⚠️ Margen Crítico</AlertTitle>
        <AlertDescription>
          Margen de ganancia muy bajo ({marginPercentage.toFixed(1)}%). Se recomienda al menos{' '}
          {minimumMargin}%. Ganancia actual: ${profitAmount.toFixed(2)} por unidad.
        </AlertDescription>
      </Alert>
    );
  }

  // Warning: Margen bajo (< minimumMargin)
  if (marginPercentage < minimumMargin) {
    return (
      <Alert className="mt-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle>⚡ Margen Bajo</AlertTitle>
        <AlertDescription>
          Margen de ganancia ({marginPercentage.toFixed(1)}%) está por debajo del mínimo
          recomendado ({minimumMargin}%). Ganancia: ${profitAmount.toFixed(2)} por unidad.
        </AlertDescription>
      </Alert>
    );
  }

  // Excellent: Margen alto (>= 30%)
  if (marginPercentage >= 30) {
    return (
      <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Excelente margen de ganancia ({marginPercentage.toFixed(1)}%). Ganancia: $
          {profitAmount.toFixed(2)} por unidad.
        </p>
      </div>
    );
  }

  // Good: Margen aceptable
  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg">
      <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
        <CheckCircle className="h-4 w-4" />
        Margen aceptable ({marginPercentage.toFixed(1)}%). Ganancia: ${profitAmount.toFixed(2)} por
        unidad.
      </p>
    </div>
  );
}
