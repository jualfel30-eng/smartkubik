import {
  IsObject,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from "class-validator";

export class UpdateColumnMappingDto {
  @IsObject({ message: "El mapeo de columnas debe ser un objeto" })
  columnMapping: Record<string, string>;

  @IsOptional()
  @IsBoolean({ message: "updateExisting debe ser verdadero o falso" })
  updateExisting?: boolean;

  @IsOptional()
  @IsBoolean({ message: "skipErrors debe ser verdadero o falso" })
  skipErrors?: boolean;

  @IsOptional()
  @IsNumber({}, { message: "batchSize debe ser un número" })
  @Min(10, { message: "El tamaño de lote mínimo es 10" })
  @Max(500, { message: "El tamaño de lote máximo es 500" })
  batchSize?: number;
}
