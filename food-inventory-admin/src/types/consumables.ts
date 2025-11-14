// Product Types
export enum ProductType {
  SIMPLE = "simple",
  CONSUMABLE = "consumable",
  SUPPLY = "supply",
}

// Consumable Config
export interface ConsumableConfig {
  _id: string;
  productId: string;
  consumableType: string;
  isReusable: boolean;
  isAutoDeducted: boolean;
  defaultQuantityPerUse: number;
  unitOfMeasure: string;
  notes?: string;
  isActive: boolean;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateConsumableConfigDto {
  productId: string;
  consumableType: string;
  isReusable?: boolean;
  isAutoDeducted?: boolean;
  defaultQuantityPerUse?: number;
  unitOfMeasure?: string;
  notes?: string;
}

export interface UpdateConsumableConfigDto {
  consumableType?: string;
  isReusable?: boolean;
  isAutoDeducted?: boolean;
  defaultQuantityPerUse?: number;
  unitOfMeasure?: string;
  notes?: string;
  isActive?: boolean;
}

// Product-Consumable Relation
export type ApplicableContext = "always" | "takeaway" | "dine_in" | "delivery";

export interface ProductConsumableRelation {
  _id: string;
  productId: string;
  consumableId: string;
  quantityRequired: number;
  isRequired: boolean;
  isAutoDeducted: boolean;
  priority: number;
  applicableContext: ApplicableContext;
  notes?: string;
  isActive: boolean;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductConsumableRelationDto {
  productId: string;
  consumableId: string;
  quantityRequired: number;
  isRequired?: boolean;
  isAutoDeducted?: boolean;
  applicableContext?: ApplicableContext;
  priority?: number;
  notes?: string;
}

export interface UpdateProductConsumableRelationDto {
  quantityRequired?: number;
  isRequired?: boolean;
  isAutoDeducted?: boolean;
  priority?: number;
  applicableContext?: ApplicableContext;
  notes?: string;
  isActive?: boolean;
}

// Supply Config
export interface SafetyInfo {
  requiresPPE: boolean;
  isHazardous: boolean;
  storageRequirements?: string;
  handlingInstructions?: string;
}

export interface SupplyConfig {
  _id: string;
  productId: string;
  supplyCategory: string;
  supplySubcategory: string;
  requiresTracking: boolean;
  requiresAuthorization: boolean;
  usageDepartment?: string;
  estimatedMonthlyConsumption?: number;
  unitOfMeasure: string;
  safetyInfo?: SafetyInfo;
  notes?: string;
  isActive: boolean;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplyConfigDto {
  productId: string;
  supplyCategory: string;
  supplySubcategory: string;
  requiresTracking?: boolean;
  requiresAuthorization?: boolean;
  usageDepartment?: string;
  estimatedMonthlyConsumption?: number;
  unitOfMeasure?: string;
  safetyInfo?: SafetyInfo;
  notes?: string;
}

export interface UpdateSupplyConfigDto {
  supplyCategory?: string;
  supplySubcategory?: string;
  requiresTracking?: boolean;
  requiresAuthorization?: boolean;
  usageDepartment?: string;
  estimatedMonthlyConsumption?: number;
  unitOfMeasure?: string;
  safetyInfo?: SafetyInfo;
  notes?: string;
  isActive?: boolean;
}

// Supply Consumption Log
export interface CostInfo {
  unitCost: number;
  totalCost: number;
  currency: string;
}

export type ConsumptionType = "manual" | "automatic" | "scheduled";

export interface SupplyConsumptionLog {
  _id: string;
  supplyId: string;
  quantityConsumed: number;
  unitOfMeasure: string;
  consumedAt: string;
  consumptionType: ConsumptionType;
  department?: string;
  consumedBy?: string;
  relatedOrderId?: string;
  reason?: string;
  notes?: string;
  costInfo?: CostInfo;
  tenantId: string;
  createdAt?: string;
}

export interface LogSupplyConsumptionDto {
  supplyId: string;
  quantityConsumed: number;
  unitOfMeasure: string;
  consumptionType: ConsumptionType;
  department?: string;
  consumedBy?: string;
  relatedOrderId?: string;
  reason?: string;
  notes?: string;
  costInfo?: CostInfo;
}

// Consumable types
export const CONSUMABLE_TYPES = [
  { value: "container", label: "Contenedor" },
  { value: "packaging", label: "Empaque" },
  { value: "utensil", label: "Utensilio" },
  { value: "wrapper", label: "Envoltura" },
  { value: "bag", label: "Bolsa" },
  { value: "box", label: "Caja" },
  { value: "cup", label: "Vaso" },
  { value: "lid", label: "Tapa" },
  { value: "napkin", label: "Servilleta" },
  { value: "straw", label: "Sorbete" },
  { value: "other", label: "Otro" },
] as const;

// Supply categories
export const SUPPLY_CATEGORIES = [
  { value: "cleaning", label: "Limpieza" },
  { value: "office", label: "Oficina" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "safety", label: "Seguridad" },
  { value: "kitchen", label: "Cocina" },
  { value: "other", label: "Otro" },
] as const;

// Applicable contexts
export const APPLICABLE_CONTEXTS = [
  { value: "always", label: "Siempre" },
  { value: "takeaway", label: "Para llevar" },
  { value: "dine_in", label: "Comer aquí" },
  { value: "delivery", label: "Delivery" },
] as const;

// Consumption types for supplies
export const CONSUMPTION_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automático" },
  { value: "scheduled", label: "Programado" },
] as const;
