import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RestaurantIngredient,
  RestaurantIngredientDocument,
} from '../../../schemas/restaurant-ingredient.schema';
import {
  CreateRestaurantIngredientDto,
  UpdateRestaurantIngredientDto,
} from '../dto/restaurant-ingredient.dto';

@Injectable()
export class RestaurantIngredientsService {
  constructor(
    @InjectModel(RestaurantIngredient.name)
    private ingredientModel: Model<RestaurantIngredientDocument>,
  ) {}

  async findAll(tenantId: string, onlyActive = false): Promise<RestaurantIngredientDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (onlyActive) query.isActive = true;
    return this.ingredientModel.find(query).sort({ category: 1, name: 1 }).lean().exec();
  }

  async findByIds(ids: string[], tenantId: string): Promise<RestaurantIngredientDocument[]> {
    return this.ingredientModel
      .find({
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean()
      .exec();
  }

  async create(dto: CreateRestaurantIngredientDto, tenantId: string): Promise<RestaurantIngredientDocument> {
    return this.ingredientModel.create({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
    });
  }

  async update(id: string, dto: UpdateRestaurantIngredientDto, tenantId: string): Promise<RestaurantIngredientDocument> {
    const doc = await this.ingredientModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
        { $set: dto },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Ingrediente ${id} no encontrado`);
    return doc;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const result = await this.ingredientModel.deleteOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });
    if (result.deletedCount === 0) throw new NotFoundException(`Ingrediente ${id} no encontrado`);
  }
}
