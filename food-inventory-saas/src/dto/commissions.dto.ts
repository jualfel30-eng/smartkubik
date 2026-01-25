import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsMongoId,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  ArrayMinSize,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

// ════════════════════════════════════════════════════════════════════════════
// COMMISSION PLAN DTOs
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tier de comisión para planes escalonados
 */
export class CommissionTierDto {
  @IsNumber()
  @Min(0)
  from: number;

  @IsNumber()
  to: number; // Usar Number.MAX_SAFE_INTEGER para "sin límite"

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

/**
 * Crear plan de comisión
 */
export class CreateCommissionPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(["percentage", "tiered", "fixed", "mixed"])
  type: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionTierDto)
  tiers?: CommissionTierDto[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];

  @IsOptional()
  @IsBoolean()
  calculateOnDiscountedAmount?: boolean;

  @IsOptional()
  @IsBoolean()
  includeTaxesInBase?: boolean;

  @IsOptional()
  @IsBoolean()
  includeShippingInBase?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCommissionAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

/**
 * Actualizar plan de comisión
 */
export class UpdateCommissionPlanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["percentage", "tiered", "fixed", "mixed"])
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionTierDto)
  tiers?: CommissionTierDto[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];

  @IsOptional()
  @IsBoolean()
  calculateOnDiscountedAmount?: boolean;

  @IsOptional()
  @IsBoolean()
  includeTaxesInBase?: boolean;

  @IsOptional()
  @IsBoolean()
  includeShippingInBase?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCommissionAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// EMPLOYEE COMMISSION CONFIG DTOs
// ════════════════════════════════════════════════════════════════════════════

/**
 * Override tier para configuración de empleado
 */
export class OverrideTierDto {
  @IsNumber()
  @Min(0)
  from: number;

  @IsNumber()
  to: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

/**
 * Asignar plan de comisión a empleado
 */
export class AssignCommissionPlanDto {
  @IsMongoId()
  commissionPlanId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  overridePercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overrideFixedAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverrideTierDto)
  overrideTiers?: OverrideTierDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  overrideMaxCommission?: number;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Actualizar configuración de comisión de empleado
 */
export class UpdateEmployeeCommissionConfigDto {
  @IsOptional()
  @IsMongoId()
  commissionPlanId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  overridePercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overrideFixedAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverrideTierDto)
  overrideTiers?: OverrideTierDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  overrideMaxCommission?: number;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// COMMISSION RECORD DTOs
// ════════════════════════════════════════════════════════════════════════════

/**
 * Filtros para listar registros de comisión
 */
export class CommissionRecordFilterDto {
  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(["pending", "approved", "rejected", "paid"])
  status?: string;

  @IsOptional()
  @IsMongoId()
  commissionPlanId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Aprobar comisión
 */
export class ApproveCommissionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Rechazar comisión
 */
export class RejectCommissionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Aprobar múltiples comisiones
 */
export class BulkApproveCommissionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  commissionRecordIds: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// SALES GOAL DTOs
// ════════════════════════════════════════════════════════════════════════════

/**
 * Bonus tier para metas
 */
export class BonusTierDto {
  @IsNumber()
  @Min(0)
  achievementPercentage: number;

  @IsNumber()
  @Min(0)
  bonusAmount: number;

  @IsOptional()
  @IsString()
  label?: string;
}

/**
 * Crear meta de ventas
 */
export class CreateSalesGoalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(["amount", "units", "orders", "margin"])
  targetType: string;

  @IsNumber()
  @Min(0)
  targetValue: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly", "custom"])
  periodType: string;

  @IsOptional()
  @IsDateString()
  customPeriodStart?: string;

  @IsOptional()
  @IsDateString()
  customPeriodEnd?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsEnum(["all", "role", "individual", "team"])
  applicableTo: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  employeeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  roleIds?: string[];

  @IsOptional()
  @IsMongoId()
  teamId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];

  @IsEnum(["fixed", "percentage", "tiered", "none"])
  bonusType: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  bonusPercentage?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BonusTierDto)
  bonusTiers?: BonusTierDto[];

  @IsOptional()
  @IsBoolean()
  bonusProRated?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minAchievementForBonus?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnAchievement?: boolean;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  progressMilestones?: number[];
}

/**
 * Actualizar meta de ventas
 */
export class UpdateSalesGoalDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["amount", "units", "orders", "margin"])
  targetType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetValue?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly", "custom"])
  periodType?: string;

  @IsOptional()
  @IsDateString()
  customPeriodStart?: string;

  @IsOptional()
  @IsDateString()
  customPeriodEnd?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsEnum(["all", "role", "individual", "team"])
  applicableTo?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  employeeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  roleIds?: string[];

  @IsOptional()
  @IsMongoId()
  teamId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];

  @IsOptional()
  @IsEnum(["fixed", "percentage", "tiered", "none"])
  bonusType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  bonusPercentage?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BonusTierDto)
  bonusTiers?: BonusTierDto[];

  @IsOptional()
  @IsBoolean()
  bonusProRated?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minAchievementForBonus?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnAchievement?: boolean;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  progressMilestones?: number[];
}

