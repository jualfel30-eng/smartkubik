import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateOpportunityStageDto {
  @ApiProperty({ description: "Nombre de la etapa" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Probabilidad (%)", default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({ description: "Orden de la etapa", default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ description: "Campos obligatorios" })
  @IsOptional()
  @IsArray()
  requiredFields?: string[];

  @ApiPropertyOptional({ description: "Es etapa default" })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateOpportunityStageDto {
  @ApiPropertyOptional({ description: "Nombre de la etapa" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Probabilidad (%)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({ description: "Orden de la etapa" })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ description: "Campos obligatorios" })
  @IsOptional()
  @IsArray()
  requiredFields?: string[];

  @ApiPropertyOptional({ description: "Es etapa default" })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
