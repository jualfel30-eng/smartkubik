/**
 * Pricing Strategy Utilities
 *
 * Funciones para calcular precios de productos según diferentes estrategias:
 * - Manual: Usuario ingresa precio directamente
 * - Markup: Precio = Costo × (1 + Margen%)
 * - Margin: Precio = Costo / (1 - Margen%)
 *
 * Basado en mejores prácticas de ERPs (SAP, Odoo, QuickBooks)
 *
 * @module pricing-strategy.util
 */

export interface PricingStrategy {
  mode: 'manual' | 'markup' | 'margin';
  markupPercentage?: number;
  marginPercentage?: number;
  autoCalculate: boolean;
  lastManualPrice?: number;
  psychologicalRounding?: 'none' | '0.99' | '0.95' | '0.90' | 'round_up' | 'round_down';
}

export interface PricingCalculationResult {
  basePrice: number;
  calculatedPrice: number;
  profitAmount: number;
  profitPercentage: number;
  isCalculated: boolean;
}

/**
 * Calcula el precio de venta según la estrategia de pricing
 *
 * @param costPrice - Precio de costo del producto
 * @param strategy - Estrategia de pricing a aplicar
 * @param manualPrice - Precio manual (solo si mode = 'manual')
 * @returns Precio calculado
 *
 * @example
 * // Markup: Costo $100, Margen 30% → Precio $130
 * calculatePrice(100, { mode: 'markup', markupPercentage: 30, autoCalculate: true })
 *
 * @example
 * // Margin: Costo $100, Margen 25% → Precio $133.33
 * calculatePrice(100, { mode: 'margin', marginPercentage: 25, autoCalculate: true })
 */
export function calculatePrice(
  costPrice: number,
  strategy: PricingStrategy,
  manualPrice?: number
): number {
  // Validación: costo debe ser >= 0
  if (costPrice < 0) {
    throw new Error('Cost price cannot be negative');
  }

  // Si no hay estrategia o está en modo manual, retornar precio manual
  if (!strategy || strategy.mode === 'manual') {
    return manualPrice ?? costPrice;
  }

  // Si autoCalculate está desactivado, retornar precio manual
  if (!strategy.autoCalculate) {
    return manualPrice ?? costPrice;
  }

  // Calcular según estrategia
  switch (strategy.mode) {
    case 'markup':
      return calculateMarkupPrice(costPrice, strategy.markupPercentage ?? 0);

    case 'margin':
      return calculateMarginPrice(costPrice, strategy.marginPercentage ?? 0);

    default:
      return manualPrice ?? costPrice;
  }
}

/**
 * Calcula precio usando estrategia Markup (Margen sobre Costo)
 * Fórmula: Precio = Costo × (1 + Margen%)
 *
 * @param costPrice - Precio de costo
 * @param markupPercentage - Porcentaje de markup (ej: 30 para 30%)
 * @returns Precio calculado
 *
 * @example
 * calculateMarkupPrice(100, 30) // → 130
 * calculateMarkupPrice(50, 50)  // → 75
 */
export function calculateMarkupPrice(
  costPrice: number,
  markupPercentage: number
): number {
  if (markupPercentage < 0 || markupPercentage > 1000) {
    throw new Error('Markup percentage must be between 0 and 1000');
  }

  const multiplier = 1 + markupPercentage / 100;
  const price = costPrice * multiplier;

  // Redondear a 2 decimales
  return Math.round(price * 100) / 100;
}

/**
 * Calcula precio usando estrategia Margin (Margen de Ganancia)
 * Fórmula: Precio = Costo / (1 - Margen%)
 *
 * @param costPrice - Precio de costo
 * @param marginPercentage - Porcentaje de margen (ej: 25 para 25%)
 * @returns Precio calculado
 *
 * @example
 * calculateMarginPrice(100, 25) // → 133.33 (ganancia del 25% sobre el precio final)
 * calculateMarginPrice(100, 20) // → 125.00
 */
export function calculateMarginPrice(
  costPrice: number,
  marginPercentage: number
): number {
  // Validar que el margen sea < 100% (evitar división por cero)
  if (marginPercentage < 0 || marginPercentage >= 100) {
    throw new Error('Margin percentage must be between 0 and 99.9');
  }

  const divisor = 1 - marginPercentage / 100;
  const price = costPrice / divisor;

  // Redondear a 2 decimales
  return Math.round(price * 100) / 100;
}

/**
 * Calcula métricas de rentabilidad a partir de costo y precio
 *
 * @param costPrice - Precio de costo
 * @param sellingPrice - Precio de venta
 * @returns Objeto con métricas de rentabilidad
 */
