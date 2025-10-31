import {
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class ResourceAssignmentDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalResourceIds?: string[];
}

export class PackageAvailabilityDto {
  @IsISO8601()
  startTime: string;

  @IsOptional()
  @IsNumber()
  occupancyRate?: number;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceAssignmentDto)
  resourceAssignments?: ResourceAssignmentDto[];

  @IsOptional()
  @IsString()
  customerId?: string;
}
