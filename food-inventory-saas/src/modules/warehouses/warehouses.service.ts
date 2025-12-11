import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Warehouse, WarehouseDocument } from "../../schemas/warehouse.schema";

export interface CreateWarehouseDto {
  name: string;
  code: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateWarehouseDto {
  name?: string;
  location?: CreateWarehouseDto["location"];
  isActive?: boolean;
  isDefault?: boolean;
}

@Injectable()
export class WarehousesService {
  constructor(
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
  ) {}

  async create(
    dto: CreateWarehouseDto,
    tenantId: string,
    userId?: string,
  ): Promise<WarehouseDocument> {
    const code = dto.code?.trim();
    if (!code) {
      throw new BadRequestException("El código es requerido.");
    }

    const exists = await this.warehouseModel
      .findOne({
        tenantId,
        code: code,
        isDeleted: false,
      })
      .lean();
    if (exists) {
      throw new BadRequestException(
        `El almacén con código ${code} ya existe en este tenant.`,
      );
    }

    if (dto.isDefault) {
      await this.warehouseModel.updateMany(
        { tenantId, isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    const warehouse = new this.warehouseModel({
      ...dto,
      code,
      tenantId,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      isActive: dto.isActive ?? true,
      isDefault: dto.isDefault ?? false,
      isDeleted: false,
    });

    return warehouse.save();
  }

  async findAll(tenantId: string, includeInactive = false) {
    const filter: any = { tenantId, isDeleted: false };
    if (!includeInactive) {
      filter.isActive = true;
    }
    return this.warehouseModel.find(filter).sort({ isDefault: -1 }).lean();
  }

  async update(
    id: string,
    dto: UpdateWarehouseDto,
    tenantId: string,
    userId?: string,
  ): Promise<WarehouseDocument> {
    const warehouse = await this.warehouseModel.findOne({
      _id: id,
      tenantId,
      isDeleted: false,
    });
    if (!warehouse) {
      throw new NotFoundException("Almacén no encontrado");
    }

    if (dto.isDefault) {
      await this.warehouseModel.updateMany(
        { tenantId, isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    Object.assign(warehouse, dto, {
      updatedBy: userId ? new Types.ObjectId(userId) : warehouse.updatedBy,
    });
    return warehouse.save();
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const result = await this.warehouseModel.findOneAndUpdate(
      { _id: id, tenantId, isDeleted: false },
      { $set: { isDeleted: true, isDefault: false } },
      { new: true },
    );
    if (!result) {
      throw new NotFoundException("Almacén no encontrado");
    }
  }
}
