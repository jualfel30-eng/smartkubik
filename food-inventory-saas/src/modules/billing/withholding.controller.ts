import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import { WithholdingService } from './withholding.service';
import { WithholdingPdfService } from './withholding-pdf.service';
import { WithholdingReportsService } from './withholding-reports.service';
import {
  CreateIvaRetentionDto,
  CreateIslrRetentionDto,
  CreateArcvRetentionDto,
  IssueWithholdingDto,
  WithholdingFiltersDto,
} from '../../dto/withholding.dto';

@ApiTags('withholding')
@Controller('withholding')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WithholdingController {
  constructor(
    private readonly withholdingService: WithholdingService,
    private readonly withholdingPdfService: WithholdingPdfService,
    private readonly withholdingReportsService: WithholdingReportsService,
  ) {}

  // ========================================
  // RETENCIONES IVA
  // ========================================

  @Post('iva')
  @Permissions('billing_create')
  @ApiOperation({ summary: 'Crear retención IVA desde una factura' })
  async createIvaRetention(
    @Body() dto: CreateIvaRetentionDto,
    @Req() req: any,
  ) {
    return this.withholdingService.createIvaRetention(
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  // ========================================
  // RETENCIONES ISLR
  // ========================================

  @Post('islr')
  @Permissions('billing_create')
  @ApiOperation({ summary: 'Crear retención ISLR desde una factura' })
  async createIslrRetention(
    @Body() dto: CreateIslrRetentionDto,
    @Req() req: any,
  ) {
    return this.withholdingService.createIslrRetention(
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  // ========================================
  // RETENCIONES ARCV (VARIAS)
  // ========================================

  @Post('arcv')
  @Permissions('billing_create')
  @ApiOperation({ summary: 'Crear retención varia (ARCV - tipo 07) desde una factura' })
  async createArcvRetention(
    @Body() dto: CreateArcvRetentionDto,
    @Req() req: any,
  ) {
    return this.withholdingService.createArcvRetention(
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  // ========================================
  // OPERACIONES GENERALES
  // ========================================

  @Get()
  @Permissions('billing_read')
  @ApiOperation({ summary: 'Listar retenciones con filtros' })
  async findAll(@Query() filters: WithholdingFiltersDto, @Req() req: any) {
    return this.withholdingService.findAll(filters, req.user.tenantId);
  }

  @Get(':id')
  @Permissions('billing_read')
  @ApiOperation({ summary: 'Obtener una retención por ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.withholdingService.findOne(id, req.user.tenantId);
  }

  @Get(':id/pdf')
  @Permissions('billing_read')
  @ApiOperation({ summary: 'Descargar PDF del comprobante de retención' })
  async downloadPdf(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const retention = await this.withholdingService.findOne(id, req.user.tenantId);

    if (!retention) {
      throw new NotFoundException('Retención no encontrada');
    }

    const pdfBuffer = await this.withholdingPdfService.generate(retention as any);

    const filename = `${retention.documentNumber.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Post(':id/issue')
  @Permissions('billing_issue')
  @ApiOperation({
    summary: 'Emitir retención (solicitar control number si aplica)',
  })
  async issue(
    @Param('id') id: string,
    @Body() dto: IssueWithholdingDto,
    @Req() req: any,
  ) {
    return this.withholdingService.issue(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(':id/cancel')
  @Permissions('billing_cancel')
  @ApiOperation({ summary: 'Anular retención' })
  async cancel(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.withholdingService.cancel(
      id,
      body.reason,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get(':id/query-status')
  @Permissions('billing_read')
  @ApiOperation({ summary: 'Consultar estado de retención en HKA Factory' })
  async queryStatus(@Param('id') id: string, @Req() req: any) {
    return this.withholdingService.queryStatus(id, req.user.tenantId);
  }

  @Get(':id/hka-pdf')
  @Permissions('billing_read')
  @ApiOperation({ summary: 'Descargar PDF oficial desde HKA Factory' })
  async downloadHkaPdf(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const retention = await this.withholdingService.findOne(id, req.user.tenantId);

    if (!retention) {
      throw new NotFoundException('Retención no encontrada');
    }

    const pdfBuffer = await this.withholdingService.downloadHkaPdf(id, req.user.tenantId);

    const filename = `${retention.documentNumber.replace(/[^a-zA-Z0-9]/g, '-')}-HKA.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  // ========================================
  // RETENCIONES POR FACTURA
  // ========================================

  @Get('by-invoice/:invoiceId')
  @Permissions('billing_read')
  @ApiOperation({ summary: 'Obtener retenciones de una factura' })
  async findByInvoice(@Param('invoiceId') invoiceId: string, @Req() req: any) {
    return this.withholdingService.findByInvoice(invoiceId, req.user.tenantId);
  }

  @Get('by-invoice/:invoiceId/totals')
  @Permissions('billing_read')
  @ApiOperation({ summary: 'Calcular total de retenciones de una factura' })
  async calculateTotals(@Param('invoiceId') invoiceId: string, @Req() req: any) {
    return this.withholdingService.calculateTotalRetentions(
      invoiceId,
      req.user.tenantId,
    );
  }

  // ========================================
  // REPORTES FISCALES
  // ========================================

  @Get('reports/iva/:year/:month')
  @Permissions('billing_read')
  @ApiOperation({ summary: 'Libro de Retenciones IVA mensual (PDF)' })
  async getIvaMonthlyReport(
    @Param('year') year: string,
    @Param('month') month: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.withholdingReportsService.generateIvaMonthlyReport(
      req.user.tenantId,
      parseInt(year),
      parseInt(month),
      'pdf',
    );

    const filename = `libro-iva-${year}-${month.padStart(2, '0')}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': (pdfBuffer as Buffer).length,
    });

    res.send(pdfBuffer);
  }

  @Get('reports/islr/:year')
  @Permissions('billing_read')
  @ApiOperation({ summary: 'Relación de Retenciones ISLR anual (PDF)' })
  async getIslrAnnualReport(
    @Param('year') year: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.withholdingReportsService.generateIslrAnnualReport(
      req.user.tenantId,
      parseInt(year),
      'pdf',
    );

    const filename = `relacion-islr-${year}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': (pdfBuffer as Buffer).length,
    });

    res.send(pdfBuffer);
  }

  @Get('reports/islr/:year/txt')
  @Permissions('billing_read')
  @ApiOperation({ summary: 'Relación de Retenciones ISLR anual (TXT formato ARC)' })
  async getIslrAnnualReportTxt(
    @Param('year') year: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const txtContent = await this.withholdingReportsService.generateIslrAnnualReport(
      req.user.tenantId,
      parseInt(year),
      'txt',
    );

    const filename = `relacion-islr-${year}.txt`;

    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': (txtContent as string).length,
    });

    res.send(txtContent);
  }
}
