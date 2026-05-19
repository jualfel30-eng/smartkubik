import { IsOptional, IsString, IsNumber } from "class-validator";
import { Type } from "class-transformer";

export class ClassroomFiltersDto {
  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
