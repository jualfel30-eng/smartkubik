import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateAbsenceRequestDto {
  @ApiProperty({ description: "Empleado relacionado", type: String })
  @IsMongoId()
  employeeId: string;

  @ApiPropertyOptional({ description: "Nombre denormalizado del empleado" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  employeeName?: string;

  @ApiProperty({
    enum: ["vacation", "sick", "unpaid", "other"],
    default: "vacation",
  })
  @IsString()
  @IsIn(["vacation", "sick", "unpaid", "other"])
  leaveType: string;

  @ApiProperty({ description: "Fecha de inicio" })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: "Fecha de fin" })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: "Días solicitados" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalDays?: number;

  @ApiPropertyOptional({ description: "Motivo" })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}

export class UpdateAbsenceStatusDto {
  @ApiProperty({ enum: ["approved", "rejected"] })
  @IsString()
  @IsIn(["approved", "rejected"])
  status: "approved" | "rejected";

  @ApiPropertyOptional({ description: "Motivo de rechazo" })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  rejectionReason?: string;
}
