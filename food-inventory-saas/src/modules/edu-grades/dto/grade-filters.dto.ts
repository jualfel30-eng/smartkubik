import { IsOptional, IsString, IsNumber, IsMongoId, IsBoolean } from "class-validator";
import { Type, Transform } from "class-transformer";

export class GradeFiltersDto {
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
  @IsString()
  period?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
