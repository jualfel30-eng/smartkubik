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
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO para una parte individual del split
 */
export class BillSplitPartDto {
  @IsString()
  personName: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tipAmount?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalAmount: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[]; // Para split by items
}

/**
 * DTO para crear un split de cuenta
 */
export class CreateBillSplitDto {
  @IsMongoId()
  orderId: string;

  @IsEnum(["by_person", "by_items", "custom"])
  splitType: "by_person" | "by_items" | "custom";

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  numberOfPeople: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BillSplitPartDto)
  parts: BillSplitPartDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para dividir cuenta equitativamente
 */
export class SplitEquallyDto {
  @IsMongoId()
  orderId: string;

  @IsNumber()
  @Min(2)
  @Type(() => Number)
  numberOfPeople: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tipPercentage?: number; // Porcentaje de propina a agregar

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  personNames?: string[]; // Nombres opcionales para cada persona
}

/**
 * DTO para dividir por items
 */
export class SplitByItemsDto {
  @IsMongoId()
  orderId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemAssignmentDto)
  assignments: ItemAssignmentDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tipPercentage?: number;
}

export class ItemAssignmentDto {
  @IsString()
  personName: string;

  @IsArray()
  @IsString({ each: true })
  itemIds: string[]; // IDs de OrderItems asignados a esta persona

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tipAmount?: number; // Propina específica de esta persona
}

/**
 * DTO para registrar un pago de una parte del split
 */
export class PaySplitPartDto {
  @IsMongoId()
  splitId: string;

  @IsString()
  personName: string; // Nombre de la persona que paga

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @IsString()
  paymentMethod: string; // cash, card, etc.

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  customerName?: string; // Nombre para el recibo
}

/**
 * DTO para actualizar el tip de una parte
 */
export class UpdateSplitPartTipDto {
  @IsMongoId()
  splitId: string;

  @IsString()
  personName: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tipAmount: number;
}
