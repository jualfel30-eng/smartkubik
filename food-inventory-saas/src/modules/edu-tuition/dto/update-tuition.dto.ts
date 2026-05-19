import {
  IsString,
  IsOptional,
  IsNumber,
  IsMongoId,
  IsIn,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateTuitionDto {
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @IsOptional()
  @IsMongoId()
  classroomId?: string;

  @IsOptional()
  @IsString()
  @IsIn(["enrollment", "monthly", "special"])
  type?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(["pending", "paid", "overdue", "waived"])
  status?: string;

  @IsOptional()
  @IsMongoId()
  paymentId?: string;
}
