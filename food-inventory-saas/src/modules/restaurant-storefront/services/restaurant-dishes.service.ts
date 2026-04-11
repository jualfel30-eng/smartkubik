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
import { Product, ProductDocument } from '../../../schemas/product.schema';

/** Reemplaza referencias a localhost por la URL pública del API en producción */
function fixImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/https?:\/\/localhost:\d+/, 'https://api.smartkubik.com');
}

/** Mapea un producto ERP al shape de plato del storefront */
function productToDish(p: any): any {
  const variant = p.variants?.[0];
  const price = variant?.basePrice ?? p.pricingRules?.usdPrice ?? 0;
  const imageUrl = fixImageUrl(variant?.images?.[0]);
  const categoryName = p.subcategory?.[0] ?? p.category?.[0] ?? 'Sin Categoría';
  return {
    _id: p._id.toString(),
    name: p.name,
    description: p.description ?? '',
    price,
    imageUrl,
    isAvailable: p.isActive !== false,
    allowsCustomization: false,
    displayOrder: 0,
    baseIngredients: [],
    availableExtras: [],
    // virtual category slug para filtrado
    categoryId: { _id: slugId(categoryName), name: categoryName, slug: toSlug(categoryName) },
  };
}

function toSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** Genera un _id determinístico de 24 hex chars a partir de un string */
function slugId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  const hex = Math.abs(h).toString(16).padStart(8, '0');
  return hex.repeat(3); // 24 chars
}

@Injectable()
export class RestaurantDishesService {
  constructor(
    @InjectModel(RestaurantDish.name)
    private dishModel: Model<RestaurantDishDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
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

    // Fallback: si no hay restaurantdishes, servir desde los productos ERP
    if (dishes.length === 0) {
      return this.getMenuFromProducts(tenantId);
    }

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

  /** Fallback: lee productos del ERP y los sirve como menú del storefront */
  private async getMenuFromProducts(tenantId: string): Promise<{ dishes: any[]; categories: any[] }> {
    const products = await this.productModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
        // Solo productos vendibles (excluir materia prima)
        productType: { $in: ['simple', 'finished_good', 'service', null, undefined] },
        // Solo los que tienen precio
        $or: [
          { 'variants.0.basePrice': { $gt: 0 } },
          { 'pricingRules.usdPrice': { $gt: 0 } },
        ],
      })
      .lean()
      .exec();

    const mappedDishes = products.map(productToDish);

    // Construir categorías únicas
    const categoryMap = new Map<string, any>();
    for (const dish of mappedDishes) {
      const cat = dish.categoryId;
      if (cat?._id && !categoryMap.has(cat._id)) {
        categoryMap.set(cat._id, {
          _id: cat._id,
          name: cat.name,
          slug: cat.slug,
          displayOrder: categoryMap.size,
          isActive: true,
        });
      }
    }

    return {
      dishes: mappedDishes,
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
