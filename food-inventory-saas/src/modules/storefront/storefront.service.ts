import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as sharp from "sharp";
import * as fs from "fs/promises";
import * as path from "path";
import {
  StorefrontConfig,
  StorefrontConfigDocument,
} from "../../schemas/storefront-config.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { CreateStorefrontConfigDto } from "./dto/create-storefront-config.dto";
import { UpdateStorefrontConfigDto } from "./dto/update-storefront-config.dto";

@Injectable()
export class StorefrontService {
  private readonly logger = new Logger(StorefrontService.name);

  constructor(
    @InjectModel(StorefrontConfig.name)
    private storefrontConfigModel: Model<StorefrontConfigDocument>,
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
  ) {}

  /**
   * Crear configuración de storefront para un tenant
   */
  async create(
    createDto: CreateStorefrontConfigDto,
    user: any,
  ): Promise<StorefrontConfigDocument> {
    this.logger.log(`Creating storefront config for tenant: ${user.tenantId}`);

    // Verificar que el tenant existe
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    // Verificar que el módulo ecommerce esté habilitado
    if (!tenant.enabledModules?.ecommerce) {
      throw new BadRequestException(
        "El módulo de ecommerce no está habilitado para este tenant",
      );
    }

    // Verificar que no exista ya una configuración para este tenant
    const existingConfig = await this.storefrontConfigModel.findOne({
      tenantId: user.tenantId,
    });
    if (existingConfig) {
      throw new ConflictException(
        "Ya existe una configuración de storefront para este tenant",
      );
    }

    // Verificar que el dominio no esté en uso
    const existingDomain = await this.storefrontConfigModel.findOne({
      domain: createDto.domain,
    });
    if (existingDomain) {
      throw new ConflictException(
        `El dominio "${createDto.domain}" ya está en uso`,
      );
    }

    // Crear la configuración
    const configData = {
      ...createDto,
      tenantId: user.tenantId,
      isActive: createDto.isActive ?? false,
    };

    const createdConfig = new this.storefrontConfigModel(configData);
    const savedConfig = await createdConfig.save();

    this.logger.log(
      `Storefront config created successfully for tenant: ${user.tenantId}`,
    );

    return savedConfig;
  }

  /**
   * Obtener configuración de storefront del tenant autenticado
   */
  async findByTenant(tenantId: string): Promise<any> {
    this.logger.log(`Finding storefront config for tenant: ${tenantId}`);

    const config = await this.storefrontConfigModel
      .findOne({ tenantId })
      .exec();

    if (!config) {
      // Si no hay configuración, devolver dominio sugerido
      const suggestedDomain = await this.getSuggestedDomain(tenantId);
      throw new NotFoundException(
        JSON.stringify({ suggestedDomain }),
      );
    }

    // Siempre incluir el dominio sugerido en la respuesta
    const suggestedDomain = await this.getSuggestedDomain(tenantId);
    return {
      ...config.toObject(),
      suggestedDomain,
    };
  }

  /**
   * Obtener configuración por dominio (endpoint público)
   */
  async findByDomain(domain: string): Promise<StorefrontConfigDocument> {
    this.logger.log(`Finding storefront config by domain: ${domain}`);

    const config = await this.storefrontConfigModel
      .findOne({ domain, isActive: true })
      .populate("tenantId", "name businessType contactInfo logo")
      .exec();

    if (!config) {
      throw new NotFoundException(
        `No se encontró un storefront activo para el dominio "${domain}"`,
      );
    }

    return config;
  }

  /**
   * Obtener configuración por tenantId (endpoint público)
   */
  async findByTenantIdPublic(
    tenantId: string,
  ): Promise<StorefrontConfigDocument> {
    this.logger.log(`Finding public storefront config for tenant: ${tenantId}`);

    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException("ID de tenant inválido");
    }

    const config = await this.storefrontConfigModel
      .findOne({ tenantId, isActive: true })
      .populate("tenantId", "name businessType contactInfo logo")
      .exec();

    if (!config) {
      throw new NotFoundException(
        "No se encontró un storefront activo para este tenant",
      );
    }

