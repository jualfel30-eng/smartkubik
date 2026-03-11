import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { DUPLICATE_GROUP_STATUSES } from "@/schemas/duplicate-group.schema";
import { MATCH_TYPES } from "@/schemas/duplicate-group.schema";
import { MERGE_JOB_STATUSES } from "@/schemas/merge-job.schema";

export class DuplicateGroupsFilterDto {
  @IsOptional()
  @IsString()
  scanId?: string;

  @IsOptional()
  @IsEnum(DUPLICATE_GROUP_STATUSES)
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  minConfidence?: number;

  @IsOptional()
  @IsEnum(MATCH_TYPES)
  matchType?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class MergeJobsFilterDto {
  @IsOptional()
  @IsEnum(MERGE_JOB_STATUSES)
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
