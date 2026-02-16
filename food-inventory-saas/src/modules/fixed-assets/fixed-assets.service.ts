import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  FixedAsset,
  FixedAssetDocument,
} from "../../schemas/fixed-asset.schema";
import {
  CreateFixedAssetDto,
  UpdateFixedAssetDto,
} from "../../dto/fixed-asset.dto";

@Injectable()
export class FixedAssetsService {
  constructor(
    @InjectModel(FixedAsset.name)
    private readonly fixedAssetModel: Model<FixedAssetDocument>,
  ) {}

  async create(
    dto: CreateFixedAssetDto,
    tenantId: string,
  ): Promise<FixedAssetDocument> {
    const asset = new this.fixedAssetModel({
      ...dto,
      tenantId,
    });
    return asset.save();
  }

  async findAll(tenantId: string): Promise<FixedAssetDocument[]> {
    return this.fixedAssetModel
      .find({ tenantId })
      .sort({ acquisitionDate: -1 })
      .lean()
      .exec();
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<FixedAssetDocument> {
    const asset = await this.fixedAssetModel
      .findOne({ _id: id, tenantId })
      .lean()
      .exec();
    if (!asset) {
      throw new NotFoundException("Activo fijo no encontrado");
    }
    return asset as FixedAssetDocument;
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateFixedAssetDto,
  ): Promise<FixedAssetDocument> {
    const asset = await this.fixedAssetModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: dto }, { new: true })
      .lean()
      .exec();
    if (!asset) {
      throw new NotFoundException("Activo fijo no encontrado");
    }
    return asset as FixedAssetDocument;
  }

  async remove(id: string, tenantId: string): Promise<{ deleted: boolean }> {
    const result = await this.fixedAssetModel
      .deleteOne({ _id: id, tenantId })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException("Activo fijo no encontrado");
    }
    return { deleted: true };
  }

  async getSummary(tenantId: string) {
    const assets = await this.fixedAssetModel
      .find({ tenantId })
      .lean()
      .exec();

    const totalCost = assets.reduce((s, a) => s + (a.acquisitionCost || 0), 0);
    const totalDepreciation = assets.reduce(
      (s, a) => s + (a.accumulatedDepreciation || 0),
      0,
    );
    const netBookValue = totalCost - totalDepreciation;
    const activeCount = assets.filter((a) => a.status === "active").length;

    return {
      totalAssets: assets.length,
      activeCount,
      totalCost,
      totalDepreciation,
      netBookValue,
    };
  }
}
