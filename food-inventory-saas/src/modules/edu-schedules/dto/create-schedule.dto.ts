import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsMongoId,
  Min,
  Max,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateScheduleDto {
  @IsMongoId()
  @IsNotEmpty()
  classroomId: string;

  @IsMongoId()
  @IsNotEmpty()
  subjectId: string;

  @IsMongoId()
  @IsNotEmpty()
  teacherId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  dayOfWeek: number;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}
