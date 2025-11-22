import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class AutoImportLocalizationDto {
  @ApiPropertyOptional({
    description: "Contenido del archivo (JSON o CSV en texto)",
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: "Formato del archivo",
    enum: ["json", "csv"],
    default: "json",
  })
  @IsString()
  @IsIn(["json", "csv"])
  format: "json" | "csv" = "json";

  @ApiPropertyOptional({ description: "Etiqueta opcional de la versión" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ description: "Versión sugerida" })
  @IsOptional()
  version?: number;

  @ApiPropertyOptional({ description: "Fecha de vigencia (YYYY-MM-DD)" })
  @IsOptional()
  @IsString()
  validFrom?: string;

  @ApiPropertyOptional({ description: "País (por defecto VE)" })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  country?: string;

  @ApiPropertyOptional({ description: "Nombre de archivo fuente" })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: "Activar inmediatamente" })
  @IsOptional()
  @IsBoolean()
  autoActivate?: boolean;

  @ApiPropertyOptional({
    description:
      "Marcar para aprobación automática vía cron (si no se activa de inmediato)",
  })
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;
}
