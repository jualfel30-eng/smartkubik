import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TenantGuard } from '../../../guards/tenant.guard';
import { Permissions } from '../../../decorators/permissions.decorator';
import { PermissionsGuard } from '../../../guards/permissions.guard';
import { IvaWithholdingService } from '../services/iva-withholding.service';
import {
  CreateIvaWithholdingDto,
  UpdateIvaWithholdingDto,
  AnnulWithholdingDto,
} from '../../../dto/iva-withholding.dto';

@Controller('accounting/iva-withholding')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class IvaWithholdingController {
  constructor(private readonly ivaWithholdingService: IvaWithholdingService) {}

  /**
   * GET /accounting/iva-withholding
   * Obtener todas las retenciones con paginación y filtros
   */
  @Get()
  @Permissions('accounting_read')
  async findAll(@Req() req: any, @Query() filters: any) {
    return await this.ivaWithholdingService.findAll(req.user.tenantId, filters);
  }

  /**
   * GET /accounting/iva-withholding/:id
   * Obtener retención por ID
   */
  @Get(':id')
  @Permissions('accounting_read')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return await this.ivaWithholdingService.findOne(id, req.user.tenantId);
  }

  /**
   * GET /accounting/iva-withholding/period/:month/:year
   * Obtener retenciones por período
   */
  @Get('period/:month/:year')
  @Permissions('accounting_read')
  async findByPeriod(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.ivaWithholdingService.findByPeriod(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * GET /accounting/iva-withholding/summary/:month/:year
   * Obtener resumen de retenciones por período
   */
  @Get('summary/:month/:year')
  @Permissions('accounting_read')
  async getSummary(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.ivaWithholdingService.getSummary(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * GET /accounting/iva-withholding/export/arc/:month/:year
   * Exportar retenciones a formato ARC (SENIAT)
   */
  @Get('export/arc/:month/:year')
  @Permissions('accounting_read')
  async exportToARC(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const arcContent = await this.ivaWithholdingService.exportToARC(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );

    const filename = `ARC-IVA-${month}-${year}.txt`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(arcContent);
  }

  /**
   * POST /accounting/iva-withholding
   * Crear nueva retención de IVA
   */
  @Post()
  @Permissions('accounting_create')
  async create(@Body() dto: CreateIvaWithholdingDto, @Req() req: any) {
    return await this.ivaWithholdingService.create(dto, req.user);
  }

  /**
   * PUT /accounting/iva-withholding/:id
   * Actualizar retención (solo draft)
   */
  @Put(':id')
  @Permissions('accounting_update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIvaWithholdingDto,
    @Req() req: any,
  ) {
    return await this.ivaWithholdingService.update(id, dto, req.user);
  }

  /**
   * PUT /accounting/iva-withholding/:id/post
   * Contabilizar retención
   */
  @Put(':id/post')
  @Permissions('accounting_create')
  async post(@Param('id') id: string, @Req() req: any) {
    return await this.ivaWithholdingService.post(id, req.user);
  }

  /**
   * PUT /accounting/iva-withholding/:id/annul
   * Anular retención
   */
  @Put(':id/annul')
  @Permissions('accounting_delete')
  async annul(
    @Param('id') id: string,
    @Body() dto: AnnulWithholdingDto,
    @Req() req: any,
  ) {
    return await this.ivaWithholdingService.annul(id, dto, req.user);
  }

  /**
   * DELETE /accounting/iva-withholding/:id
   * Eliminar retención (solo draft)
   */
  @Delete(':id')
  @Permissions('accounting_delete')
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.ivaWithholdingService.delete(id, req.user.tenantId);
    return { message: 'Retención eliminada exitosamente' };
  }
}
