/**
 * Unit Type category enumeration
 */
export enum UnitCategory {
  WEIGHT = "weight",
  VOLUME = "volume",
  LENGTH = "length",
  UNIT = "unit",
  TIME = "time",
  AREA = "area",
  TEMPERATURE = "temperature",
  OTHER = "other",
}

/**
 * Base unit information
 */
export interface BaseUnit {
  name: string;
  abbreviation: string;
}

/**
 * Unit conversion rule
 */
export interface UnitConversionRule {
  unit: string;
  abbreviation: string;
  pluralName?: string;
  factor: number;
  isBase: boolean;
  symbol?: string;
}

/**
 * Custom conversion rule for products
 */
export interface CustomConversionRule {
  unit: string;
  abbreviation: string;
  factor: number;
  context: "purchase" | "stock" | "consumption";
}

/**
 * UnitType main interface
 */
export interface UnitType {
  _id: string;
  name: string;
  category: UnitCategory;
  description?: string;
  baseUnit: BaseUnit;
  conversions: UnitConversionRule[];
  isSystemDefined: boolean;
  tenantId?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * DTO for creating UnitType
 */
export interface CreateUnitTypeDto {
  name: string;
  category: UnitCategory;
  description?: string;
  baseUnit: BaseUnit;
  conversions: Omit<UnitConversionRule, "isBase">[];
  metadata?: Record<string, any>;
}

/**
 * DTO for updating UnitType
 */
export interface UpdateUnitTypeDto {
  name?: string;
  category?: UnitCategory;
  description?: string;
  baseUnit?: BaseUnit;
  conversions?: UnitConversionRule[];
  isActive?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Query parameters for listing UnitTypes
 */
export interface UnitTypeQueryParams {
  category?: UnitCategory;
  isSystemDefined?: boolean;
  tenantId?: string;
  isActive?: boolean;
  search?: string;
}

/**
 * DTO for unit conversion
 */
export interface ConvertUnitsDto {
  unitTypeId: string;
  quantity: number;
  fromUnit: string;
  toUnit: string;
}

/**
 * Response from unit conversion
 */
export interface ConvertUnitsResponse {
  original: {
    quantity: number;
    unit: string;
  };
  converted: {
    quantity: number;
    unit: string;
  };
  factor: number;
  unitTypeName: string;
}

/**
 * UnitType integration fields for products
 */
export interface UnitTypeIntegration {
  unitTypeId?: string;
  defaultUnit?: string;
  purchaseUnit?: string;
  stockUnit?: string;
  consumptionUnit?: string;
  customConversions?: CustomConversionRule[];
}

/**
 * Category labels for UI
 */
export const UNIT_CATEGORY_LABELS: Record<UnitCategory, string> = {
  [UnitCategory.WEIGHT]: "Peso",
  [UnitCategory.VOLUME]: "Volumen",
  [UnitCategory.LENGTH]: "Longitud",
  [UnitCategory.UNIT]: "Unidades",
  [UnitCategory.TIME]: "Tiempo",
  [UnitCategory.AREA]: "Área",
  [UnitCategory.TEMPERATURE]: "Temperatura",
  [UnitCategory.OTHER]: "Otro",
};

/**
 * Context labels for custom conversions
 */
export const CONVERSION_CONTEXT_LABELS = {
  purchase: "Compra",
  stock: "Almacenamiento",
  consumption: "Consumo",
};
