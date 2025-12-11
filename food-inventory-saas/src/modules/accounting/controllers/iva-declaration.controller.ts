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
import { IvaDeclarationService } from '../services/iva-declaration.service';
import {
  CalculateIvaDeclarationDto,
  UpdateIvaDeclarationDto,
  FileIvaDeclarationDto,
  RecordPaymentDto,
} from '../../../dto/iva-declaration.dto';

@Controller('accounting/iva-declaration')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class IvaDeclarationController {
  constructor(private readonly ivaDeclarationService: IvaDeclarationService) {}

  /**
   * GET /accounting/iva-declaration
   * Obtener todas las declaraciones
   */
  @Get()
  @Permissions('accounting_read')
  async findAll(@Req() req: any, @Query() filters: any) {
    return await this.ivaDeclarationService.findAll(req.user.tenantId, filters);
  }

  /**
   * GET /accounting/iva-declaration/:id
   * Obtener declaración por ID
   */
  @Get(':id')
  @Permissions('accounting_read')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return await this.ivaDeclarationService.findOne(id, req.user.tenantId);
  }

  /**
   * GET /accounting/iva-declaration/period/:month/:year
   * Obtener declaración por período
   */
  @Get('period/:month/:year')
  @Permissions('accounting_read')
  async findByPeriod(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.ivaDeclarationService.findByPeriod(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * POST /accounting/iva-declaration/calculate
   * Calcular declaración automáticamente desde libros
   */
  @Post('calculate')
  @Permissions('accounting_create')
  async calculate(@Body() dto: CalculateIvaDeclarationDto, @Req() req: any) {
    return await this.ivaDeclarationService.calculate(dto, req.user);
  }

  /**
   * PUT /accounting/iva-declaration/:id
   * Actualizar valores manualmente
   */
  @Put(':id')
  @Permissions('accounting_update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIvaDeclarationDto,
    @Req() req: any,
  ) {
    return await this.ivaDeclarationService.update(id, dto, req.user);
  }

  /**
   * PUT /accounting/iva-declaration/:id/file
   * Presentar declaración a SENIAT
   */
  @Put(':id/file')
  @Permissions('accounting_create')
  async file(
    @Param('id') id: string,
    @Body() dto: FileIvaDeclarationDto,
    @Req() req: any,
  ) {
    return await this.ivaDeclarationService.file(id, dto, req.user);
  }

  /**
   * PUT /accounting/iva-declaration/:id/payment
   * Registrar pago de declaración
   */
  @Put(':id/payment')
  @Permissions('accounting_create')
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @Req() req: any,
  ) {
    return await this.ivaDeclarationService.recordPayment(id, dto, req.user);
  }

  /**
   * GET /accounting/iva-declaration/:id/xml
   * Descargar XML de la declaración
   */
  @Get(':id/xml')
  @Permissions('accounting_read')
  async downloadXML(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const declaration = await this.ivaDeclarationService.findOne(id, req.user.tenantId);

    if (!declaration.xmlContent) {
      res.status(404).json({ message: 'XML no generado' });
      return;
    }

    const filename = `${declaration.declarationNumber}.xml`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(declaration.xmlContent);
  }

  /**
   * DELETE /accounting/iva-declaration/:id
   * Eliminar declaración (solo draft o calculated)
   */
  @Delete(':id')
  @Permissions('accounting_delete')
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.ivaDeclarationService.delete(id, req.user.tenantId);
    return { message: 'Declaración eliminada exitosamente' };
  }
}