/**
 * Filtros para listar metas
 */
export class SalesGoalFilterDto {
  @IsOptional()
  @IsEnum(["amount", "units", "orders", "margin"])
  targetType?: string;

  @IsOptional()
  @IsEnum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly", "custom"])
  periodType?: string;

  @IsOptional()
  @IsEnum(["all", "role", "individual", "team"])
  applicableTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @IsOptional()
  @IsMongoId()
  roleId?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// GOAL PROGRESS DTOs
// ════════════════════════════════════════════════════════════════════════════

/**
 * Filtros para listar progreso de metas
 */
export class GoalProgressFilterDto {
  @IsOptional()
  @IsMongoId()
  goalId?: string;

  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsEnum([
    "in_progress",
    "achieved",
    "failed",
    "bonus_pending",
    "bonus_awarded",
    "bonus_paid",
  ])
  status?: string;

  @IsOptional()
  @IsBoolean()
  achieved?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// BONUS DTOs
// ════════════════════════════════════════════════════════════════════════════

/**
 * Crear bono manual
 */
export class CreateManualBonusDto {
  @IsMongoId()
  employeeId: string;

  @IsEnum([
    "goal_achievement",
    "special",
    "retention",
    "performance",
    "referral",
    "signing",
    "holiday",
    "profit_sharing",
    "other",
  ])
  type: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  periodLabel?: string;

  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;
}

/**
 * Filtros para listar bonos
 */
export class BonusFilterDto {
  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @IsOptional()
  @IsEnum([
    "goal_achievement",
    "special",
    "retention",
    "performance",
    "referral",
    "signing",
    "holiday",
    "profit_sharing",
    "other",
  ])
  type?: string;

  @IsOptional()
  @IsEnum(["pending", "approved", "rejected", "paid", "cancelled"])
  status?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Aprobar bono
 */
export class ApproveBonusDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Rechazar bono
 */
export class RejectBonusDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Cancelar bono
 */
export class CancelBonusDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

// ════════════════════════════════════════════════════════════════════════════
// RESPONSE INTERFACES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Respuesta de cálculo de comisión
 */
export interface CommissionCalculationResponse {
  orderId: string;
  orderNumber: string;
  orderAmount: number;
  commissionBaseAmount: number;
  employeeId: string;
  employeeName: string;
  commissionPlanId: string;
  commissionPlanName: string;
  commissionType: string;
  commissionPercentage: number;
  commissionAmount: number;
  tierApplied?: {
    from: number;
    to: number;
    percentage: number;
  };
  wasOverridden: boolean;
  wasCapped: boolean;
  /** Razón por la que se omitió la comisión (ej: below_minimum_amount) */
  skippedReason?: string;
}

/**
 * Respuesta de resumen de comisiones
 */
export interface CommissionsSummaryResponse {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalCommissions: number;
    totalPending: number;
    totalApproved: number;
    totalPaid: number;
    totalRejected: number;
    employeesWithCommissions: number;
    ordersWithCommissions: number;
    averageCommissionRate: number;
  };
  byEmployee: Array<{
    employeeId: string;
    employeeName: string;
    totalCommissions: number;
    ordersCount: number;
    averageCommission: number;
    status: {
      pending: number;
      approved: number;
      paid: number;
    };
  }>;
  byPlan: Array<{
    planId: string;
    planName: string;
    totalCommissions: number;
    employeesCount: number;
  }>;
}

/**
 * Respuesta de dashboard de metas
 */
export interface GoalsDashboardResponse {
  period: {
    current: string;
    start: Date;
    end: Date;
  };
  summary: {
    totalGoals: number;
    achievedGoals: number;
    inProgressGoals: number;
    failedGoals: number;
    achievementRate: number;
    totalBonusesAwarded: number;
  };
  topPerformers: Array<{
    employeeId: string;
    employeeName: string;
    goalsAchieved: number;
    totalBonus: number;
    averageAchievement: number;
  }>;
  goalProgress: Array<{
    goalId: string;
    goalName: string;
    targetValue: number;
    currentValue: number;
    percentageComplete: number;
    employeesInProgress: number;
    employeesAchieved: number;
  }>;
}

/**
 * Respuesta de bonos por empleado
 */
export interface EmployeeBonusSummaryResponse {
  employeeId: string;
  employeeName: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalBonuses: number;
    totalPending: number;
    totalApproved: number;
    totalPaid: number;
    byType: Record<string, number>;
  };
  bonuses: Array<{
    bonusId: string;
    type: string;
    amount: number;
    description: string;
    status: string;
    createdAt: Date;
    paidAt?: Date;
  }>;
}
