import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  NotFoundException,
  BadRequestException,
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
import { InvoicePdfService } from "./invoice-pdf.service";
import { ChatService } from "../../chat/chat.service";

import { JwtAuthGuard } from "../../guards/jwt-auth.guard";

@ApiTags("billing")
@Controller("billing")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly salesBookService: SalesBookService,
    private readonly salesBookPdfService: SalesBookPdfService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly chatService: ChatService,
  ) { }

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

  @Post("documents/:id/send-whatsapp")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Enviar factura por WhatsApp" })
  async sendWhatsApp(
    @Param("id") id: string,
    @Body("phone") phone: string,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId;
    const doc = await this.billingService.getById(id, tenantId);
    if (!doc) {
      throw new NotFoundException("Document Not Found");
    }

    const targetPhone = phone || (doc.customer as any)?.phone;

    if (!targetPhone) {
      throw new BadRequestException("Phone number required");
    }

    const pdfBuffer = await this.invoicePdfService.generate(doc as any);
    const base64Pdf = pdfBuffer.toString("base64");
    const mediaUrl = `data:application/pdf;base64,${base64Pdf}`;
    const filename = `factura-${doc.documentNumber}.pdf`;

    const conversation = await this.chatService.findOrCreateConversation(
      tenantId,
      targetPhone,
    );

    await this.chatService.sendMediaMessage(
      {
        conversationId: conversation._id.toString(),
        mediaUrl,
        mediaType: "document",
        caption: `Factura ${doc.documentNumber}`,
        filename,
      },
      tenantId,
    );

    return { success: true };
  }

  @Post("documents/send-adhoc-whatsapp")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Enviar pre-factura/orden por WhatsApp (sin persistencia)" })
  async sendAdhocWhatsApp(
    @Body() body: { invoiceData: any; phone: string },
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId;
    const { invoiceData, phone } = body;

    if (!invoiceData || !phone) {
      throw new BadRequestException("Invoice data and phone are required");
    }

    // Generate PDF from provided data
    const pdfBuffer = await this.invoicePdfService.generate(invoiceData);
    const base64Pdf = pdfBuffer.toString("base64");
    const mediaUrl = `data:application/pdf;base64,${base64Pdf}`;
    const filename = `factura-${invoiceData.documentNumber || "draft"}.pdf`;

    const conversation = await this.chatService.findOrCreateConversation(
      tenantId,
      phone,
    );

    await this.chatService.sendMediaMessage(
      {
        conversationId: conversation._id.toString(),
        mediaUrl,
        mediaType: "document",
        caption: `Factura ${invoiceData.documentNumber || "Draft"}`,
        filename,
      },
      tenantId,
    );

    return { success: true };
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
  @Get("sequences")
  @ApiOperation({ summary: "Listar secuencias de documentos activas" })
  async getSequences(@Req() req: any) {
    return this.billingService.getActiveSequences(req.user.tenantId);
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

  @Get("documents/:id/pdf")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Descargar Factura PDF" })
  async downloadPdf(
    @Param("id") id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const tenantId = req.user.tenantId;
    const doc = await this.billingService.getById(id, tenantId);

    if (!doc) {
      throw new NotFoundException("Document Not Found");
    }

    const pdfBuffer = await this.invoicePdfService.generate(doc as any);
    const filename = `factura-${doc.documentNumber || id}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
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

  @Get("sequences")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Obtener todas las series de facturación" })
  async getAllSequences(@Req() req: any) {
    return this.billingService.getAllSequences(req.user.tenantId);
  }

  @Post("sequences")
  @Permissions("billing_create")
  @ApiOperation({ summary: "Crear nueva serie de facturación" })
  async createSequence(@Body() dto: any, @Req() req: any) {
    return this.billingService.createSequence(dto, req.user.tenantId);
  }

  @Get("documents")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Listar documentos de facturación" })
  async listDocuments(
    @Query() filters: SeniatStatsDto,
    @Req() req: any,
  ) {
    return this.billingService.listDocuments(
      {
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        documentType: filters.documentType,
      },
      req.user.tenantId,
    );
  }
  @Post('repair-invoices')
  @Permissions('billing_issue')
  @ApiOperation({ summary: 'Reparar facturas históricas vacías desde sus órdenes' })
  async repairInvoices(@Req() req: any) {
    // Temporary endpoint to fix historical data
    const tenantId = req.user.tenantId;
    return this.billingService.repairInvoices(tenantId);
  }

  @Post('migrate-currency')
  @Permissions('billing_issue')
  @ApiOperation({ summary: 'Backfill totals.currency=VES para documentos históricos sin moneda' })
  async migrateCurrency(@Req() req: any) {
    return this.billingService.migrateCurrency(req.user.tenantId);
  }
}
