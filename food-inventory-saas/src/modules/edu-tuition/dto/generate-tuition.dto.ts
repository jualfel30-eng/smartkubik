import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class GenerateTuitionDto {
  @ApiProperty({ example: "2025-2026" })
  @IsString()
  academicYear: string;

  @ApiProperty({ example: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  months: number[];

  @ApiProperty({ example: 500, description: "Monto de la cuota mensual" })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: "USD", required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 5, required: false, description: "Día de vencimiento dentro del mes (1-28)" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  dueDay?: number;

  @ApiProperty({ required: false, description: "Limitar la generación a un salón específico" })
  @IsOptional()
  @IsString()
  classroomId?: string;
}
