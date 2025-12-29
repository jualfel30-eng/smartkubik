import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  PlaybookTriggerType,
  PlaybookStepType,
} from "../schemas/playbook.schema";

export class PlaybookStepDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: PlaybookStepType })
  @IsEnum(PlaybookStepType)
  type: PlaybookStepType;

  @ApiProperty()
  @IsNumber()
  order: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  delayMinutes?: number;

  // Para TASK
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taskTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taskDescription?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taskDueDays?: number;

  // Para EMAIL/WHATSAPP
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messageTemplateId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messageSubject?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messageBody?: string;

  // Para WAIT
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  waitMinutes?: number;

  // Para NOTIFICATION
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notificationTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notificationMessage?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreatePlaybookDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: PlaybookTriggerType })
  @IsEnum(PlaybookTriggerType)
  triggerType: PlaybookTriggerType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  triggerStage?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  triggerSource?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  triggerPipeline?: string;

  @ApiProperty({ type: [PlaybookStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaybookStepDto)
  steps: PlaybookStepDto[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdatePlaybookDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  triggerStage?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  triggerSource?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  triggerPipeline?: string;

  @ApiProperty({ type: [PlaybookStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaybookStepDto)
  @IsOptional()
  steps?: PlaybookStepDto[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class ExecutePlaybookDto {
  @ApiProperty()
  @IsString()
  opportunityId: string;
}
