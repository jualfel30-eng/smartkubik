import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsMongoId,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class GradeScaleDto {
  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsNumber()
  passing?: number;
}

export class CreateSubjectDto {
  @IsMongoId()
  @IsNotEmpty()
  classroomId: string;

  @IsMongoId()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  periodsPerWeek?: number;

  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GradeScaleDto)
  gradeScale?: GradeScaleDto;
}
