import {
  IsString,
  IsOptional,
  IsNumber,
  IsMongoId,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { GradeScaleDto } from "./create-subject.dto";

export class UpdateSubjectDto {
  @IsOptional()
  @IsMongoId()
  classroomId?: string;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  periodsPerWeek?: number;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GradeScaleDto)
  gradeScale?: GradeScaleDto;
}
