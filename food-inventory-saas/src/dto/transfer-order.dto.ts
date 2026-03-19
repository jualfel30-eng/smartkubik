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
  @IsEnum(["push", "pull"])
  type?: string;

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

// --- Create Transfer Request (PULL flow - destino solicita) ---

export class CreateTransferRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  sourceWarehouseId: string;

  @IsOptional()
  @IsMongoId()
  sourceTenantId?: string; // Required for cross-tenant requests

  @IsMongoId()
  @IsNotEmpty()
  destinationWarehouseId: string;

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

  @IsOptional()
  @IsString()
  priority?: string; // low, medium, high, urgent

  @IsOptional()
  @IsDateString()
  requestedDeliveryDate?: string;
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

// --- Approve Request (PULL flow - origen aprueba solicitud) ---

export class ApproveRequestDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproveItemDto)
  items?: ApproveItemDto[];

  @IsOptional()
  @IsString()
  approvalNotes?: string;
}

// --- Reject Request (PULL flow - origen rechaza solicitud) ---

export class RejectRequestDto {
  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  approvalNotes?: string;
}

// --- Prepare (marca como en preparación) ---

export class PrepareTransferOrderDto {
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
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsDateString()
  estimatedArrival?: string;

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
  receiptNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// --- Report Discrepancy ---

class DiscrepancyItemDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsNumber()
  @Min(0)
  expectedQuantity: number;

  @IsNumber()
  @Min(0)
  receivedQuantity: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class ReportDiscrepancyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscrepancyItemDto)
  discrepancies: DiscrepancyItemDto[];

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
  @IsEnum(["push", "pull"])
  type?: string;

  @IsOptional()
  @IsEnum([
    "draft",
    "push_requested",
    "push_approved",
    "pull_requested",
    "pull_approved",
    "pull_rejected",
    "in_preparation",
    "in_transit",
    "delivered",
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
