import {
  IsString,
  IsOptional,
  IsNumber,
  IsMongoId,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateGradeDto {
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @IsOptional()
  @IsMongoId()
  subjectId?: string;

  @IsOptional()
  @IsMongoId()
  classroomId?: string;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  score?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxScore?: number;

  @IsOptional()
  @IsBoolean()
  isPassing?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
