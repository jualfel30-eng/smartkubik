import {
    IsEnum,
    IsMongoId,
    IsOptional,
    IsString,
    IsDateString,
} from "class-validator";
import { MovementType } from "../../../dto/inventory-movement.dto";

/**
 * Supported export formats for inventory movement reports.
 */
export enum ReportFormat {
    PDF = "pdf",
    CSV = "csv",
}

/**
 * Quick date presets to avoid manual date range selection.
 * The backend resolves these to concrete dateFrom/dateTo values.
 */
export enum DatePreset {
    TODAY = "today",
    YESTERDAY = "yesterday",
    THIS_WEEK = "this_week",
    LAST_WEEK = "last_week",
    THIS_MONTH = "this_month",
    LAST_MONTH = "last_month",
    CUSTOM = "custom",
}

/**
 * DTO for exporting inventory movements as PDF or CSV.
 *
 * Purpose: Validates query parameters for the export endpoint.
 * Depends on: MovementType from inventory-movement.dto
 * Used by: InventoryMovementsController.exportMovements
 */
export class ExportInventoryMovementsDto {
    @IsEnum(ReportFormat)
    format: ReportFormat;

    @IsOptional()
    @IsEnum(DatePreset)
    datePreset?: DatePreset;

    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @IsOptional()
    @IsEnum(MovementType)
    movementType?: MovementType;

    @IsOptional()
    @IsMongoId()
    productId?: string;

    @IsOptional()
    @IsMongoId()
    warehouseId?: string;
}
