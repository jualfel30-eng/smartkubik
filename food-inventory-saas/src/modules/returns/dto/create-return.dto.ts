import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * Una línea a devolver: identifica la línea de la orden por su `_id` de
 * subdocumento y cuánta cantidad se devuelve (en la unidad de venta original).
 */
export class ReturnItemInputDto {
  @IsMongoId()
  orderItemId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

/**
 * Devolución con reembolso en efectivo.
 *
 * - Sin `items` → devolución TOTAL (todo lo que quede pendiente por devolver).
 * - Con `items` → devolución PARCIAL de las líneas y cantidades indicadas.
 *
 * `refundMethod`: `cash` (sale de la caja) o `store_credit` (acredita saldo a
 * favor del cliente). `original_method` llega en una fase posterior.
 */
export class CreateReturnDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsIn(["cash", "store_credit"])
  refundMethod?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemInputDto)
  items?: ReturnItemInputDto[];
}
