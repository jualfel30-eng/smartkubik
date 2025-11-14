import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from "class-validator";
import { Transform } from "class-transformer";

/**
 * DTO para crear un Work Center
 */
export class CreateWorkCenterDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(["machine", "labor", "both"])
  type: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  capacityFactor?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursPerDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7)
  workingDaysPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerHour?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  efficiencyPercentage?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  location?: string;
}

/**
 * DTO para actualizar un Work Center
 */
export class UpdateWorkCenterDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["machine", "labor", "both"])
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  capacityFactor?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursPerDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7)
  workingDaysPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerHour?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  efficiencyPercentage?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  location?: string;
}

/**
 * DTO para query de Work Centers
 */
export class WorkCenterQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(["machine", "labor", "both"])
  type?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isActive?: boolean;
}
