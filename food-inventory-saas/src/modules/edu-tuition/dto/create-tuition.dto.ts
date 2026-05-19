import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsMongoId,
  IsIn,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateTuitionDto {
  @IsMongoId()
  @IsNotEmpty()
  studentId: string;

  @IsMongoId()
  @IsNotEmpty()
  classroomId: string;

  @IsString()
  @IsIn(["enrollment", "monthly", "special"])
  type: string;

  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsDateString()
  dueDate: string;
}
