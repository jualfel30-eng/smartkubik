import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BeautyGalleryItem,
  BeautyGalleryItemDocument,
} from '../../../schemas/beauty-gallery.schema';
import {
  CreateGalleryItemDto,
  UpdateGalleryItemDto,
} from '../../../dto/beauty';

@Injectable()
export class BeautyGalleryService {
  constructor(
    @InjectModel(BeautyGalleryItem.name)
    private galleryItemModel: Model<BeautyGalleryItemDocument>,
  ) {}

  async create(
    dto: CreateGalleryItemDto,
    tenantId: string,
    userId: string,
  ): Promise<BeautyGalleryItemDocument> {
    return this.galleryItemModel.create({
      ...dto,
      professionalId: dto.professionalId
        ? new Types.ObjectId(dto.professionalId)
        : undefined,
      tenantId: new Types.ObjectId(tenantId),
      createdBy: new Types.ObjectId(userId),
    });
  }

  async findAll(
    tenantId: string,
    filters?: {
      category?: string;
      professionalId?: string;
      isActive?: boolean;
    },
  ): Promise<BeautyGalleryItemDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters) {
      if (filters.category) query.category = filters.category;
      if (filters.professionalId)
        query.professional = new Types.ObjectId(filters.professionalId);
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
    }

    return this.galleryItemModel
      .find(query)
      .populate('professional', 'name')
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<BeautyGalleryItemDocument> {
    const item = await this.galleryItemModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!item) {
      throw new NotFoundException(`Gallery item with ID ${id} not found`);
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdateGalleryItemDto,
    tenantId: string,
    userId: string,
  ): Promise<BeautyGalleryItemDocument> {
    const item = await this.findOne(id, tenantId);

    if (dto.professionalId) {
      (dto as any).professionalId = new Types.ObjectId(dto.professionalId);
    }

    Object.assign(item, dto);
    item.updatedBy = new Types.ObjectId(userId);

    return item.save();
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const item = await this.findOne(id, tenantId);
    item.isActive = false;
    await item.save();
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const categories = await this.galleryItemModel
      .distinct('category', {
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .exec();

    return categories.filter(Boolean).sort();
  }
}
