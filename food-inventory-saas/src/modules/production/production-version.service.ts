import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, ClientSession } from "mongoose";
import {
  ProductionVersion,
  ProductionVersionDocument,
} from "../../schemas/production-version.schema";
import {
  CreateProductionVersionDto,
  UpdateProductionVersionDto,
  ProductionVersionQueryDto,
} from "../../dto/production-version.dto";

@Injectable()
export class ProductionVersionService {
  constructor(
    @InjectModel(ProductionVersion.name)
    private readonly productionVersionModel: Model<ProductionVersionDocument>,
  ) {}

  async create(
    dto: CreateProductionVersionDto,
    user: any,
    session?: ClientSession,
  ): Promise<ProductionVersion> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const productId = new Types.ObjectId(dto.productId);
    const bomId = new Types.ObjectId(dto.bomId);
    const routingId = dto.routingId
      ? new Types.ObjectId(dto.routingId)
      : undefined;
    const productVariantId = dto.productVariantId
      ? new Types.ObjectId(dto.productVariantId)
      : undefined;

    // Verificar duplicados
    const existing = await this.productionVersionModel
      .findOne({ code: dto.code, tenantId })
      .lean()
      .exec();

    if (existing) {
      throw new BadRequestException(
        `Production Version con código ${dto.code} ya existe`,
      );
    }

    const productionVersion = new this.productionVersionModel({
      ...dto,
      productId,
      productVariantId,
      bomId,
      routingId,
      tenantId,
      createdBy: new Types.ObjectId(user._id),
    });

    return productionVersion.save({ session });
  }

  async findAll(query: ProductionVersionQueryDto, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const { page = 1, limit = 20, productId, isActive, isDefault } = query;

    const filter: any = { tenantId };
    if (productId) filter.productId = new Types.ObjectId(productId);
    if (isActive !== undefined) filter.isActive = isActive;
    if (isDefault !== undefined) filter.isDefault = isDefault;

    const [data, total] = await Promise.all([
      this.productionVersionModel
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate("productId", "name sku")
        .populate("bomId", "code name")
        .populate("routingId", "code name")
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.productionVersionModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: any): Promise<ProductionVersion> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const pv = await this.productionVersionModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .populate("productId", "name sku")
      .populate("bomId")
      .populate("routingId")
      .lean()
      .exec();

    if (!pv) {
      throw new NotFoundException("Production Version no encontrada");
    }

    return pv;
  }

  async getDefaultVersion(
    productId: string,
    user: any,
  ): Promise<ProductionVersion | null> {
    const tenantId = new Types.ObjectId(user.tenantId);
    return this.productionVersionModel
      .findOne({
        productId: new Types.ObjectId(productId),
        tenantId,
        isActive: true,
        isDefault: true,
      })
      .populate("bomId")
      .populate("routingId")
      .lean()
      .exec();
  }

  async update(
    id: string,
    dto: UpdateProductionVersionDto,
    user: any,
    session?: ClientSession,
  ): Promise<ProductionVersion> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const updateData: any = { ...dto };
    if (dto.bomId) updateData.bomId = new Types.ObjectId(dto.bomId);
    if (dto.routingId) updateData.routingId = new Types.ObjectId(dto.routingId);
    updateData.updatedBy = new Types.ObjectId(user._id);

    const updated = await this.productionVersionModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId },
        { $set: updateData },
        { new: true, session },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException("Production Version no encontrada");
    }

    return updated;
  }

  async delete(id: string, user: any, session?: ClientSession): Promise<void> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const result = await this.productionVersionModel
      .deleteOne({ _id: new Types.ObjectId(id), tenantId }, { session })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Production Version no encontrada");
    }
  }
}
