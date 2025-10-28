import { BadRequestException } from "@nestjs/common";
import Decimal from "decimal.js";
import { SellingUnit } from "../schemas/product.schema";

/**
 * Utilidades para conversión de unidades con precisión decimal
 * Siguiendo mejores prácticas para evitar errores de punto flotante
 */

// Configurar Decimal para 10 decimales de precisión
Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

export class UnitConversionUtil {
  private static readonly WEIGHT_CONVERSIONS: Record<string, { toKg: number }> =
    {
      kg: { toKg: 1 },
      kilogram: { toKg: 1 },
      kilograms: { toKg: 1 },
      kilogramo: { toKg: 1 },
      kilogramos: { toKg: 1 },
      kilo: { toKg: 1 },
      kilos: { toKg: 1 },
      g: { toKg: 1 / 1000 },
      gr: { toKg: 1 / 1000 },
      grs: { toKg: 1 / 1000 },
      gram: { toKg: 1 / 1000 },
      grams: { toKg: 1 / 1000 },
      gramo: { toKg: 1 / 1000 },
      gramos: { toKg: 1 / 1000 },
      lb: { toKg: 0.45359237 },
      lbs: { toKg: 0.45359237 },
      pound: { toKg: 0.45359237 },
      pounds: { toKg: 0.45359237 },
      libra: { toKg: 0.45359237 },
      libras: { toKg: 0.45359237 },
      oz: { toKg: 0.0283495231 },
      ounce: { toKg: 0.0283495231 },
      ounces: { toKg: 0.0283495231 },
      onza: { toKg: 0.0283495231 },
      onzas: { toKg: 0.0283495231 },
    };

  private static readonly UNIT_NORMALIZATION_MAP: Record<string, string> = {
    kg: "kg",
    kilogram: "kg",
    kilograms: "kg",
    kilogramo: "kg",
    kilogramos: "kg",
    kilo: "kg",
    kilos: "kg",
    g: "g",
    gr: "g",
    grs: "g",
    gram: "g",
    grams: "g",
    gramo: "g",
    gramos: "g",
    lb: "lb",
    lbs: "lb",
    pound: "lb",
    pounds: "lb",
    libra: "lb",
    libras: "lb",
    oz: "oz",
    ounce: "oz",
    ounces: "oz",
    onza: "oz",
    onzas: "oz",
  };

