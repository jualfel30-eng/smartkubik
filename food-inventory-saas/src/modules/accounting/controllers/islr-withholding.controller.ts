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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TenantGuard } from '../../../guards/tenant.guard';
import { Permissions } from '../../../decorators/permissions.decorator';
import { PermissionsGuard } from '../../../guards/permissions.guard';
import { IslrWithholdingService } from '../services/islr-withholding.service';
import {
  CreateIslrWithholdingDto,
  UpdateIslrWithholdingDto,
  AnnulIslrWithholdingDto,
  IslrWithholdingFilterDto,
  IslrWithholdingSummaryDto,
} from '../../../dto/islr-withholding.dto';

@ApiTags('accounting')
@Controller('accounting/islr-withholding')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class IslrWithholdingController {
  constructor(
    private readonly islrWithholdingService: IslrWithholdingService,
  ) {}

  /**
   * GET /accounting/islr-withholding
   * Obtener todas las retenciones ISLR con paginación y filtros
   */
  @Get()
  @Permissions('accounting_read')
  @ApiOperation({ summary: 'Obtener todas las retenciones ISLR' })
  async findAll(@Req() req: any, @Query() filters: IslrWithholdingFilterDto) {
    return await this.islrWithholdingService.findAll(
      req.user.tenantId,
      filters,
    );
  }

  /**
   * GET /accounting/islr-withholding/:id
   * Obtener retención ISLR por ID
   */
  @Get(':id')
  @Permissions('accounting_read')
  @ApiOperation({ summary: 'Obtener retención ISLR por ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return await this.islrWithholdingService.findOne(id, req.user.tenantId);
  }

  /**
   * GET /accounting/islr-withholding/period/:month/:year
   * Obtener retenciones ISLR por período
   */
  @Get('period/:month/:year')
  @Permissions('accounting_read')
  @ApiOperation({ summary: 'Obtener retenciones ISLR por período' })
  async findByPeriod(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.islrWithholdingService.findByPeriod(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * GET /accounting/islr-withholding/summary/:month/:year
   * Obtener resumen de retenciones ISLR por período
   */
  @Get('summary/:month/:year')
  @Permissions('accounting_read')
  @ApiOperation({ summary: 'Obtener resumen de retenciones ISLR por período' })
  async getSummary(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.islrWithholdingService.getSummary(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * GET /accounting/islr-withholding/export/arc/:month/:year
   * Exportar retenciones ISLR a formato ARC (SENIAT)
   */
  @Get('export/arc/:month/:year')
  @Permissions('accounting_read')
  @ApiOperation({ summary: 'Exportar retenciones ISLR a formato ARC SENIAT' })
  async exportToARC(
    @Param('month') month: string,
    @Param('year') year: string,
    @Query('onlyNotExported') onlyNotExported: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const arcContent = await this.islrWithholdingService.exportToARC(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
      onlyNotExported !== 'false', // Por defecto true
    );

    const filename = `ARC-ISLR-${month.padStart(2, '0')}-${year}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(arcContent);
  }

  /**
   * POST /accounting/islr-withholding
   * Crear nueva retención ISLR
   */
  @Post()
  @Permissions('accounting_create')
  @ApiOperation({ summary: 'Crear nueva retención ISLR' })
  async create(@Body() dto: CreateIslrWithholdingDto, @Req() req: any) {
    return await this.islrWithholdingService.create(dto, req.user);
  }

  /**
   * PUT /accounting/islr-withholding/:id
   * Actualizar retención ISLR (solo draft)
   */
  @Put(':id')
  @Permissions('accounting_update')
  @ApiOperation({ summary: 'Actualizar retención ISLR (solo borrador)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIslrWithholdingDto,
    @Req() req: any,
  ) {
    return await this.islrWithholdingService.update(id, dto, req.user);
  }

  /**
   * PUT /accounting/islr-withholding/:id/post
   * Contabilizar retención ISLR
   */
  @Put(':id/post')
  @Permissions('accounting_create')
  @ApiOperation({ summary: 'Contabilizar retención ISLR' })
  async post(@Param('id') id: string, @Req() req: any) {
    return await this.islrWithholdingService.post(id, req.user);
  }

  /**
   * PUT /accounting/islr-withholding/:id/annul
   * Anular retención ISLR
   */
  @Put(':id/annul')
  @Permissions('accounting_delete')
  @ApiOperation({ summary: 'Anular retención ISLR' })
  async annul(
    @Param('id') id: string,
    @Body() dto: AnnulIslrWithholdingDto,
    @Req() req: any,
  ) {
    return await this.islrWithholdingService.annul(id, dto, req.user);
  }

  /**
   * DELETE /accounting/islr-withholding/:id
   * Eliminar retención ISLR (solo draft)
   */
  @Delete(':id')
  @Permissions('accounting_delete')
  @ApiOperation({ summary: 'Eliminar retención ISLR (solo borrador)' })
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.islrWithholdingService.delete(id, req.user.tenantId);
    return { message: 'Retención ISLR eliminada exitosamente' };
  }
}
