import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RestaurantDish,
  RestaurantDishDocument,
} from '../../../schemas/restaurant-dish.schema';
import {
  CreateRestaurantDishDto,
  UpdateRestaurantDishDto,
} from '../dto/restaurant-dish.dto';

@Injectable()
export class RestaurantDishesService {
  constructor(
    @InjectModel(RestaurantDish.name)
    private dishModel: Model<RestaurantDishDocument>,
  ) {}

  async findAll(
    tenantId: string,
    filters?: { categoryId?: string; onlyAvailable?: boolean; search?: string },
  ): Promise<RestaurantDishDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters?.onlyAvailable) query.isAvailable = true;
    if (filters?.categoryId) query.categoryId = new Types.ObjectId(filters.categoryId);
    if (filters?.search) query.name = { $regex: filters.search, $options: 'i' };

    return this.dishModel
      .find(query)
      .populate('categoryId', 'name slug')
      .populate('baseIngredients.ingredientId', 'name extraPrice')
      .populate('availableExtras.ingredientId', 'name extraPrice')
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
  }

  // Endpoint público: menú completo (platos disponibles + categorías activas en un solo objeto)
  async getPublicMenu(tenantId: string): Promise<{ dishes: any[]; categories: any[] }> {
    const dishes = await this.findAll(tenantId, { onlyAvailable: true });

    // Extraer categorías únicas de los platos
    const categoryMap = new Map<string, any>();
    for (const dish of dishes) {
      const cat = dish.categoryId as any;
      if (cat?._id && !categoryMap.has(cat._id.toString())) {
        categoryMap.set(cat._id.toString(), cat);
      }
    }

    return {
      dishes,
      categories: Array.from(categoryMap.values()),
    };
  }

  async findOne(id: string, tenantId: string): Promise<RestaurantDishDocument> {
    const doc = await this.dishModel
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) })
      .populate('categoryId', 'name slug')
      .populate('baseIngredients.ingredientId', 'name extraPrice')
      .populate('availableExtras.ingredientId', 'name extraPrice')
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Plato ${id} no encontrado`);
    return doc;
  }

  async create(dto: CreateRestaurantDishDto, tenantId: string, userId?: string): Promise<RestaurantDishDocument> {
    const data: any = {
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
    };

    if (dto.categoryId) data.categoryId = new Types.ObjectId(dto.categoryId);
    if (userId) data.createdBy = new Types.ObjectId(userId);

    if (dto.baseIngredients) {
      data.baseIngredients = dto.baseIngredients.map((bi) => ({
        ...bi,
        ingredientId: new Types.ObjectId(bi.ingredientId),
      }));
    }

    if (dto.availableExtras) {
      data.availableExtras = dto.availableExtras.map((ae) => ({
        ...ae,
        ingredientId: new Types.ObjectId(ae.ingredientId),
      }));
    }

    return this.dishModel.create(data);
  }

  async update(id: string, dto: UpdateRestaurantDishDto, tenantId: string): Promise<RestaurantDishDocument> {
    const update: any = { ...dto };

    if (dto.categoryId) update.categoryId = new Types.ObjectId(dto.categoryId);
    if (dto.baseIngredients) {
      update.baseIngredients = dto.baseIngredients.map((bi) => ({
        ...bi,
        ingredientId: new Types.ObjectId(bi.ingredientId),
      }));
    }
    if (dto.availableExtras) {
      update.availableExtras = dto.availableExtras.map((ae) => ({
        ...ae,
        ingredientId: new Types.ObjectId(ae.ingredientId),
      }));
    }

    const doc = await this.dishModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
        { $set: update },
        { new: true },
      )
      .lean()
      .exec();

    if (!doc) throw new NotFoundException(`Plato ${id} no encontrado`);
    return doc;
  }

  async toggleAvailability(id: string, tenantId: string): Promise<RestaurantDishDocument> {
    const dish = await this.dishModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!dish) throw new NotFoundException(`Plato ${id} no encontrado`);

    dish.isAvailable = !dish.isAvailable;
    await dish.save();
    return dish.toObject();
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const result = await this.dishModel.deleteOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });
    if (result.deletedCount === 0) throw new NotFoundException(`Plato ${id} no encontrado`);
  }
}