  private static readonly MEASUREMENT_REGEX =
    /(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*(kg|kilogram(?:os|as)?|kilo(?:s)?|g|grs?|gram(?:os?)?|lb|lbs|libra(?:s)?|oz|onza(?:s)?)/i;

  /**
   * Convierte una cantidad de una unidad de venta a la unidad base
   * @param quantity - Cantidad en la unidad de venta
   * @param sellingUnit - Unidad de venta seleccionada
   * @returns Cantidad en unidad base (con precisión decimal)
   */
  static convertToBaseUnit(quantity: number, sellingUnit: SellingUnit): number {
    const quantityDecimal = new Decimal(quantity);
    const factorDecimal = new Decimal(sellingUnit.conversionFactor);

    const result = quantityDecimal.times(factorDecimal);

    // Retornar con máximo 4 decimales para unidad base
    return result.toDecimalPlaces(4).toNumber();
  }

  /**
   * Convierte una cantidad entre unidades de peso soportadas (kg, g, lb, oz).
   * Si la unidad no está soportada, retorna null.
   */
  static convertWeight(
    quantity: number,
    fromUnit: string,
    toUnit: string,
  ): number | null {
    if (!fromUnit || !toUnit) {
      return null;
    }

    const normalizedFrom = this.normalizeWeightUnit(fromUnit);
    const normalizedTo = this.normalizeWeightUnit(toUnit);

    if (!normalizedFrom || !normalizedTo) {
      return null;
    }

    const from = this.WEIGHT_CONVERSIONS[normalizedFrom];
    const to = this.WEIGHT_CONVERSIONS[normalizedTo];

    if (!from || !to) {
      return null;
    }

    const quantityDecimal = new Decimal(quantity);
    const kgValue = quantityDecimal.times(from.toKg);
    const converted = kgValue.dividedBy(to.toKg);
    return converted.toDecimalPlaces(4).toNumber();
  }

  /**
   * Intenta inferir un factor de conversión cuando el producto no tiene sellingUnits configuradas.
   * Actualmente soporta unidades de peso comunes.
   */
  static inferConversionFactor(
    unitAbbreviation: string,
    baseUnit: string,
  ): number | null {
    if (!unitAbbreviation || !baseUnit) {
      return null;
    }

    const converted = this.convertWeight(1, unitAbbreviation, baseUnit);
    if (converted === null) {
      return null;
    }

    return converted;
  }

  /**
   * Calcula el precio total con precisión decimal
   * @param quantity - Cantidad
   * @param pricePerUnit - Precio por unidad
   * @returns Precio total con 2 decimales
   */
  static calculateTotalPrice(quantity: number, pricePerUnit: number): number {
    const quantityDecimal = new Decimal(quantity);
    const priceDecimal = new Decimal(pricePerUnit);

    const result = quantityDecimal.times(priceDecimal);

    // Siempre 2 decimales para dinero
    return result.toDecimalPlaces(2).toNumber();
  }

  /**
   * Valida que una unidad de venta esté activa y sea válida
   * @param abbreviation - Abreviación de la unidad
   * @param sellingUnits - Array de unidades de venta del producto
   * @returns La unidad de venta si es válida
   * @throws BadRequestException si la unidad no es válida
   */
  static validateSellingUnit(
    abbreviation: string,
    sellingUnits: SellingUnit[],
  ): SellingUnit {
    const unit = sellingUnits.find(
      (u) => u.abbreviation === abbreviation && u.isActive,
    );

    if (!unit) {
      throw new BadRequestException(
        `Unidad de venta "${abbreviation}" no es válida o no está activa`,
      );
    }

    return unit;
  }

  /**
   * Valida que la cantidad cumpla con el mínimo requerido
   * @param quantity - Cantidad a validar
   * @param sellingUnit - Unidad de venta
   * @throws BadRequestException si no cumple el mínimo
   */
  static validateMinimumQuantity(
    quantity: number,
    sellingUnit: SellingUnit,
  ): void {
    if (sellingUnit.minimumQuantity && quantity < sellingUnit.minimumQuantity) {
      throw new BadRequestException(
        `Cantidad mínima para ${sellingUnit.name}: ${sellingUnit.minimumQuantity} ${sellingUnit.abbreviation}`,
      );
    }
  }

  /**
   * Valida que la cantidad sea múltiplo del paso de incremento
   * @param quantity - Cantidad a validar
   * @param sellingUnit - Unidad de venta
   * @throws BadRequestException si no es múltiplo válido
   */
  static validateIncrementStep(
    quantity: number,
    sellingUnit: SellingUnit,
  ): void {
    if (!sellingUnit.incrementStep) {
      return; // No hay restricción de incremento
    }

    const quantityDecimal = new Decimal(quantity);
    const stepDecimal = new Decimal(sellingUnit.incrementStep);

    const remainder = quantityDecimal.modulo(stepDecimal);

    if (!remainder.isZero()) {
      throw new BadRequestException(
        `La cantidad debe ser múltiplo de ${sellingUnit.incrementStep} ${sellingUnit.abbreviation}`,
      );
    }
  }

  /**
   * Validación completa de una cantidad y unidad
   * @param quantity - Cantidad a validar
   * @param unitAbbreviation - Abreviación de la unidad
   * @param sellingUnits - Array de unidades de venta del producto
   * @returns La unidad de venta validada
   */
  static validateQuantityAndUnit(
    quantity: number,
    unitAbbreviation: string,
    sellingUnits: SellingUnit[],
  ): SellingUnit {
    // 1. Validar que la unidad existe y está activa
    const sellingUnit = this.validateSellingUnit(
      unitAbbreviation,
      sellingUnits,
    );

    // 2. Validar cantidad mínima
    this.validateMinimumQuantity(quantity, sellingUnit);

    // 3. Validar incrementos
    this.validateIncrementStep(quantity, sellingUnit);

    return sellingUnit;
  }

  /**
   * Obtiene la unidad de venta por defecto
   * @param sellingUnits - Array de unidades de venta
   * @param customerType - Tipo de cliente (opcional)
   * @returns La unidad por defecto o la primera activa
   */
  static getDefaultUnit(
    sellingUnits: SellingUnit[],
    customerType?: "retail" | "wholesale",
  ): SellingUnit | null {
    if (!sellingUnits || sellingUnits.length === 0) {
      return null;
    }

    // Buscar unidad marcada como default
    const defaultUnit = sellingUnits.find((u) => u.isDefault && u.isActive);
    if (defaultUnit) {
      return defaultUnit;
    }

    // Retornar primera unidad activa
    return sellingUnits.find((u) => u.isActive) || null;
  }

  /**
   * Formatea una cantidad con su unidad para display
   * @param quantity - Cantidad
   * @param unitAbbreviation - Abreviación de la unidad
   * @param decimals - Número de decimales (default: 2)
   * @returns String formateado
   */
  static formatQuantity(
    quantity: number,
    unitAbbreviation: string,
    decimals: number = 2,
  ): string {
    const quantityDecimal = new Decimal(quantity);
    const formatted = quantityDecimal.toDecimalPlaces(decimals).toString();
    return `${formatted} ${unitAbbreviation}`;
  }

  /**
   * Calcula el equivalente en unidad base y lo formatea
   * @param quantity - Cantidad en unidad de venta
   * @param sellingUnit - Unidad de venta
   * @param baseUnit - Nombre de la unidad base
   * @returns String con equivalencia
   */
  static formatEquivalence(
    quantity: number,
    sellingUnit: SellingUnit,
    baseUnit: string,
  ): string {
    const baseQuantity = this.convertToBaseUnit(quantity, sellingUnit);
    return `${quantity} ${sellingUnit.abbreviation} = ${baseQuantity} ${baseUnit}`;
  }

  /**
   * Extrae una medida (cantidad + unidad) de un texto libre.
   * Retorna el texto sin la medida para búsquedas y los datos de cantidad detectados.
   */
  static extractMeasurement(
    input: string,
  ): {
    normalizedText: string;
    quantity?: number;
    unit?: string;
    normalizedUnit?: string;
    rawMatch?: string;
  } {
    if (!input) {
      return {
        normalizedText: "",
      };
    }

    const match = this.MEASUREMENT_REGEX.exec(input);
    if (!match) {
      return {
        normalizedText: input.trim(),
      };
    }

    const rawQuantity = match[1]?.trim();
    const rawUnit = match[2]?.trim();
    const normalizedUnit = this.normalizeWeightUnit(rawUnit || "");

    const quantity = rawQuantity
      ? this.parseQuantityValue(rawQuantity)
      : undefined;

    const normalizedText = `${input.slice(0, match.index)} ${input.slice(
      (match.index || 0) + match[0].length,
    )}`
      .replace(/\s+/g, " ")
      .trim();

    return {
      normalizedText,
      quantity: quantity !== undefined && !Number.isNaN(quantity) ? quantity : undefined,
      unit: rawUnit,
      normalizedUnit: normalizedUnit || undefined,
      rawMatch: match[0]?.trim(),
    };
  }

  /**
   * Normaliza una unidad de peso a su forma canónica (kg, g, lb u oz).
   */
  static normalizeWeightUnit(unit: string | undefined | null): string | null {
    if (!unit) {
      return null;
    }

    const sanitized = unit
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, "")
      .trim();

    return this.UNIT_NORMALIZATION_MAP[sanitized] || null;
  }

  /**
   * Convierte valores en formato fraccional o con coma decimal a número.
   */
  private static parseQuantityValue(raw: string): number {
    const cleaned = raw.replace(/\s+/g, "");
    if (cleaned.includes("/")) {
      const [numerator, denominator] = cleaned.split("/");
      const num = Number(numerator?.replace(",", "."));
      const den = Number(denominator?.replace(",", "."));
      if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
        return new Decimal(num).dividedBy(den).toNumber();
      }
      return Number.NaN;
    }

    return Number(cleaned.replace(",", "."));
  }
}
