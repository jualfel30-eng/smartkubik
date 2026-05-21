import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class PayTuitionDto {
  @ApiProperty({ example: 500, description: "Monto pagado" })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: "cash", description: "Método de pago: cash, transfer, card, check" })
  @IsString()
  method: string;

  @ApiProperty({ required: false, example: "REF-2025-001", description: "Referencia bancaria o número de recibo" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ required: false, description: "Notas adicionales sobre el pago" })
  @IsOptional()
  @IsString()
  notes?: string;
}
