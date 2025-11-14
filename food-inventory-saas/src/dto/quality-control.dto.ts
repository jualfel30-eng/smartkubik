import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
  IsDate,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";

/**
 * DTO para QC Checkpoint
 */
export class QCCheckpointDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(["measurement", "visual", "binary", "text"])
  testType: string;

  @IsOptional()
  @IsString()
  testMethod?: string;

  @IsOptional()
  @IsString()
  expectedValue?: string;

  @IsOptional()
  @IsNumber()
  minimumValue?: number;

  @IsOptional()
  @IsNumber()
  maximumValue?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsEnum(["minor", "major", "critical"])
  severity?: string;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @IsOptional()
  @IsNumber()
  sequence?: number;
}

/**
 * DTO para Sampling Plan
 */
export class SamplingPlanDto {
  @IsEnum(["random", "systematic", "judgmental"])
  method: string;

  @IsNumber()
  @Min(1)
  sampleSize: number;

  @IsNumber()
  @Min(0)
  acceptanceLevel: number;

  @IsString()
  frequency: string;
}

/**
 * DTO para crear un QC Plan
 */
export class CreateQCPlanDto {
  @IsString()
  planCode: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(["receiving", "in_process", "final_inspection"], { each: true })
  inspectionStages?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QCCheckpointDto)
  checkpoints: QCCheckpointDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SamplingPlanDto)
  samplingPlan?: SamplingPlanDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredEquipment?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDurationMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO para actualizar un QC Plan
 */
export class UpdateQCPlanDto {
  @IsOptional()
  @IsString()
  planCode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(["receiving", "in_process", "final_inspection"], { each: true })
  inspectionStages?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QCCheckpointDto)
  checkpoints?: QCCheckpointDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SamplingPlanDto)
  samplingPlan?: SamplingPlanDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredEquipment?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDurationMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO para query de QC Plans
 */
export class QCPlanQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsEnum(["receiving", "in_process", "final_inspection"])
  inspectionStage?: string;
}

/**
 * DTO para crear una Inspection
 */
export class CreateInspectionDto {
  @IsString()
  qcPlanId: string;

  @IsEnum(["receiving", "in_process", "final_inspection"])
  inspectionType: string;

  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  productSku?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  manufacturingOrderId?: string;

  @IsString()
  inspector: string;

  @IsOptional()
  @IsString()
  inspectorName?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  inspectionDate?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsString()
  generalNotes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO para Inspection Result
 */
export class InspectionResultDto {
  @IsString()
  checkpointId: string;

  @IsString()
  checkpointName: string;

  @IsOptional()
  @IsString()
  measuredValue?: string;

  @IsOptional()
  @IsNumber()
  numericValue?: number;

  @IsOptional()
  @IsString()
  expectedValue?: string;

  @IsBoolean()
  passed: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para registrar resultados de inspección
 */
export class RecordInspectionResultDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionResultDto)
  results: InspectionResultDto[];
}

/**
 * DTO para query de Inspections
 */
export class InspectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(["pending", "in_progress", "completed", "cancelled"])
  status?: string;

  @IsOptional()
  @IsEnum(["receiving", "in_process", "final_inspection"])
  inspectionType?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;
}

/**
 * DTO para crear una Non-Conformance
 */
export class CreateNonConformanceDto {
  @IsOptional()
  @IsString()
  inspectionId?: string;

  @IsEnum(["quality_defect", "process_deviation", "documentation", "other"])
  type: string;

  @IsEnum(["minor", "major", "critical"])
  severity: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  affectedQuantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsString()
  correctiveAction?: string;

  @IsOptional()
  @IsString()
  preventiveAction?: string;

  @IsOptional()
  @IsString()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  responsibleUserName?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO para actualizar una Non-Conformance
 */
export class UpdateNonConformanceDto {
  @IsOptional()
  @IsEnum(["quality_defect", "process_deviation", "documentation", "other"])
  type?: string;

  @IsOptional()
  @IsEnum(["minor", "major", "critical"])
  severity?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsString()
  correctiveAction?: string;

  @IsOptional()
  @IsString()
  preventiveAction?: string;

  @IsOptional()
  @IsString()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  responsibleUserName?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsEnum(["open", "in_progress", "verification", "closed", "cancelled"])
  status?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  closedDate?: Date;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsString()
  verifiedBy?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  verifiedDate?: Date;

  @IsOptional()
  @IsString()
  verificationNotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO para query de Non-Conformances
 */
export class NonConformanceQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(["open", "in_progress", "verification", "closed", "cancelled"])
  status?: string;

  @IsOptional()
  @IsEnum(["minor", "major", "critical"])
  severity?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}
