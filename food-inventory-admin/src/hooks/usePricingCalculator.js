import { useMemo, useCallback } from 'react';

/**
 * Custom hook para cálculo de precios según estrategia de pricing
 *
 * Soporta 3 modos:
 * - manual: Usuario ingresa precio directamente
 * - markup: Precio = Costo × (1 + Margen%)
 * - margin: Precio = Costo / (1 - Margen%)
 *
 * @returns {Object} Funciones de cálculo y validación
 */
export function usePricingCalculator() {
  /**
   * Calcula precio usando estrategia Markup (Margen sobre Costo)
   * Fórmula: Precio = Costo × (1 + Margen%)
   *
   * @param {number} costPrice - Precio de costo
   * @param {number} markupPercentage - Porcentaje de markup (ej: 30 para 30%)
   * @returns {number} Precio calculado
   */
  const calculateMarkupPrice = useCallback((costPrice, markupPercentage) => {
    if (markupPercentage < 0 || markupPercentage > 1000) {
      console.warn('Markup percentage must be between 0 and 1000');
      return costPrice;
    }

    const multiplier = 1 + markupPercentage / 100;
    const price = costPrice * multiplier;

    // Redondear a 2 decimales
    return Math.round(price * 100) / 100;
  }, []);

  /**
   * Calcula precio usando estrategia Margin (Margen de Ganancia)
   * Fórmula: Precio = Costo / (1 - Margen%)
   *
   * @param {number} costPrice - Precio de costo
   * @param {number} marginPercentage - Porcentaje de margen (ej: 25 para 25%)
   * @returns {number} Precio calculado
   */
  const calculateMarginPrice = useCallback((costPrice, marginPercentage) => {
    // Validar que el margen sea < 100% (evitar división por cero)
    if (marginPercentage < 0 || marginPercentage >= 100) {
      console.warn('Margin percentage must be between 0 and 99.9');
      return costPrice;
    }

    const divisor = 1 - marginPercentage / 100;
    const price = costPrice / divisor;

    // Redondear a 2 decimales
    return Math.round(price * 100) / 100;
  }, []);

  /**
   * Calcula el precio de venta según la estrategia de pricing
   *
   * @param {number} costPrice - Precio de costo del producto
   * @param {Object} strategy - Estrategia de pricing a aplicar
   * @param {string} strategy.mode - 'manual' | 'markup' | 'margin'
   * @param {number} [strategy.markupPercentage] - % para markup
   * @param {number} [strategy.marginPercentage] - % para margin
   * @param {boolean} strategy.autoCalculate - Si recalcula automático
   * @param {number} [manualPrice] - Precio manual (solo si mode = 'manual')
   * @returns {number} Precio calculado
   */
  const calculatePrice = useCallback((costPrice, strategy, manualPrice) => {
    // Validación: costo debe ser >= 0
    if (costPrice < 0) {
      return 0;
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
  }, [calculateMarkupPrice, calculateMarginPrice]);

  /**
   * Calcula métricas de rentabilidad a partir de costo y precio
   *
   * @param {number} costPrice - Precio de costo
   * @param {number} sellingPrice - Precio de venta
   * @returns {Object} Métricas de rentabilidad
   */
  const calculateProfitMetrics = useCallback((costPrice, sellingPrice) => {
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
  }, []);

  /**
   * Valida si una estrategia de pricing es válida
   *
   * @param {Object} strategy - Estrategia a validar
   * @returns {Object} { valid: boolean, error?: string }
   */
  const validatePricingStrategy = useCallback((strategy) => {
    if (!strategy) {
      return { valid: true }; // Estrategia opcional
    }

    if (!['manual', 'markup', 'margin'].includes(strategy.mode)) {
      return { valid: false, error: 'Modo de pricing inválido' };
    }

    if (strategy.mode === 'markup' && strategy.markupPercentage !== undefined) {
      if (strategy.markupPercentage < 0 || strategy.markupPercentage > 1000) {
        return { valid: false, error: 'El porcentaje de markup debe estar entre 0 y 1000' };
      }
    }

    if (strategy.mode === 'margin' && strategy.marginPercentage !== undefined) {
      if (strategy.marginPercentage < 0 || strategy.marginPercentage >= 100) {
        return { valid: false, error: 'El porcentaje de margen debe estar entre 0 y 99.9' };
      }
    }

    return { valid: true };
  }, []);

  /**
   * Aplica redondeo psicológico a un precio
   *
   * @param {number} price - Precio a redondear
   * @param {string} strategy - Estrategia de redondeo
   * @returns {number} Precio redondeado
   */
  const applyPsychologicalRounding = useCallback((price, strategy = 'none') => {
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
  }, []);

  /**
   * Calcula precio con redondeo psicológico incluido
   *
   * @param {number} costPrice - Precio de costo
   * @param {Object} strategy - Estrategia de pricing (incluye redondeo)
   * @param {number} manualPrice - Precio manual (opcional)
   * @returns {number} Precio final con redondeo aplicado
   */
  const calculatePriceWithRounding = useCallback((costPrice, strategy, manualPrice) => {
    const basePrice = calculatePrice(costPrice, strategy, manualPrice);

    if (strategy?.psychologicalRounding && strategy.psychologicalRounding !== 'none') {
      return applyPsychologicalRounding(basePrice, strategy.psychologicalRounding);
    }

    return basePrice;
  }, [calculatePrice, applyPsychologicalRounding]);

  return {
    calculatePrice,
    calculateMarkupPrice,
    calculateMarginPrice,
    calculateProfitMetrics,
    validatePricingStrategy,
    applyPsychologicalRounding,
    calculatePriceWithRounding,
  };
}

/**
 * Hook para manejar el estado de una estrategia de pricing
 * Incluye validación automática y cálculo de precio
 *
 * @param {Object} initialStrategy - Estrategia inicial
 * @param {number} costPrice - Precio de costo actual
 * @param {number} manualPrice - Precio manual actual
 * @returns {Object} Estado y funciones de la estrategia
 */
export function usePricingStrategy(initialStrategy, costPrice, manualPrice) {
  const { calculatePriceWithRounding, calculateProfitMetrics, validatePricingStrategy } = usePricingCalculator();

  // Calcular precio automáticamente cuando cambian los inputs (incluye redondeo psicológico)
  const calculatedPrice = useMemo(() => {
    return calculatePriceWithRounding(costPrice, initialStrategy, manualPrice);
  }, [costPrice, initialStrategy, manualPrice, calculatePriceWithRounding]);

  // Calcular métricas de rentabilidad
  const metrics = useMemo(() => {
    return calculateProfitMetrics(costPrice, calculatedPrice);
  }, [costPrice, calculatedPrice, calculateProfitMetrics]);

  // Validar estrategia
  const validation = useMemo(() => {
    return validatePricingStrategy(initialStrategy);
  }, [initialStrategy, validatePricingStrategy]);

  return {
    calculatedPrice,
    metrics,
    validation,
    isValid: validation.valid,
    error: validation.error,
  };
}
