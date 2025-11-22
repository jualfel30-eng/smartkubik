import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsObject,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import {
  WorkflowStatus,
  WorkflowStepType,
  WorkflowTriggerType,
  ConditionOperator,
} from "../schemas/marketing-workflow.schema";

export class WorkflowConditionDto {
  @IsString()
  field: string;

  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  value: any; // Can be string, number, array, etc.
}

export class WorkflowStepDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsEnum(WorkflowStepType)
  type: WorkflowStepType;

  @IsNumber()
  order: number;

  // Communication steps
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];

  // Wait steps
  @IsOptional()
  @IsNumber()
  @Min(0)
  waitDuration?: number;

  @IsOptional()
  @IsString()
  waitUntilDate?: string;

  // Condition steps
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowConditionDto)
  condition?: WorkflowConditionDto;

  @IsOptional()
  @IsString()
  trueStepId?: string;

  @IsOptional()
  @IsString()
  falseStepId?: string;

  // Tag/Segment steps
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  segmentId?: string;

  // Webhook steps
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsObject()
  webhookPayload?: Record<string, any>;

  // General
  @IsOptional()
  @IsString()
  nextStepId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class WorkflowTriggerConfigDto {
  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  segmentId?: string;

  @IsOptional()
  @IsString()
  actionType?: string;

  @IsOptional()
  @IsString()
  scheduleId?: string;
}

export class WorkflowEntryCriteriaDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  segmentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerTiers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minTotalSpent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTotalSpent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minTotalOrders?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTotalOrders?: number;
}

export class WorkflowExitConditionsDto {
  @IsOptional()
  @IsString()
  customerPerformsAction?: string;

  @IsOptional()
  @IsString()
  customerAddedToSegment?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDurationHours?: number;
}

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(WorkflowTriggerType)
  triggerType: WorkflowTriggerType;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowTriggerConfigDto)
  triggerConfig?: WorkflowTriggerConfigDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @IsOptional()
  @IsString()
  firstStepId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowEntryCriteriaDto)
  entryCriteria?: WorkflowEntryCriteriaDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowExitConditionsDto)
  exitConditions?: WorkflowExitConditionsDto;

  @IsOptional()
  @IsBoolean()
  allowReEntry?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reEntryDelayHours?: number;
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowTriggerConfigDto)
  triggerConfig?: WorkflowTriggerConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps?: WorkflowStepDto[];

  @IsOptional()
  @IsString()
  firstStepId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowEntryCriteriaDto)
  entryCriteria?: WorkflowEntryCriteriaDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowExitConditionsDto)
  exitConditions?: WorkflowExitConditionsDto;

  @IsOptional()
  @IsBoolean()
  allowReEntry?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reEntryDelayHours?: number;
}

export class GetWorkflowsQueryDto {
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;
}

export class EnrollCustomerDto {
  @IsString()
  workflowId: string;

  @IsString()
  customerId: string;

  @IsOptional()
  @IsObject()
  contextData?: Record<string, any>;
}
