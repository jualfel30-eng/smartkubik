import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { BillingService } from "./billing.service";
import {
  CreateBillingDocumentDto,
  IssueBillingDocumentDto,
} from "../../dto/billing.dto";
import { SeniatStatsDto } from "../../dto/seniat-validation.dto";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { SalesBookService } from "./sales-book.service";
import { Query } from "@nestjs/common";
import { SalesBookPdfService } from "./sales-book-pdf.service";

@ApiTags("billing")
@Controller("billing")
@UseGuards(PermissionsGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly salesBookService: SalesBookService,
    private readonly salesBookPdfService: SalesBookPdfService,
  ) {}

  @Post("documents")
  @Permissions("billing_create")
  @ApiOperation({ summary: "Crear documento de facturación (draft)" })
  async create(@Body() dto: CreateBillingDocumentDto, @Req() req: any) {
    return this.billingService.create(dto, req.user.tenantId);
  }

  @Post("documents/:id/issue")
  @Permissions("billing_issue")
  @ApiOperation({ summary: "Emitir documento y solicitar control fiscal" })
  async issue(
    @Param("id") id: string,
    @Body() dto: IssueBillingDocumentDto,
    @Req() req: any,
  ) {
    return this.billingService.issue(id, dto, req.user.tenantId);
  }

  @Get("documents/:id/status")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Estado de timbrado de un documento" })
  async status(@Param("id") id: string, @Req() req: any) {
    const doc = await this.billingService.getById(id, req.user.tenantId);
    return {
      documentId: doc?._id,
      status: doc?.status,
      controlNumber: doc?.controlNumber,
      verificationUrl: doc?.taxInfo?.verificationUrl || doc?.verificationUrl,
      issuedAt: doc?.issueDate,
    };
  }

  @Get("documents/:id")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Obtener documento" })
  async getOne(@Param("id") id: string, @Req() req: any) {
    return this.billingService["billingModel"]
      .findOne({ _id: id, tenantId: req.user.tenantId })
      .lean();
  }

  @Get("books/sales")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Generar libro de ventas por canal (borrador)" })
  async salesBook(
    @Query("channel") channel: "digital" | "machine_fiscal",
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("format") format: "json" | "csv" | "pdf",
    @Req() req: any,
  ) {
    if (format === "pdf") {
      const pdfBuffer = await this.salesBookPdfService.generate({
        tenantId: req.user.tenantId,
        channel,
        from,
        to,
      });
      return {
        filename: `libro-ventas-${channel || "digital"}.pdf`,
        file: Buffer.from(pdfBuffer).toString("base64"),
      };
    }
    return this.salesBookService.generate({
      tenantId: req.user.tenantId,
      channel,
      from,
      to,
      format,
    });
  }

  // ========== SENIAT Electronic Invoicing Endpoints ==========

  @Post("documents/:id/validate-seniat")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Validar documento para SENIAT" })
  async validateSeniat(@Param("id") id: string, @Req() req: any) {
    const result = await this.billingService.validateForSENIAT(
      id,
      req.user.tenantId,
    );

    return {
      documentId: id,
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  @Post("documents/:id/generate-xml")
  @Permissions("billing_issue")
  @ApiOperation({ summary: "Generar XML SENIAT para facturación electrónica" })
  async generateXml(@Param("id") id: string, @Req() req: any) {
    const result = await this.billingService.generateSENIATXML(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      documentId: id,
      xml: result.xml,
      xmlHash: result.hash,
      qrCode: result.qrCode,
      verificationUrl: result.verificationUrl,
      generatedAt: new Date(),
    };
  }

  @Get("documents/:id/seniat-xml")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Descargar XML SENIAT" })
  async downloadXml(
    @Param("id") id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const xmlBuffer = await this.billingService.downloadXML(
      id,
      req.user.tenantId,
    );

    // Get document to use in filename
    const doc = await this.billingService.getById(id, req.user.tenantId);
    const filename = `factura-${doc?.documentNumber || id}.xml`;

    res.set({
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": xmlBuffer.length,
    });

    res.send(xmlBuffer);
  }

  @Get("stats/electronic-invoices")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Estadísticas de facturas electrónicas" })
  async getElectronicInvoiceStats(
    @Query() filters: SeniatStatsDto,
    @Req() req: any,
  ) {
    return this.billingService.getElectronicInvoiceStats(
      {
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        documentType: filters.documentType,
      },
      req.user.tenantId,
    );
  }
}
