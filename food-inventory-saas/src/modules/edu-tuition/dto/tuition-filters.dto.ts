import { IsOptional, IsString, IsNumber, IsMongoId } from "class-validator";
import { Type } from "class-transformer";

export class TuitionFiltersDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsMongoId()
  classroomId?: string;

  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
