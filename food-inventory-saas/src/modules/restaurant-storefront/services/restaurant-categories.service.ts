import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RestaurantCategory,
  RestaurantCategoryDocument,
} from '../../../schemas/restaurant-category.schema';
import {
  CreateRestaurantCategoryDto,
  UpdateRestaurantCategoryDto,
} from '../dto/restaurant-category.dto';

@Injectable()
export class RestaurantCategoriesService {
  constructor(
    @InjectModel(RestaurantCategory.name)
    private categoryModel: Model<RestaurantCategoryDocument>,
  ) {}

  async findAll(tenantId: string, onlyActive = false): Promise<RestaurantCategoryDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (onlyActive) query.isActive = true;
    return this.categoryModel.find(query).sort({ displayOrder: 1, name: 1 }).lean().exec();
  }

  async findOne(id: string, tenantId: string): Promise<RestaurantCategoryDocument> {
    const doc = await this.categoryModel
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return doc;
  }

  async create(dto: CreateRestaurantCategoryDto, tenantId: string): Promise<RestaurantCategoryDocument> {
    const slug = this.toSlug(dto.name);
    const exists = await this.categoryModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      slug,
    });
    if (exists) throw new ConflictException(`Ya existe una categoría con el nombre "${dto.name}"`);

    return this.categoryModel.create({
      ...dto,
      slug,
      tenantId: new Types.ObjectId(tenantId),
    });
  }

  async update(id: string, dto: UpdateRestaurantCategoryDto, tenantId: string): Promise<RestaurantCategoryDocument> {
    const update: any = { ...dto };
    if (dto.name) update.slug = this.toSlug(dto.name);

    const doc = await this.categoryModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
        { $set: update },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return doc;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const result = await this.categoryModel.deleteOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });
    if (result.deletedCount === 0) throw new NotFoundException(`Categoría ${id} no encontrada`);
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
