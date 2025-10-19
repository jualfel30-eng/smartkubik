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
}
