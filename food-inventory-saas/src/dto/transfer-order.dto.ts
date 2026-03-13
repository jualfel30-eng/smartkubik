import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

// --- Item DTOs ---

class TransferOrderItemDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsString()
  productSku?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsOptional()
  @IsString()
  variantSku?: string;

  @IsNumber()
  @Min(0.0001)
  requestedQuantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;
}

// --- Create ---

export class CreateTransferOrderDto {
  @IsOptional()
  @IsMongoId()
  sourceLocationId?: string;

  @IsMongoId()
  @IsNotEmpty()
  sourceWarehouseId: string;

  @IsOptional()
  @IsMongoId()
  destinationLocationId?: string;

  @IsMongoId()
  @IsNotEmpty()
  destinationWarehouseId: string;

  @IsOptional()
  @IsMongoId()
  destinationTenantId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferOrderItemDto)
  items: TransferOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

// --- Update (only drafts) ---

export class UpdateTransferOrderDto {
  @IsOptional()
  @IsMongoId()
  sourceLocationId?: string;

  @IsOptional()
  @IsMongoId()
  sourceWarehouseId?: string;

  @IsOptional()
  @IsMongoId()
  destinationLocationId?: string;

  @IsOptional()
  @IsMongoId()
  destinationWarehouseId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferOrderItemDto)
  items?: TransferOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

// --- Approve ---

class ApproveItemDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsNumber()
  @Min(0)
  approvedQuantity: number;
}

export class ApproveTransferOrderDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproveItemDto)
  items?: ApproveItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

// --- Ship ---

class ShipItemDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippedQuantity?: number;
}

export class ShipTransferOrderDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipItemDto)
  items?: ShipItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

// --- Receive ---

class ReceiveItemDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsNumber()
  @Min(0)
  receivedQuantity: number;
}

export class ReceiveTransferOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

// --- Cancel ---

export class CancelTransferOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

// --- Filter ---

export class TransferOrderFilterDto {
  @IsOptional()
  @IsEnum([
    "draft",
    "requested",
    "approved",
    "in_transit",
    "received",
    "partially_received",
    "cancelled",
  ])
  status?: string;

  @IsOptional()
  @IsMongoId()
  sourceLocationId?: string;

  @IsOptional()
  @IsMongoId()
  destinationLocationId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;
}
