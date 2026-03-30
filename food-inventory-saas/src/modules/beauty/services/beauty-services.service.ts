import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BeautyService,
  BeautyServiceDocument,
} from '../../../schemas/beauty-service.schema';
import {
  CreateBeautyServiceDto,
  UpdateBeautyServiceDto,
} from '../../../dto/beauty';

/**
 * Servicio para gestión de servicios de belleza
 * Incluye lógica de cálculo de tamaño de imágenes
 */
@Injectable()
export class BeautyServicesService {
  constructor(
    @InjectModel(BeautyService.name)
    private beautyServiceModel: Model<BeautyServiceDocument>,
  ) {}

  /**
   * Crea un nuevo servicio de belleza
   * Valida tamaño de imágenes antes de guardar
   */
  async create(
    dto: CreateBeautyServiceDto,
    tenantId: string,
    userId: string,
  ): Promise<BeautyServiceDocument> {
    // Calcular tamaño de imágenes
    const imagesSize = this.calculateImagesSize(dto.images);

    // TODO: Validar contra tenant.usage.currentStorage + tenant.limits.maxStorage
    // Requiere inyectar TenantModel para verificar cuota

    // Convertir professionalIds a ObjectId si existen
    const professionals = dto.professionals?.map(
      (id) => new Types.ObjectId(id),
    );

    const service = await this.beautyServiceModel.create({
      ...dto,
      professionals,
      tenantId: new Types.ObjectId(tenantId),
      createdBy: new Types.ObjectId(userId),
    });

    // TODO: Actualizar tenant.usage.currentStorage += imagesSize

    return service;
  }

  /**
   * Obtiene todos los servicios de un tenant
   */
  async findAll(
    tenantId: string,
    filters?: {
      category?: string;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<BeautyServiceDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters) {
      if (filters.category) {
        query.category = filters.category;
      }
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } },
        ];
      }
    }

    return this.beautyServiceModel
      .find(query)
      .populate('professionals', 'name role avatar specialties')
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();
  }

  /**
   * Obtiene un servicio por ID
   */
  async findOne(id: string, tenantId: string): Promise<BeautyServiceDocument> {
    const service = await this.beautyServiceModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      })
      .populate('professionals', 'name role avatar specialties instagram')
      .exec();

    if (!service) {
      throw new NotFoundException(`Beauty service with ID ${id} not found`);
    }

    return service;
  }

  /**
   * Actualiza un servicio
   */
  async update(
    id: string,
    dto: UpdateBeautyServiceDto,
    tenantId: string,
    userId: string,
  ): Promise<BeautyServiceDocument> {
    const service = await this.findOne(id, tenantId);

    // Si hay nuevas imágenes, calcular diferencia de tamaño
    if (dto.images) {
      const oldImagesSize = this.calculateImagesSize(service.images);
      const newImagesSize = this.calculateImagesSize(dto.images);
      const sizeDiff = newImagesSize - oldImagesSize;

      // TODO: Validar cuota si sizeDiff > 0
      // TODO: Actualizar tenant.usage.currentStorage += sizeDiff
    }

    // Convertir professionalIds si existen
    if (dto.professionals) {
      (dto as any).professionals = dto.professionals.map(
        (id) => new Types.ObjectId(id),
      );
    }

    Object.assign(service, dto);
    service.updatedBy = new Types.ObjectId(userId);

    return service.save();
  }

  /**
   * Elimina un servicio (soft delete)
   */
  async remove(id: string, tenantId: string): Promise<void> {
    const service = await this.findOne(id, tenantId);

    // Soft delete: marcar como inactivo en vez de eliminar
    service.isActive = false;
    await service.save();

    // TODO: Liberar espacio de imágenes del tenant.usage.currentStorage
  }

  /**
   * Obtiene todas las categorías únicas del tenant
   */
  async getCategories(tenantId: string): Promise<string[]> {
    const categories = await this.beautyServiceModel
      .distinct('category', {
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .exec();

    return categories.sort();
  }

  /**
   * Calcula el tamaño total de imágenes en MB
   * Adaptado del método existente en products.service.ts
   */
  private calculateImagesSize(images: string[] | undefined): number {
    if (!images || images.length === 0) return 0;

    let totalSize = 0;
    for (const image of images) {
      if (!image.startsWith('data:image')) continue;

      // Extraer solo la parte base64
      const base64Data = image.split(',')[1] || image;

      // Calcular tamaño: (length * 3 / 4 - padding)
      const padding = base64Data.endsWith('==')
        ? 2
        : base64Data.endsWith('=')
          ? 1
          : 0;
      const sizeInBytes = (base64Data.length * 3) / 4 - padding;
      totalSize += sizeInBytes;
    }

    // Convertir a MB
    return totalSize / (1024 * 1024);
  }

  /**
   * Obtiene servicios que ofrece un profesional específico
   */
  async findByProfessional(
    professionalId: string,
    tenantId: string,
  ): Promise<BeautyServiceDocument[]> {
    return this.beautyServiceModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        professionals: new Types.ObjectId(professionalId),
        isActive: true,
      })
      .sort({ sortOrder: 1 })
      .exec();
  }
}
