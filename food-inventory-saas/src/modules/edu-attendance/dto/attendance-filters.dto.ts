import { IsOptional, IsString, IsNumber, IsMongoId } from "class-validator";
import { Type } from "class-transformer";

export class AttendanceFiltersDto {
  @IsOptional()
  @IsMongoId()
  classroomId?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