    return config;
  }

  /**
   * Actualizar configuración completa (PUT)
   */
  async update(
    updateDto: CreateStorefrontConfigDto,
    user: any,
  ): Promise<StorefrontConfigDocument> {
    this.logger.log(`Updating storefront config for tenant: ${user.tenantId}`);

    // Verificar que existe la configuración
    const existingConfig = await this.storefrontConfigModel.findOne({
      tenantId: user.tenantId,
    });

    if (!existingConfig) {
      throw new NotFoundException(
        "No se encontró configuración de storefront para este tenant",
      );
    }

    // Si se está cambiando el dominio, verificar que no esté en uso
    if (updateDto.domain && updateDto.domain !== existingConfig.domain) {
      const domainInUse = await this.storefrontConfigModel.findOne({
        domain: updateDto.domain,
        _id: { $ne: existingConfig._id },
      });

      if (domainInUse) {
        throw new ConflictException(
          `El dominio "${updateDto.domain}" ya está en uso`,
        );
      }
    }

    // Actualizar con todos los campos (reemplazo completo)
    const updateData = {
      ...updateDto,
      tenantId: user.tenantId,
    };

    const updatedConfig = await this.storefrontConfigModel
      .findByIdAndUpdate(existingConfig._id, updateData, { new: true })
      .exec();

    this.logger.log(
      `Storefront config updated successfully for tenant: ${user.tenantId}`,
    );

    return updatedConfig!;
  }

  /**
   * Actualizar configuración parcialmente (PATCH)
   */
  async updatePartial(
    updateDto: UpdateStorefrontConfigDto,
    user: any,
  ): Promise<StorefrontConfigDocument> {
    this.logger.log(
      `Partially updating storefront config for tenant: ${user.tenantId}`,
    );

    // Verificar que existe la configuración
    const existingConfig = await this.storefrontConfigModel.findOne({
      tenantId: user.tenantId,
    });

    if (!existingConfig) {
      throw new NotFoundException(
        "No se encontró configuración de storefront para este tenant",
      );
    }

    // Si se está cambiando el dominio, verificar que no esté en uso
    if (updateDto.domain && updateDto.domain !== existingConfig.domain) {
      const domainInUse = await this.storefrontConfigModel.findOne({
        domain: updateDto.domain,
        _id: { $ne: existingConfig._id },
      });

      if (domainInUse) {
        throw new ConflictException(
          `El dominio "${updateDto.domain}" ya está en uso`,
        );
      }
    }

    // Actualizar solo los campos proporcionados
    const updateData: any = {};

    // Campos de primer nivel
    if (updateDto.domain !== undefined) updateData.domain = updateDto.domain;
    if (updateDto.templateType !== undefined)
      updateData.templateType = updateDto.templateType;
    if (updateDto.customCSS !== undefined)
      updateData.customCSS = updateDto.customCSS;
    if (updateDto.isActive !== undefined)
      updateData.isActive = updateDto.isActive;

    // Subdocumentos - merge con valores existentes
    if (updateDto.theme) {
      updateData.theme = {
        ...existingConfig.theme,
        ...updateDto.theme,
      };
    }

    if (updateDto.seo) {
      updateData.seo = {
        ...existingConfig.seo,
        ...updateDto.seo,
      };
    }

    if (updateDto.socialMedia) {
      updateData.socialMedia = {
        ...existingConfig.socialMedia,
        ...updateDto.socialMedia,
      };
    }

    if (updateDto.contactInfo) {
      updateData.contactInfo = {
        ...existingConfig.contactInfo,
        ...updateDto.contactInfo,
      };

      // Merge address si existe
      if (updateDto.contactInfo.address) {
        updateData.contactInfo.address = {
          ...existingConfig.contactInfo?.address,
          ...updateDto.contactInfo.address,
        };
      }
    }

    const updatedConfig = await this.storefrontConfigModel
      .findByIdAndUpdate(existingConfig._id, updateData, { new: true })
      .exec();

    this.logger.log(
      `Storefront config partially updated for tenant: ${user.tenantId}`,
    );

    return updatedConfig!;
  }

  /**
   * Resetear configuración a valores por defecto
   */
  async reset(user: any): Promise<StorefrontConfigDocument> {
    this.logger.log(`Resetting storefront config for tenant: ${user.tenantId}`);

    const existingConfig = await this.storefrontConfigModel.findOne({
      tenantId: user.tenantId,
    });

    if (!existingConfig) {
      throw new NotFoundException(
        "No se encontró configuración de storefront para este tenant",
      );
    }

    // Obtener información del tenant para valores por defecto
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    // Valores por defecto
    const defaultConfig = {
      isActive: false,
      theme: {
        primaryColor: "#3B82F6",
        secondaryColor: "#10B981",
        logo: tenant.logo || undefined,
        favicon: undefined,
      },
      templateType: "ecommerce",
      customCSS: undefined,
      seo: {
        title: `${tenant.name} - Tienda Online`,
        description: `Bienvenido a la tienda online de ${tenant.name}`,
        keywords: [],
      },
      socialMedia: {
        facebook: undefined,
        instagram: undefined,
        whatsapp: tenant.contactInfo?.phone || undefined,
        twitter: undefined,
        linkedin: undefined,
      },
      contactInfo: {
        email: tenant.contactInfo?.email || "",
        phone: tenant.contactInfo?.phone || "",
        address: tenant.contactInfo?.address || undefined,
      },
    };

    const updatedConfig = await this.storefrontConfigModel
      .findByIdAndUpdate(existingConfig._id, defaultConfig, { new: true })
      .exec();

    this.logger.log(
      `Storefront config reset to defaults for tenant: ${user.tenantId}`,
    );

    return updatedConfig!;
  }

  /**
   * Eliminar configuración de storefront
   */
  async remove(user: any): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Removing storefront config for tenant: ${user.tenantId}`);

    const result = await this.storefrontConfigModel
      .deleteOne({ tenantId: user.tenantId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        "No se encontró configuración de storefront para eliminar",
      );
    }

    this.logger.log(
      `Storefront config removed successfully for tenant: ${user.tenantId}`,
    );

    return {
      success: true,
      message: "Configuración de storefront eliminada exitosamente",
    };
  }

  /**
   * Obtener lista de dominios activos (para Next.js ISR)
   */
  async getActiveDomains(): Promise<string[]> {
    this.logger.log("Getting list of active domains");

    const configs = await this.storefrontConfigModel
      .find({ isActive: true }, { domain: 1, _id: 0 })
      .exec();

    const domains = configs.map((config) => config.domain);

    this.logger.log(`Found ${domains.length} active domains`);

    return domains;
  }

  /**
   * Sanitizar nombre para crear un dominio válido
   */
  private sanitizeDomainName(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remover acentos
      .replace(/[^a-z0-9\s-]/g, "") // Solo letras, números, espacios y guiones
      .trim()
      .replace(/\s+/g, "-") // Espacios a guiones
      .replace(/-+/g, "-") // Múltiples guiones a uno
      .replace(/^-+|-+$/g, ""); // Remover guiones al inicio/fin
  }

  /**
   * Obtener dominio sugerido basado en el nombre del tenant
   */
  async getSuggestedDomain(tenantId: string): Promise<string> {
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    let baseDomain = this.sanitizeDomainName(tenant.name);
    let suggestedDomain = baseDomain;
    let counter = 1;

    // Si el dominio base está en uso, agregar número
    while (await this.isDomainTaken(suggestedDomain)) {
      suggestedDomain = `${baseDomain}-${counter}`;
      counter++;
    }

    return suggestedDomain;
  }

  /**
   * Verificar si un dominio está en uso
   */
  private async isDomainTaken(domain: string): Promise<boolean> {
    const existing = await this.storefrontConfigModel
      .findOne({ domain })
      .exec();
    return !!existing;
  }

  /**
   * Verificar disponibilidad de dominio
   */
  async checkDomainAvailability(
    domain: string,
    currentTenantId?: string,
  ): Promise<boolean> {
    const query: any = { domain };

    // Si estamos verificando para un tenant específico, excluir su propia configuración
    if (currentTenantId) {
      query.tenantId = { $ne: currentTenantId };
    }

    const existing = await this.storefrontConfigModel.findOne(query).exec();
    return !existing;
  }

  /**
   * Subir y optimizar logo
   */
  async uploadLogo(
    file: Express.Multer.File,
    tenantId: string,
  ): Promise<{ logo: string }> {
    this.logger.log(`Uploading logo for tenant: ${tenantId}`);

    try {
      // Crear directorio si no existe
      const uploadDir = path.join(process.cwd(), "uploads", "storefront");
      await fs.mkdir(uploadDir, { recursive: true });

      // Generar nombre único
      const filename = `logo-${tenantId}-${Date.now()}.webp`;
      const filepath = path.join(uploadDir, filename);

      // Optimizar imagen
      await sharp(file.buffer)
        .resize(400, null, {
          // Max 400px de ancho, mantener aspecto
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality: 85 })
        .toFile(filepath);

      // Convertir a base64 para almacenar
      const buffer = await fs.readFile(filepath);
      const base64 = `data:image/webp;base64,${buffer.toString("base64")}`;

      // Eliminar archivo temporal
      await fs.unlink(filepath);

      this.logger.log(`Logo uploaded successfully for tenant: ${tenantId}`);

      return { logo: base64 };
    } catch (error) {
      this.logger.error(`Error uploading logo: ${error.message}`);
      throw new BadRequestException("Error al procesar la imagen del logo");
    }
  }

  /**
   * Subir y optimizar favicon
   */
  async uploadFavicon(
    file: Express.Multer.File,
    tenantId: string,
  ): Promise<{ favicon: string }> {
    this.logger.log(`Uploading favicon for tenant: ${tenantId}`);

    try {
      // Crear directorio si no existe
      const uploadDir = path.join(process.cwd(), "uploads", "storefront");
      await fs.mkdir(uploadDir, { recursive: true });

      // Generar nombre único
      const filename = `favicon-${tenantId}-${Date.now()}.png`;
      const filepath = path.join(uploadDir, filename);

      // Optimizar imagen a 32x32
      await sharp(file.buffer)
        .resize(32, 32, {
          fit: "cover",
        })
        .png({ quality: 90 })
        .toFile(filepath);

      // Convertir a base64
      const buffer = await fs.readFile(filepath);
      const base64 = `data:image/png;base64,${buffer.toString("base64")}`;

      // Eliminar archivo temporal
      await fs.unlink(filepath);

      this.logger.log(`Favicon uploaded successfully for tenant: ${tenantId}`);

      return { favicon: base64 };
    } catch (error) {
      this.logger.error(`Error uploading favicon: ${error.message}`);
      throw new BadRequestException("Error al procesar la imagen del favicon");
    }
  }
}
