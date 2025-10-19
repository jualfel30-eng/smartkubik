import { IsOptional, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO para paginación estándar
 * Previene ataques DoS limitando la cantidad de registros que se pueden cargar
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: "Número de página (comienza en 1)",
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Cantidad de registros por página",
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // Límite máximo de seguridad
  limit?: number = 20;
}

/**
 * Interface para respuestas paginadas
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Clase auxiliar para construir respuestas paginadas
 */
export class PaginationHelper {
  /**
   * Calcula el offset para MongoDB skip()
   */
  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Calcula el número total de páginas
   */
  static getTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }

  /**
   * Crea un objeto de metadatos de paginación
   */
  static createPaginationMeta(
    page: number,
    limit: number,
    total: number,
  ): {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } {
    return {
      page,
      limit,
      total,
      totalPages: this.getTotalPages(total, limit),
    };
  }
}
