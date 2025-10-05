import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorefrontConfigService } from './storefront-config.service';
import { CreateStorefrontConfigDto, UpdateStorefrontConfigDto, UpdateThemeDto } from './dto/create-storefront-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';

@Controller('api/v1/storefront')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StorefrontConfigController {
  constructor(private readonly storefrontConfigService: StorefrontConfigService) {}

  /**
   * GET /api/v1/storefront/config
   * Obtener la configuración del storefront del tenant actual
   */
  @Get('config')
  async getConfig(@Request() req) {
    return this.storefrontConfigService.getConfig(req.user.tenantId);
  }

  /**
   * POST /api/v1/storefront/config
   * Crear o actualizar la configuración completa del storefront
   */
  @Post('config')
  async upsertConfig(
    @Request() req,
    @Body() createDto: CreateStorefrontConfigDto,
  ) {
    return this.storefrontConfigService.upsertConfig(req.user.tenantId, createDto);
  }

  /**
   * PUT /api/v1/storefront/theme
   * Actualizar solo el tema (colores, logo, favicon)
   */
  @Put('theme')
  async updateTheme(
    @Request() req,
    @Body() updateThemeDto: UpdateThemeDto,
  ) {
    return this.storefrontConfigService.updateTheme(req.user.tenantId, updateThemeDto);
  }

  /**
   * PUT /api/v1/storefront/toggle
   * Activar o desactivar el storefront
   */
  @Put('toggle')
  async toggleActive(
    @Request() req,
    @Body('isActive') isActive: boolean,
  ) {
    return this.storefrontConfigService.toggleActive(req.user.tenantId, isActive);
  }

  /**
   * PUT /api/v1/storefront/custom-css
   * Actualizar CSS personalizado
   */
  @Put('custom-css')
  async updateCustomCSS(
    @Request() req,
    @Body('customCSS') customCSS: string,
  ) {
    return this.storefrontConfigService.updateCustomCSS(req.user.tenantId, customCSS);
  }

  /**
   * POST /api/v1/storefront/upload-logo
   * Subir logo del storefront
   */
  @Post('upload-logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Aquí deberías implementar la lógica de subida a S3/CloudStorage
    // Por ahora, retornamos una URL de ejemplo
    const logoUrl = `https://cdn.smartkubik.com/tenants/${req.user.tenantId}/logo-${Date.now()}.${file.originalname.split('.').pop()}`;
    
    return this.storefrontConfigService.uploadLogo(req.user.tenantId, logoUrl);
  }

  /**
   * POST /api/v1/storefront/upload-favicon
   * Subir favicon del storefront
   */
  @Post('upload-favicon')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFavicon(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Aquí deberías implementar la lógica de subida a S3/CloudStorage
    const faviconUrl = `https://cdn.smartkubik.com/tenants/${req.user.tenantId}/favicon-${Date.now()}.${file.originalname.split('.').pop()}`;
    
    return this.storefrontConfigService.uploadFavicon(req.user.tenantId, faviconUrl);
  }

  /**
   * DELETE /api/v1/storefront/config
   * Eliminar la configuración del storefront
   */
  @Delete('config')
  async deleteConfig(@Request() req) {
    await this.storefrontConfigService.deleteConfig(req.user.tenantId);
    return { message: 'Configuración del storefront eliminada exitosamente' };
  }

  /**
   * GET /api/v1/storefront/check-domain
   * Verificar si un dominio está disponible
   */
  @Get('check-domain')
  async checkDomain(
    @Request() req,
    @Query('domain') domain: string,
  ) {
    if (!domain) {
      throw new BadRequestException('El parámetro domain es requerido');
    }

    const isAvailable = await this.storefrontConfigService.isDomainAvailable(
      domain,
      req.user.tenantId,
    );

    return { domain, isAvailable };
  }

  /**
   * GET /api/v1/storefront/public/:domain
   * Obtener configuración pública por dominio (sin autenticación)
   * Este endpoint será usado por el storefront público
   */
  @Get('public/:domain')
  async getPublicConfig(@Param('domain') domain: string) {
    return this.storefrontConfigService.getConfigByDomain(domain);
  }
}
