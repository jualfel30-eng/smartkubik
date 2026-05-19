import { IsOptional, IsString, IsNumber, IsMongoId } from "class-validator";
import { Type } from "class-transformer";

export class SubjectFiltersDto {
  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsMongoId()
  classroomId?: string;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
