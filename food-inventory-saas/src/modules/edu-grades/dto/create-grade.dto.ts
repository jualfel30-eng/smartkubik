import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsMongoId,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateGradeDto {
  @IsMongoId()
  @IsNotEmpty()
  studentId: string;

  @IsMongoId()
  @IsNotEmpty()
  subjectId: string;

  @IsMongoId()
  @IsNotEmpty()
  classroomId: string;

  @IsMongoId()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  period: string;

  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsNumber()
  @Type(() => Number)
  score: number;

  @IsNumber()
  @Type(() => Number)
  maxScore: number;

  @IsBoolean()
  isPassing: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
