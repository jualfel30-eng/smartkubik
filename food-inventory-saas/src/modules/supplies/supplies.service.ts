import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  ProductSupplyConfig,
  ProductSupplyConfigDocument,
} from "../../schemas/product-supply-config.schema";
import { CustomConversionRule } from "../../schemas/product-consumable-config.schema";
import {
  SupplyConsumptionLog,
  SupplyConsumptionLogDocument,
} from "../../schemas/supply-consumption-log.schema";
import {
  Product,
  ProductDocument,
  ProductType,
} from "../../schemas/product.schema";
import { UnitTypesService } from "../unit-types/unit-types.service";

@Injectable()
export class SuppliesService {
  private readonly logger = new Logger(SuppliesService.name);

  constructor(
    @InjectModel(ProductSupplyConfig.name)
    private readonly supplyConfigModel: Model<ProductSupplyConfigDocument>,
    @InjectModel(SupplyConsumptionLog.name)
    private readonly consumptionLogModel: Model<SupplyConsumptionLogDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly unitTypesService: UnitTypesService,
  ) {}

  /**
   * Validate UnitType integration fields
   */
  private async validateUnitTypeFields(data: {
    unitTypeId?: string;
    defaultUnit?: string;
    purchaseUnit?: string;
    stockUnit?: string;
    consumptionUnit?: string;
  }): Promise<void> {
    if (!data.unitTypeId) {
      return; // No validation needed if unitTypeId not provided
    }

    // Verify UnitType exists
    const unitType = await this.unitTypesService.findOne(data.unitTypeId);
    if (!unitType) {
      throw new BadRequestException(
        `UnitType with ID ${data.unitTypeId} not found`,
      );
    }

    // Validate that units exist in the UnitType conversions
    const unitsToValidate = [
      { unit: data.defaultUnit, field: "defaultUnit" },
      { unit: data.purchaseUnit, field: "purchaseUnit" },
      { unit: data.stockUnit, field: "stockUnit" },
      { unit: data.consumptionUnit, field: "consumptionUnit" },
    ];

    for (const { unit, field } of unitsToValidate) {
      if (unit) {
        const isValid = await this.unitTypesService.validateUnit(
          data.unitTypeId,
          unit,
        );
        if (!isValid) {
          throw new BadRequestException(
            `Unit "${unit}" in field "${field}" is not valid for UnitType "${unitType.name}"`,
          );
        }
      }
    }
  }

