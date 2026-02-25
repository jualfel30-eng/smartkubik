import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, ClientSession } from "mongoose";
import { Routing, RoutingDocument } from "../../schemas/manufacturing-routing.schema";
import {
  CreateRoutingDto,
  UpdateRoutingDto,
  RoutingQueryDto,
} from "../../dto/routing.dto";

@Injectable()
export class RoutingService {
  constructor(
    @InjectModel(Routing.name)
    private readonly routingModel: Model<RoutingDocument>,
  ) {}

  async create(
    dto: CreateRoutingDto,
    user: any,
    session?: ClientSession,
  ): Promise<Routing> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const productId = new Types.ObjectId(dto.productId);
    const productVariantId = dto.productVariantId
      ? new Types.ObjectId(dto.productVariantId)
      : undefined;

    // Verificar duplicados
    const existing = await this.routingModel
      .findOne({ code: dto.code, tenantId })
      .lean()
      .exec();

    if (existing) {
      throw new BadRequestException(`Routing con código ${dto.code} ya existe`);
    }

    // Convertir IDs de work centers en operaciones
    const operations = dto.operations.map((op) => ({
      ...op,
      workCenterId: new Types.ObjectId(op.workCenterId),
    }));

    const routing = new this.routingModel({
      ...dto,
      productId,
      productVariantId,
      operations,
      tenantId,
      createdBy: new Types.ObjectId(user._id),
    });

    return routing.save({ session });
  }

  async findAll(query: RoutingQueryDto, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const { page = 1, limit = 20, productId, isActive } = query;

    const filter: any = { tenantId };
    if (productId) filter.productId = new Types.ObjectId(productId);
    if (isActive !== undefined) filter.isActive = isActive;

    const [data, total] = await Promise.all([
      this.routingModel
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate("productId", "name sku")
        .populate("operations.workCenterId", "code name")
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.routingModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: any): Promise<Routing> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const routing = await this.routingModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .populate("productId", "name sku")
      .populate("operations.workCenterId", "code name costPerHour")
      .lean()
      .exec();

    if (!routing) {
      throw new NotFoundException("Routing no encontrado");
    }

    return routing;
  }

  async update(
    id: string,
    dto: UpdateRoutingDto,
    user: any,
    session?: ClientSession,
  ): Promise<Routing> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const updateData: any = { ...dto };
    if (dto.operations) {
      updateData.operations = dto.operations.map((op) => ({
        ...op,
        workCenterId: new Types.ObjectId(op.workCenterId),
      }));
    }
    updateData.updatedBy = new Types.ObjectId(user._id);

    const updated = await this.routingModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId },
        { $set: updateData },
        { new: true, session },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException("Routing no encontrado");
    }

    return updated;
  }

  async delete(id: string, user: any, session?: ClientSession): Promise<void> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const result = await this.routingModel
      .deleteOne({ _id: new Types.ObjectId(id), tenantId }, { session })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Routing no encontrado");
    }
  }
}
