/**
 * Pricing Validation Utilities
 *
 * Funciones para validar márgenes de ganancia y alertar sobre precios con margen bajo.
 * Basado en mejores prácticas de ERPs para prevenir pérdidas y mantener rentabilidad.
 *
 * @module pricing-validation.util
 */

export interface PricingPolicies {
  minimumMarginPercentage: number; // Margen mínimo recomendado (%)
  enforceMinimumMargin: boolean; // Si debe bloquear guardado
  warningThreshold: number; // Mostrar warning si margen < este valor (%)
}

export interface MarginValidationResult {
  isValid: boolean;
  marginPercentage: number;
  level: 'critical' | 'warning' | 'good' | 'excellent';
  message?: string;
  shouldBlock: boolean;
}

/**
 * Valida si el margen de ganancia cumple con las políticas del tenant
 *
 * @param costPrice - Precio de costo
 * @param sellingPrice - Precio de venta
 * @param policies - Políticas de pricing del tenant (opcional)
 * @returns Resultado de validación con nivel de alerta
 *
 * @example
 * // Margen negativo (pérdida)
 * validateProfitMargin(100, 90) // → { level: 'critical', shouldBlock: true }
 *
 * @example
 * // Margen bajo
 * validateProfitMargin(100, 110, { minimumMarginPercentage: 15, enforceMinimumMargin: false, warningThreshold: 10 })
 * // → { level: 'warning', shouldBlock: false }
 *
 * @example
 * // Margen aceptable
 * validateProfitMargin(100, 125) // → { level: 'good', shouldBlock: false }
 */
export function validateProfitMargin(
  costPrice: number,
  sellingPrice: number,
  policies?: Partial<PricingPolicies>
): MarginValidationResult {
  const defaultPolicies: PricingPolicies = {
    minimumMarginPercentage: 15,
    enforceMinimumMargin: false,
    warningThreshold: 10,
  };

  const activePolicies: PricingPolicies = {
    ...defaultPolicies,
    ...policies,
  };

  // Calcular margen de ganancia: (Precio - Costo) / Precio × 100
  const profitAmount = sellingPrice - costPrice;
  const marginPercentage = sellingPrice > 0 ? (profitAmount / sellingPrice) * 100 : 0;

  // CRITICAL: Margen negativo (pérdida)
  if (marginPercentage < 0) {
    return {
      isValid: false,
      marginPercentage,
      level: 'critical',
      message: `⚠️ PÉRDIDA: El precio de venta ($${sellingPrice.toFixed(
        2
      )}) es menor que el costo ($${costPrice.toFixed(
        2
      )}). Tendrás una pérdida de $${Math.abs(profitAmount).toFixed(2)} por unidad.`,
      shouldBlock: true, // Siempre bloquear pérdidas
    };
  }

  // WARNING: Margen crítico (por debajo del threshold)
  if (marginPercentage < activePolicies.warningThreshold) {
    return {
      isValid: !activePolicies.enforceMinimumMargin,
      marginPercentage,
      level: 'warning',
      message: `⚠️ MARGEN CRÍTICO: ${marginPercentage.toFixed(
        1
      )}% de margen es muy bajo. Se recomienda al menos ${
        activePolicies.minimumMarginPercentage
      }%. Ganancia: $${profitAmount.toFixed(2)} por unidad.`,
      shouldBlock: activePolicies.enforceMinimumMargin,
    };
  }

  // WARNING: Margen bajo (entre threshold y mínimo)
  if (marginPercentage < activePolicies.minimumMarginPercentage) {
    return {
      isValid: !activePolicies.enforceMinimumMargin,
      marginPercentage,
      level: 'warning',
      message: `⚡ MARGEN BAJO: ${marginPercentage.toFixed(
        1
      )}% de margen está por debajo del mínimo recomendado (${
        activePolicies.minimumMarginPercentage
      }%). Ganancia: $${profitAmount.toFixed(2)} por unidad.`,
      shouldBlock: activePolicies.enforceMinimumMargin,
    };
  }

  // GOOD: Margen aceptable (entre mínimo y 30%)
  if (marginPercentage < 30) {
    return {
      isValid: true,
      marginPercentage,
      level: 'good',
      message: `✓ Margen aceptable: ${marginPercentage.toFixed(1)}%. Ganancia: $${profitAmount.toFixed(
        2
      )} por unidad.`,
      shouldBlock: false,
    };
  }

  // EXCELLENT: Margen alto (>= 30%)
  return {
    isValid: true,
    marginPercentage,
    level: 'excellent',
    message: `✓ Excelente margen: ${marginPercentage.toFixed(1)}%. Ganancia: $${profitAmount.toFixed(
      2
    )} por unidad.`,
    shouldBlock: false,
  };
}

/**
 * Valida márgenes de múltiples variantes de un producto
 *
 * @param variants - Array de variantes con costPrice y basePrice
 * @param policies - Políticas de pricing del tenant
 * @returns Array de resultados de validación por variante
 */
export function validateProductVariantsMargins(
  variants: Array<{ name: string; costPrice: number; basePrice: number }>,
  policies?: Partial<PricingPolicies>
): Array<{ variantName: string; validation: MarginValidationResult }> {
  return variants.map((variant) => ({
    variantName: variant.name,
    validation: validateProfitMargin(variant.costPrice, variant.basePrice, policies),
  }));
}

/**
 * Calcula el precio mínimo de venta para alcanzar un margen objetivo
 *
 * @param costPrice - Precio de costo
 * @param targetMarginPercentage - Margen objetivo (%)
 * @returns Precio mínimo de venta requerido
 *
 * @example
 * calculateMinimumSellingPrice(100, 20) // → 125.00
 * // Para lograr 20% de margen sobre $100 de costo, necesitas vender a $125
 */
export function calculateMinimumSellingPrice(
  costPrice: number,
  targetMarginPercentage: number
): number {
  if (targetMarginPercentage < 0 || targetMarginPercentage >= 100) {
    throw new Error('Target margin percentage must be between 0 and 99.9');
  }

  // Fórmula: Precio = Costo / (1 - Margen%)
  const minimumPrice = costPrice / (1 - targetMarginPercentage / 100);

  return Math.round(minimumPrice * 100) / 100;
}

/**
 * Sugiere un precio de venta basado en el costo y margen recomendado
 *
 * @param costPrice - Precio de costo
 * @param policies - Políticas de pricing del tenant
 * @returns Precio sugerido
 */
export function suggestSellingPrice(
  costPrice: number,
  policies?: Partial<PricingPolicies>
): {
  suggestedPrice: number;
  marginPercentage: number;
  message: string;
} {
  const defaultPolicies: PricingPolicies = {
    minimumMarginPercentage: 15,
    enforceMinimumMargin: false,
    warningThreshold: 10,
  };

  const activePolicies: PricingPolicies = {
    ...defaultPolicies,
    ...policies,
  };

  const suggestedPrice = calculateMinimumSellingPrice(
    costPrice,
    activePolicies.minimumMarginPercentage
  );

  return {
    suggestedPrice,
    marginPercentage: activePolicies.minimumMarginPercentage,
    message: `Precio sugerido con ${activePolicies.minimumMarginPercentage}% de margen: $${suggestedPrice.toFixed(
      2
    )}`,
  };
}
