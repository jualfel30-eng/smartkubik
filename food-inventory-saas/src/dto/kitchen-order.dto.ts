import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  IsMongoId,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO para crear una orden de cocina desde una Order
 */
export class CreateKitchenOrderDto {
  @IsMongoId()
  orderId: string;

  @IsOptional()
  @IsString()
  station?: string; // Estación específica: "grill", "fryer", etc.

  @IsOptional()
  @IsEnum(["normal", "urgent", "asap"])
  priority?: "normal" | "urgent" | "asap";

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedPrepTime?: number; // En minutos
}

/**
 * DTO para actualizar el estado de un item
 */
export class UpdateItemStatusDto {
  @IsMongoId()
  kitchenOrderId: string;

  @IsString()
  itemId: string; // ID del item dentro de la kitchen order

  @IsEnum(["pending", "preparing", "ready", "served"])
  status: "pending" | "preparing" | "ready" | "served";
}

/**
 * DTO para hacer "bump" (completar orden)
 */
export class BumpOrderDto {
  @IsMongoId()
  kitchenOrderId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para marcar orden como urgente
 */
export class MarkUrgentDto {
  @IsMongoId()
  kitchenOrderId: string;

  @IsBoolean()
  isUrgent: boolean;
}

/**
 * DTO para asignar a cocinero
 */
export class AssignCookDto {
  @IsMongoId()
  kitchenOrderId: string;

  @IsMongoId()
  cookId: string;
}

/**
 * DTO para filtrar órdenes en pantalla
 */
export class FilterKitchenOrdersDto {
  @IsOptional()
  @IsEnum(["new", "preparing", "ready", "completed", "cancelled"])
  status?: string;

  @IsOptional()
  @IsString()
  station?: string;

  @IsOptional()
  @IsEnum(["normal", "urgent", "asap"])
  priority?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isUrgent?: boolean;
}

/**
 * DTO para cancelar orden de cocina
 */
export class CancelKitchenOrderDto {
  @IsMongoId()
  kitchenOrderId: string;

  @IsString()
  reason: string;
}

/**
 * DTO para reabrir orden (si se bumpeó por error)
 */
export class ReopenKitchenOrderDto {
  @IsMongoId()
  kitchenOrderId: string;
}
