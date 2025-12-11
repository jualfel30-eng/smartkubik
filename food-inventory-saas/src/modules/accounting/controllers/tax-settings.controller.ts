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
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TenantGuard } from '../../../guards/tenant.guard';
import { Permissions } from '../../../decorators/permissions.decorator';
import { PermissionsGuard } from '../../../guards/permissions.guard';
import { TaxSettingsService } from '../services/tax-settings.service';
import { CreateTaxSettingsDto, UpdateTaxSettingsDto } from '../../../dto/tax-settings.dto';

@Controller('accounting/tax-settings')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TaxSettingsController {
  constructor(private readonly taxSettingsService: TaxSettingsService) {}

  /**
   * GET /accounting/tax-settings
   * Obtener todas las configuraciones de impuestos
   */
  @Get()
  @Permissions('accounting_read')
  async findAll(@Req() req: any, @Query() filters: any) {
    return await this.taxSettingsService.findAll(req.user.tenantId, filters);
  }

  /**
   * GET /accounting/tax-settings/:id
   * Obtener una configuración por ID
   */
  @Get(':id')
  @Permissions('accounting_read')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return await this.taxSettingsService.findOne(id, req.user.tenantId);
  }

  /**
   * GET /accounting/tax-settings/code/:code
   * Obtener configuración por código
   */
  @Get('code/:code')
  @Permissions('accounting_read')
  async findByCode(@Param('code') code: string, @Req() req: any) {
    return await this.taxSettingsService.findByCode(code, req.user.tenantId);
  }

  /**
   * GET /accounting/tax-settings/default/:taxType
   * Obtener configuración por defecto de un tipo
   */
  @Get('default/:taxType')
  @Permissions('accounting_read')
  async findDefault(@Param('taxType') taxType: string, @Req() req: any) {
    return await this.taxSettingsService.findDefault(taxType, req.user.tenantId);
  }

  /**
   * GET /accounting/tax-settings/iva/rates
   * Obtener todas las tasas de IVA
   */
  @Get('iva/rates')
  @Permissions('accounting_read')
  async getIvaRates(@Req() req: any) {
    return await this.taxSettingsService.getIvaRates(req.user.tenantId);
  }

  /**
   * GET /accounting/tax-settings/withholding/settings
   * Obtener configuraciones de retención
   */
  @Get('withholding/settings')
  @Permissions('accounting_read')
  async getWithholdingSettings(@Req() req: any) {
    return await this.taxSettingsService.getWithholdingSettings(req.user.tenantId);
  }

  /**
   * POST /accounting/tax-settings
   * Crear nueva configuración de impuesto
   */
  @Post()
  @Permissions('accounting_create')
  async create(@Body() dto: CreateTaxSettingsDto, @Req() req: any) {
    return await this.taxSettingsService.create(dto, req.user);
  }

  /**
   * POST /accounting/tax-settings/seed
   * Crear impuestos por defecto (Venezuela)
   */
  @Post('seed')
  @Permissions('accounting_create')
  async seedDefaults(@Req() req: any) {
    await this.taxSettingsService.seedDefaultTaxes(req.user.tenantId, req.user._id);
    return { message: 'Impuestos por defecto creados exitosamente' };
  }

  /**
   * PUT /accounting/tax-settings/:id
   * Actualizar configuración
   */
  @Put(':id')
  @Permissions('accounting_update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaxSettingsDto,
    @Req() req: any,
  ) {
    return await this.taxSettingsService.update(id, dto, req.user);
  }

  /**
   * DELETE /accounting/tax-settings/:id
   * Eliminar configuración
   */
  @Delete(':id')
  @Permissions('accounting_delete')
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.taxSettingsService.delete(id, req.user.tenantId);
    return { message: 'Configuración eliminada exitosamente' };
  }
}
