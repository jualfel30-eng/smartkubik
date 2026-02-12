import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, Max } from "class-validator";
import { IMPORT_ENTITY_TYPES, ImportEntityType } from "../schemas/import-job.schema";

export class CreateImportJobDto {
  @IsEnum(IMPORT_ENTITY_TYPES, {
    message: `El tipo de entidad debe ser uno de: ${IMPORT_ENTITY_TYPES.join(", ")}`,
  })
  entityType: ImportEntityType;

  @IsOptional()
  @IsString({ message: "El preset de mapeo debe ser texto" })
  mappingPreset?: string;

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
