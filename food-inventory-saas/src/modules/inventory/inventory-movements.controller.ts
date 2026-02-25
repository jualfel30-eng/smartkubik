import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { InventoryMovementsService } from "./inventory-movements.service";
import {
  CreateInventoryMovementDto,
  CreateTransferDto,
  InventoryMovementFilterDto,
} from "../../dto/inventory-movement.dto";
import {
  ExportInventoryMovementsDto,
  ReportFormat,
  DatePreset,
} from "./dto/inventory-movements-report.dto";
import { InventoryMovementsReportPdfService } from "./inventory-movements-report-pdf.service";
import { InventoryMovementsReportCsvService } from "./inventory-movements-report-csv.service";

@Controller("inventory-movements")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class InventoryMovementsController {
  constructor(
    private readonly inventoryMovementsService: InventoryMovementsService,
    private readonly reportPdfService: InventoryMovementsReportPdfService,
    private readonly reportCsvService: InventoryMovementsReportCsvService,
  ) { }

  @Post()
  @Permissions("inventory_write")
  async create(@Body() dto: CreateInventoryMovementDto, @Request() req) {
    return this.inventoryMovementsService.create(
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @Permissions("inventory_read")
  async findAll(@Query() filters: InventoryMovementFilterDto, @Request() req) {
    return this.inventoryMovementsService.findAll(req.user.tenantId, filters);
  }

  @Get("documents")
  @Permissions("inventory_read")
  async findDocuments(@Query() filters: InventoryMovementFilterDto, @Request() req) {
    return this.inventoryMovementsService.findDocuments(req.user.tenantId, filters);
  }

  @Post("documents/export")
  @Permissions("inventory_read")
  async exportDocumentReport(
    @Body() documentDto: any,
    @Request() req,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportPdfService.generateDocumentReport(
      documentDto,
      req.user.tenantId,
    );

    const safeRef = (documentDto.documentReference || "documento").replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date().toISOString().slice(0, 10);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recibo-inventario-${safeRef}-${now}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    return res.send(pdfBuffer);
  }

  /**
   * Export inventory movements as PDF or CSV.
   * Resolves date presets to concrete date ranges and fetches
   * all matching movements (no pagination limit).
   */
  @Get("export")
  @Permissions("inventory_read")
  async exportMovements(
    @Query() dto: ExportInventoryMovementsDto,
    @Request() req,
    @Res() res: Response,
  ) {
    // Resolve date preset to concrete dateFrom/dateTo
    const { dateFrom, dateTo } = this.resolveDatePreset(dto);

    // Build filter for the service (high limit to get all movements)
    const filter: InventoryMovementFilterDto = {
      movementType: dto.movementType,
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      dateFrom,
      dateTo,
      limit: 10000, // Export all matching movements
      page: 1,
    };

    const result = await this.inventoryMovementsService.findAll(
      req.user.tenantId,
      filter,
    );

    const now = new Date().toISOString().slice(0, 10);

    if (dto.format === ReportFormat.PDF) {
      const pdfBuffer = await this.reportPdfService.generateReport(
        result.data,
        req.user.tenantId,
        {
          dateFrom,
          dateTo,
          movementType: dto.movementType,
        },
      );

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reporte-movimientos-${now}.pdf"`,
        "Content-Length": pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    }

    // CSV format
    const csvContent = this.reportCsvService.generateReport(
      result.data,
      {
        dateFrom,
        dateTo,
        movementType: dto.movementType,
      },
    );

    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-movimientos-${now}.csv"`,
    });
    return res.send(csvContent);
  }

  @Post("transfers")
  @Permissions("inventory_write")
  async createTransfer(@Body() dto: CreateTransferDto, @Request() req) {
    console.log("🐛 DEBUG Transfer - Incoming DTO:", JSON.stringify(dto));
    console.log("🐛 DEBUG Transfer - TenantID:", req.user.tenantId);
    console.log("🐛 DEBUG Transfer - UserID:", req.user.id);
    return this.inventoryMovementsService.createTransfer(
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  /**
   * Resolves a DatePreset enum to concrete dateFrom/dateTo ISO strings.
   * Falls back to the raw dateFrom/dateTo from the DTO if preset is 'custom' or missing.
   */
  private resolveDatePreset(dto: ExportInventoryMovementsDto): {
    dateFrom?: string;
    dateTo?: string;
  } {
    if (!dto.datePreset || dto.datePreset === DatePreset.CUSTOM) {
      return { dateFrom: dto.dateFrom, dateTo: dto.dateTo };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from: Date;
    let to: Date;

    switch (dto.datePreset) {
      case DatePreset.TODAY:
        from = today;
        to = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case DatePreset.YESTERDAY:
        from = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        to = new Date(today.getTime() - 1);
        break;
      case DatePreset.THIS_WEEK: {
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        from = new Date(today.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
        to = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      }
      case DatePreset.LAST_WEEK: {
        const dayOfWeek2 = now.getDay();
        const diffToMonday2 = dayOfWeek2 === 0 ? 6 : dayOfWeek2 - 1;
        const thisMonday = new Date(
          today.getTime() - diffToMonday2 * 24 * 60 * 60 * 1000,
        );
        from = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
        to = new Date(thisMonday.getTime() - 1);
        break;
      }
      case DatePreset.THIS_MONTH:
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case DatePreset.LAST_MONTH:
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      default:
        return { dateFrom: dto.dateFrom, dateTo: dto.dateTo };
    }

    return {
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
    };
  }
}
