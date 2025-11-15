import {
  IsString,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  IsArray,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type, Transform } from "class-transformer";

/**
 * DTO para crear una Manufacturing Order
 */
export class CreateManufacturingOrderDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  productVariantId?: string;

  @IsNumber()
  @Min(0.001)
  quantityToProduce: number;

  @IsString()
  unit: string;

  @IsMongoId()
  productionVersionId: string;

  @IsOptional()
  @IsEnum(["normal", "urgent", "low"])
  priority?: string;

  @IsDateString()
  scheduledStartDate: string;

  @IsOptional()
  @IsDateString()
  scheduledEndDate?: string;

  @IsOptional()
  @IsMongoId()
  sourceOrderId?: string;

  @IsOptional()
  @IsString()
  sourceReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para actualizar una Manufacturing Order
 */
export class UpdateManufacturingOrderDto {
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  quantityToProduce?: number;

  @IsOptional()
  @IsEnum(["normal", "urgent", "low"])
  priority?: string;

  @IsOptional()
  @IsDateString()
  scheduledStartDate?: string;

  @IsOptional()
  @IsDateString()
  scheduledEndDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para query de Manufacturing Orders
 */
export class ManufacturingOrderQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsOptional()
  @IsEnum(["draft", "confirmed", "in_progress", "completed", "cancelled"])
  status?: string;

  @IsOptional()
  @IsEnum(["normal", "urgent", "low"])
  priority?: string;
}

/**
 * DTO para consumir un componente
 */
export class ConsumeComponentDto {
  @IsMongoId()
  componentId: string; // _id del componente en el array

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsMongoId()
  inventoryId?: string;
}

/**
 * DTO para completar una operación
 */
export class CompleteOperationDto {
  @IsMongoId()
  operationId: string; // _id de la operación en el array

  @IsNumber()
  @Min(0)
  actualSetupTime: number;

  @IsNumber()
  @Min(0)
  actualCycleTime: number;

  @IsNumber()
  @Min(0)
  actualTeardownTime: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para confirmar una Manufacturing Order
 */
export class ConfirmManufacturingOrderDto {
  @IsOptional()
  @IsBoolean()
  reserveMaterials?: boolean = true;
}

/**
 * DTO para verificar disponibilidad de materiales
 */
export class CheckMaterialsDto {
  @IsMongoId()
  bomId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  unit: string;
}

/**
 * DTO para estimar costos de producción
 */
export class EstimateCostDto {
  @IsMongoId()
  bomId: string;

  @IsOptional()
  @IsMongoId()
  routingId?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  unit: string;
}
