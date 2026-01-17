import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { BinLocation, BinLocationDocument } from "../../schemas/warehouse.schema";

export interface CreateBinLocationDto {
  warehouseId: string;
  code: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  description?: string;
  locationType?: "picking" | "bulk" | "receiving" | "shipping" | "quarantine";
  maxCapacity?: number;
  isActive?: boolean;
}

export interface UpdateBinLocationDto {
  code?: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  description?: string;
  locationType?: "picking" | "bulk" | "receiving" | "shipping" | "quarantine";
  maxCapacity?: number;
  isActive?: boolean;
}

@Injectable()
export class BinLocationsService {
  constructor(
    @InjectModel(BinLocation.name)
    private readonly binLocationModel: Model<BinLocationDocument>,
  ) {}

  async create(
    dto: CreateBinLocationDto,
    tenantId: string,
    userId?: string,
  ): Promise<BinLocationDocument> {
    const code = dto.code?.trim();
    if (!code) {
      throw new BadRequestException("El código es requerido.");
    }

    if (!dto.warehouseId) {
      throw new BadRequestException("El almacén es requerido.");
    }

    // Check for duplicate code in the same warehouse
    const exists = await this.binLocationModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        warehouseId: new Types.ObjectId(dto.warehouseId),
        code: code,
        isDeleted: false,
      })
      .lean();

    if (exists) {
      throw new BadRequestException(
        `La ubicación con código ${code} ya existe en este almacén.`,
      );
    }

    const binLocation = new this.binLocationModel({
      ...dto,
      code,
      warehouseId: new Types.ObjectId(dto.warehouseId),
      tenantId: new Types.ObjectId(tenantId),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      isActive: dto.isActive ?? true,
      isDeleted: false,
      currentOccupancy: 0,
    });

    return binLocation.save();
  }

  async findAll(
    tenantId: string,
    warehouseId?: string,
    includeInactive = false,
  ): Promise<BinLocationDocument[]> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (warehouseId) {
      filter.warehouseId = new Types.ObjectId(warehouseId);
    }

    if (!includeInactive) {
      filter.isActive = true;
    }

    return this.binLocationModel
      .find(filter)
      .sort({ warehouseId: 1, zone: 1, aisle: 1, shelf: 1, bin: 1 })
      .lean();
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<BinLocationDocument | null> {
    return this.binLocationModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .lean();
  }

  async update(
    id: string,
    dto: UpdateBinLocationDto,
    tenantId: string,
    userId?: string,
  ): Promise<BinLocationDocument> {
    const binLocation = await this.binLocationModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!binLocation) {
      throw new NotFoundException("Ubicación no encontrada.");
    }

    // If code is being changed, check for duplicates
    if (dto.code && dto.code !== binLocation.code) {
      const exists = await this.binLocationModel
        .findOne({
          tenantId: new Types.ObjectId(tenantId),
          warehouseId: binLocation.warehouseId,
          code: dto.code.trim(),
          isDeleted: false,
          _id: { $ne: binLocation._id },
        })
        .lean();

      if (exists) {
        throw new BadRequestException(
          `La ubicación con código ${dto.code} ya existe en este almacén.`,
        );
      }
    }

    Object.assign(binLocation, dto, {
      updatedBy: userId ? new Types.ObjectId(userId) : binLocation.updatedBy,
    });

    return binLocation.save();
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const result = await this.binLocationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      { $set: { isDeleted: true } },
      { new: true },
    );

    if (!result) {
      throw new NotFoundException("Ubicación no encontrada.");
    }
  }

  async updateOccupancy(
    id: string,
    tenantId: string,
    delta: number,
  ): Promise<BinLocationDocument> {
    const binLocation = await this.binLocationModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!binLocation) {
      throw new NotFoundException("Ubicación no encontrada.");
    }

    binLocation.currentOccupancy = Math.max(0, (binLocation.currentOccupancy || 0) + delta);
    return binLocation.save();
  }
}