export function calculateProfitMetrics(
  costPrice: number,
  sellingPrice: number
): {
  profitAmount: number;
  profitPercentage: number;
  markup: number;
  margin: number;
} {
  const profitAmount = sellingPrice - costPrice;
  const profitPercentage = costPrice > 0 ? (profitAmount / costPrice) * 100 : 0;

  // Markup: (Precio - Costo) / Costo × 100
  const markup = profitPercentage;

  // Margin: (Precio - Costo) / Precio × 100
  const margin = sellingPrice > 0 ? (profitAmount / sellingPrice) * 100 : 0;

  return {
    profitAmount: Math.round(profitAmount * 100) / 100,
    profitPercentage: Math.round(profitPercentage * 100) / 100,
    markup: Math.round(markup * 100) / 100,
    margin: Math.round(margin * 100) / 100,
  };
}

/**
 * Calcula el precio de venta completo con toda la información de rentabilidad
 *
 * @param costPrice - Precio de costo
 * @param strategy - Estrategia de pricing
 * @param manualPrice - Precio manual (opcional)
 * @returns Resultado completo del cálculo
 */
export function calculatePriceWithMetrics(
  costPrice: number,
  strategy: PricingStrategy,
  manualPrice?: number
): PricingCalculationResult {
  const calculatedPrice = calculatePrice(costPrice, strategy, manualPrice);
  const isCalculated = strategy?.mode !== 'manual' && strategy?.autoCalculate === true;
  const finalPrice = isCalculated ? calculatedPrice : (manualPrice ?? costPrice);

  const metrics = calculateProfitMetrics(costPrice, finalPrice);

  return {
    basePrice: finalPrice,
    calculatedPrice,
    profitAmount: metrics.profitAmount,
    profitPercentage: metrics.profitPercentage,
    isCalculated,
  };
}

/**
 * Valida si una estrategia de pricing es válida
 *
 * @param strategy - Estrategia a validar
 * @returns true si es válida, error message si no lo es
 */
export function validatePricingStrategy(
  strategy: PricingStrategy
): { valid: boolean; error?: string } {
  if (!strategy) {
    return { valid: true }; // Estrategia opcional
  }

  if (!['manual', 'markup', 'margin'].includes(strategy.mode)) {
    return { valid: false, error: 'Invalid pricing mode' };
  }

  if (strategy.mode === 'markup' && strategy.markupPercentage !== undefined) {
    if (strategy.markupPercentage < 0 || strategy.markupPercentage > 1000) {
      return { valid: false, error: 'Markup percentage must be between 0 and 1000' };
    }
  }

  if (strategy.mode === 'margin' && strategy.marginPercentage !== undefined) {
    if (strategy.marginPercentage < 0 || strategy.marginPercentage >= 100) {
      return { valid: false, error: 'Margin percentage must be between 0 and 99.9' };
    }
  }

  return { valid: true };
}

/**
 * Aplica redondeo psicológico a un precio (ej: $99.99 en lugar de $100.03)
 *
 * @param price - Precio a redondear
 * @param strategy - Estrategia de redondeo
 * @returns Precio redondeado
 *
 * @example
 * applyPsychologicalRounding(100.23, '0.99') // → 99.99
 * applyPsychologicalRounding(47.83, '0.95')  // → 47.95
 * applyPsychologicalRounding(52.40, 'round_up') // → 53.00
 * applyPsychologicalRounding(52.90, 'round_down') // → 52.00
 */
export function applyPsychologicalRounding(
  price: number,
  strategy: 'none' | '0.99' | '0.95' | '0.90' | 'round_up' | 'round_down' = 'none'
): number {
  if (strategy === 'none') {
    return Math.round(price * 100) / 100;
  }

  if (strategy === 'round_up') {
    return Math.ceil(price);
  }

  if (strategy === 'round_down') {
    return Math.floor(price);
  }

  // Redondeo psicológico (.99, .95, .90)
  const wholePart = Math.floor(price);
  const decimalPart = parseFloat(`0.${strategy.split('.')[1]}`);

  return wholePart + decimalPart;
}

/**
 * Calcula precio con redondeo psicológico incluido
 *
 * @param costPrice - Precio de costo
 * @param strategy - Estrategia de pricing completa (incluye redondeo)
 * @param manualPrice - Precio manual (opcional)
 * @returns Precio final con redondeo aplicado
 */
export function calculatePriceWithRounding(
  costPrice: number,
  strategy: PricingStrategy,
  manualPrice?: number
): number {
  const basePrice = calculatePrice(costPrice, strategy, manualPrice);

  if (strategy.psychologicalRounding && strategy.psychologicalRounding !== 'none') {
    return applyPsychologicalRounding(basePrice, strategy.psychologicalRounding);
  }

  return basePrice;
}
