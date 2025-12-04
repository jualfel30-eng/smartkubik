import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import {
  CreateBillingDocumentDto,
  IssueBillingDocumentDto,
} from "../../dto/billing.dto";
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
}
