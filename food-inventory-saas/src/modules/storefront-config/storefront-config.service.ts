import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StorefrontConfig, StorefrontConfigDocument } from '../schemas/storefront-config.schema';
import { CreateStorefrontConfigDto, UpdateStorefrontConfigDto, UpdateThemeDto } from './dto/create-storefront-config.dto';

@Injectable()
export class StorefrontConfigService {
  constructor(
    @InjectModel(StorefrontConfig.name)
    private storefrontConfigModel: Model<StorefrontConfigDocument>,
  ) {}

  /**
   * Obtener la configuración del storefront del tenant actual
   */
  async getConfig(tenantId: string): Promise<StorefrontConfigDocument> {
    const config = await this.storefrontConfigModel.findOne({ 
      tenantId: new Types.ObjectId(tenantId) 
    });

    if (!config) {
      throw new NotFoundException('No se encontró configuración del storefront para este tenant');
    }

    return config;
  }

  /**
   * Crear o actualizar la configuración del storefront
   */
  async upsertConfig(
    tenantId: string,
    createDto: CreateStorefrontConfigDto,
  ): Promise<StorefrontConfigDocument> {
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Verificar si ya existe una configuración para este tenant
    const existingConfig = await this.storefrontConfigModel.findOne({ 
      tenantId: tenantObjectId 
    });

    // Verificar si el dominio ya está en uso por otro tenant
    if (createDto.domain) {
      const domainInUse = await this.storefrontConfigModel.findOne({
        domain: createDto.domain,
        tenantId: { $ne: tenantObjectId },
      });

      if (domainInUse) {
        throw new ConflictException('Este dominio ya está en uso por otro tenant');
      }
    }

    if (existingConfig) {
      // Actualizar configuración existente
      Object.assign(existingConfig, createDto);
      return existingConfig.save();
    } else {
      // Crear nueva configuración
      const newConfig = new this.storefrontConfigModel({
        ...createDto,
        tenantId: tenantObjectId,
      });
      return newConfig.save();
    }
  }

  /**
   * Actualizar solo el tema (colores, logo, favicon)
   */
  async updateTheme(
    tenantId: string,
    updateThemeDto: UpdateThemeDto,
  ): Promise<StorefrontConfigDocument> {
    const config = await this.getConfig(tenantId);

    if (!config.theme) {
      config.theme = {} as any;
    }

    Object.assign(config.theme, updateThemeDto);
    return config.save();
  }

  /**
   * Activar o desactivar el storefront
   */
  async toggleActive(tenantId: string, isActive: boolean): Promise<StorefrontConfigDocument> {
    const config = await this.getConfig(tenantId);
    config.isActive = isActive;
    return config.save();
  }

  /**
   * Actualizar solo el CSS personalizado
   */
  async updateCustomCSS(tenantId: string, customCSS: string): Promise<StorefrontConfigDocument> {
    const config = await this.getConfig(tenantId);
    config.customCSS = customCSS;
    return config.save();
  }

  /**
   * Obtener configuración por dominio (para el storefront público)
   */
  async getConfigByDomain(domain: string): Promise<StorefrontConfigDocument> {
    const config = await this.storefrontConfigModel.findOne({ 
      domain,
      isActive: true 
    });

    if (!config) {
      throw new NotFoundException('Storefront no encontrado o no está activo');
    }

    return config;
  }

  /**
   * Subir logo del storefront
   */
  async uploadLogo(tenantId: string, logoUrl: string): Promise<StorefrontConfigDocument> {
    const config = await this.getConfig(tenantId);
    
    if (!config.theme) {
      config.theme = {} as any;
    }
    
    config.theme.logo = logoUrl;
    return config.save();
  }

  /**
   * Subir favicon del storefront
   */
  async uploadFavicon(tenantId: string, faviconUrl: string): Promise<StorefrontConfigDocument> {
    const config = await this.getConfig(tenantId);
    
    if (!config.theme) {
      config.theme = {} as any;
    }
    
    config.theme.favicon = faviconUrl;
    return config.save();
  }

  /**
   * Eliminar configuración del storefront
   */
  async deleteConfig(tenantId: string): Promise<void> {
    const result = await this.storefrontConfigModel.deleteOne({ 
      tenantId: new Types.ObjectId(tenantId) 
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('No se encontró configuración del storefront para eliminar');
    }
  }

  /**
   * Verificar si un dominio está disponible
   */
  async isDomainAvailable(domain: string, excludeTenantId?: string): Promise<boolean> {
    const query: any = { domain };
    
    if (excludeTenantId) {
      query.tenantId = { $ne: new Types.ObjectId(excludeTenantId) };
    }

    const existing = await this.storefrontConfigModel.findOne(query);
    return !existing;
  }
}
