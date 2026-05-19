import {
  IsString,
  IsOptional,
  IsNumber,
  IsMongoId,
  Min,
  Max,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateScheduleDto {
  @IsOptional()
  @IsMongoId()
  classroomId?: string;

  @IsOptional()
  @IsMongoId()
  subjectId?: string;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}