  /**
   * Create a supply configuration for a product
   */
  async createSupplyConfig(
    tenantId: string,
    productId: string,
    data: {
      supplyCategory: string;
      supplySubcategory: string;
      requiresTracking?: boolean;
      requiresAuthorization?: boolean;
      usageDepartment?: string;
      estimatedMonthlyConsumption?: number;
      unitTypeId?: string;
      defaultUnit?: string;
      purchaseUnit?: string;
      stockUnit?: string;
      consumptionUnit?: string;
      customConversions?: CustomConversionRule[];
      unitOfMeasure?: string; // DEPRECATED
      safetyInfo?: {
        requiresPPE: boolean;
        isHazardous: boolean;
        storageRequirements?: string;
        handlingInstructions?: string;
      };
      notes?: string;
    },
    userId?: string,
  ) {
    // Convert strings to ObjectIds for MongoDB queries
    const productObjectId = new Types.ObjectId(productId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Verify product exists and belongs to tenant
    const product = await this.productModel
      .findOne({ _id: productObjectId, tenantId: tenantObjectId })
      .lean()
      .exec();

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Check if product is already configured as supply
    const existingConfig = await this.supplyConfigModel
      .findOne({ productId: productObjectId, tenantId: tenantObjectId })
      .lean()
      .exec();

    if (existingConfig) {
      throw new BadRequestException(
        "Product already has a supply configuration",
      );
    }

    // Validate UnitType fields if provided
    if (data.unitTypeId) {
      await this.validateUnitTypeFields({
        unitTypeId: data.unitTypeId,
        defaultUnit: data.defaultUnit,
        purchaseUnit: data.purchaseUnit,
        stockUnit: data.stockUnit,
        consumptionUnit: data.consumptionUnit,
      });
    }

    const config = await this.supplyConfigModel.create({
      productId: productObjectId,
      tenantId: tenantObjectId,
      supplyCategory: data.supplyCategory,
      supplySubcategory: data.supplySubcategory,
      requiresTracking: data.requiresTracking ?? false,
      requiresAuthorization: data.requiresAuthorization ?? false,
      usageDepartment: data.usageDepartment,
      estimatedMonthlyConsumption: data.estimatedMonthlyConsumption,
      // UnitType integration
      unitTypeId: data.unitTypeId
        ? new Types.ObjectId(data.unitTypeId)
        : undefined,
      defaultUnit: data.defaultUnit,
      purchaseUnit: data.purchaseUnit,
      stockUnit: data.stockUnit,
      consumptionUnit: data.consumptionUnit,
      customConversions: data.customConversions,
      // Legacy field (backwards compatibility)
      unitOfMeasure:
        data.unitOfMeasure || data.defaultUnit || product.unitOfMeasure,
      safetyInfo: data.safetyInfo,
      notes: data.notes,
      isActive: true,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    // Update product type to SUPPLY if not already
    if (product.productType !== ProductType.SUPPLY) {
      await this.productModel.updateOne(
        { _id: productObjectId, tenantId: tenantObjectId },
        {
          $set: {
            productType: ProductType.SUPPLY,
            typeConfigId: config._id,
          },
        },
      );
    }

    this.logger.log(
      `Created supply config for product ${productId} in tenant ${tenantId}`,
    );

    return config;
  }

  /**
   * Update a supply configuration
   */
  async updateSupplyConfig(
    tenantId: string,
    configId: string,
    data: Partial<{
      supplyCategory: string;
      supplySubcategory: string;
      requiresTracking: boolean;
      requiresAuthorization: boolean;
      usageDepartment: string;
      estimatedMonthlyConsumption: number;
      unitTypeId: string;
      defaultUnit: string;
      purchaseUnit: string;
      stockUnit: string;
      consumptionUnit: string;
      customConversions: CustomConversionRule[];
      unitOfMeasure: string; // DEPRECATED
      safetyInfo: {
        requiresPPE: boolean;
        isHazardous: boolean;
        storageRequirements?: string;
        handlingInstructions?: string;
      };
      notes: string;
      isActive: boolean;
    }>,
    userId?: string,
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const configObjectId = new Types.ObjectId(configId);

    // Validate UnitType fields if being updated
    if (data.unitTypeId !== undefined) {
      // Get current config to merge with updates
      const currentConfig = await this.supplyConfigModel
        .findOne({ _id: configObjectId, tenantId: tenantObjectId })
        .lean()
        .exec();

      if (!currentConfig) {
        throw new NotFoundException("Supply configuration not found");
      }

      await this.validateUnitTypeFields({
        unitTypeId: data.unitTypeId || currentConfig.unitTypeId?.toString(),
        defaultUnit: data.defaultUnit ?? currentConfig.defaultUnit,
        purchaseUnit: data.purchaseUnit ?? currentConfig.purchaseUnit,
        stockUnit: data.stockUnit ?? currentConfig.stockUnit,
        consumptionUnit: data.consumptionUnit ?? currentConfig.consumptionUnit,
      });
    }

    // Prepare update data
    const updateData: any = { ...data };
    if (data.unitTypeId) {
      updateData.unitTypeId = new Types.ObjectId(data.unitTypeId);
    }
    if (userId) {
      updateData.updatedBy = new Types.ObjectId(userId);
    }

    const config = await this.supplyConfigModel
      .findOneAndUpdate(
        { _id: configObjectId, tenantId: tenantObjectId },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!config) {
      throw new NotFoundException("Supply configuration not found");
    }

    this.logger.log(`Updated supply config ${configId} in tenant ${tenantId}`);

    return config;
  }

  /**
   * Get supply configuration by product ID
   */
  async getSupplyConfigByProduct(tenantId: string, productId: string) {
    const productObjectId = new Types.ObjectId(productId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    const config = await this.supplyConfigModel
      .findOne({ productId: productObjectId, tenantId: tenantObjectId })
      .populate("productId")
      .lean()
      .exec();

    return config;
  }

  /**
   * List all supply configurations
   */
  async listSupplyConfigs(
    tenantId: string,
    filters?: {
      supplyCategory?: string;
      supplySubcategory?: string;
      usageDepartment?: string;
      requiresTracking?: boolean;
      isActive?: boolean;
    },
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const query: any = { tenantId: tenantObjectId };

    if (filters?.supplyCategory) {
      query.supplyCategory = filters.supplyCategory;
    }
    if (filters?.supplySubcategory) {
      query.supplySubcategory = filters.supplySubcategory;
    }
    if (filters?.usageDepartment) {
      query.usageDepartment = filters.usageDepartment;
    }
    if (filters?.requiresTracking !== undefined) {
      query.requiresTracking = filters.requiresTracking;
    }
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const configs = await this.supplyConfigModel
      .find(query)
      .populate("productId")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return configs;
  }

  /**
   * Log supply consumption
   */
  async logConsumption(
    tenantId: string,
    data: {
      supplyId: string;
      quantityConsumed: number;
      unitOfMeasure: string;
      consumptionType: string;
      department?: string;
      consumedBy?: string;
      relatedOrderId?: string;
      reason?: string;
      notes?: string;
      costInfo?: {
        unitCost: number;
        totalCost: number;
        currency: string;
      };
    },
    userId?: string,
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const supplyObjectId = new Types.ObjectId(data.supplyId);

    // Verify supply exists and belongs to tenant
    const supply = await this.productModel
      .findOne({ _id: supplyObjectId, tenantId: tenantObjectId })
      .lean()
      .exec();

    if (!supply) {
      throw new NotFoundException("Supply product not found");
    }

    // Verify supply has configuration
    const supplyConfig = await this.supplyConfigModel
      .findOne({ productId: supplyObjectId, tenantId: tenantObjectId })
      .lean()
      .exec();

    if (!supplyConfig) {
      throw new BadRequestException(
        "Supply product must have a supply configuration",
      );
    }

    const log = await this.consumptionLogModel.create({
      tenantId: tenantObjectId,
      supplyId: supplyObjectId,
      quantityConsumed: data.quantityConsumed,
      unitOfMeasure: data.unitOfMeasure,
      consumedAt: new Date(),
      consumptionType: data.consumptionType,
      department: data.department,
      consumedBy: data.consumedBy
        ? new Types.ObjectId(data.consumedBy)
        : undefined,
      relatedOrderId: data.relatedOrderId
        ? new Types.ObjectId(data.relatedOrderId)
        : undefined,
      reason: data.reason,
      notes: data.notes,
      costInfo: data.costInfo,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    this.logger.log(
      `Logged consumption: ${data.quantityConsumed} ${data.unitOfMeasure} of supply ${data.supplyId}`,
    );

    return log;
  }

  /**
   * Get consumption logs for a supply
   */
  async getSupplyConsumptionLogs(
    tenantId: string,
    supplyId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      department?: string;
      consumedBy?: string;
    },
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const supplyObjectId = new Types.ObjectId(supplyId);
    const query: any = { tenantId: tenantObjectId, supplyId: supplyObjectId };

    if (filters?.startDate || filters?.endDate) {
      query.consumedAt = {};
      if (filters.startDate) {
        query.consumedAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.consumedAt.$lte = filters.endDate;
      }
    }

    if (filters?.department) {
      query.department = filters.department;
    }

    if (filters?.consumedBy) {
      query.consumedBy = new Types.ObjectId(filters.consumedBy);
    }

    const logs = await this.consumptionLogModel
      .find(query)
      .populate("supplyId")
      .populate("consumedBy")
      .sort({ consumedAt: -1 })
      .lean()
      .exec();

    return logs;
  }

  /**
   * Get consumption report by department
   */
  async getConsumptionReportByDepartment(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const logs = await this.consumptionLogModel.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          consumedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { department: "$department", supplyId: "$supplyId" },
          totalQuantity: { $sum: "$quantityConsumed" },
          totalCost: { $sum: "$costInfo.totalCost" },
          consumptionCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id.supplyId",
          foreignField: "_id",
          as: "supply",
        },
      },
      {
        $unwind: "$supply",
      },
      {
        $sort: { "_id.department": 1, totalCost: -1 },
      },
    ]);

    return logs;
  }

  /**
   * Get consumption report by supply
   */
  async getConsumptionReportBySupply(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const logs = await this.consumptionLogModel.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          consumedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$supplyId",
          totalQuantity: { $sum: "$quantityConsumed" },
          totalCost: { $sum: "$costInfo.totalCost" },
          consumptionCount: { $sum: 1 },
          departments: { $addToSet: "$department" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "supply",
        },
      },
      {
        $unwind: "$supply",
      },
      {
        $sort: { totalCost: -1 },
      },
    ]);

    return logs;
  }
}
