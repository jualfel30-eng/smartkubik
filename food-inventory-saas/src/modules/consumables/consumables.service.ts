import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  ProductConsumableConfig,
  ProductConsumableConfigDocument,
} from "../../schemas/product-consumable-config.schema";
import {
  ProductConsumableRelation,
  ProductConsumableRelationDocument,
} from "../../schemas/product-consumable-relation.schema";
import {
  Product,
  ProductDocument,
  ProductType,
} from "../../schemas/product.schema";

@Injectable()
export class ConsumablesService {
  private readonly logger = new Logger(ConsumablesService.name);

  constructor(
    @InjectModel(ProductConsumableConfig.name)
    private readonly consumableConfigModel: Model<ProductConsumableConfigDocument>,
    @InjectModel(ProductConsumableRelation.name)
    private readonly consumableRelationModel: Model<ProductConsumableRelationDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  /**
   * Create a consumable configuration for a product
   */
  async createConsumableConfig(
    tenantId: string,
    productId: string,
    data: {
      consumableType: string;
      isReusable?: boolean;
      isAutoDeducted?: boolean;
      defaultQuantityPerUse?: number;
      unitOfMeasure?: string;
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

    // Check if product is already configured as consumable
    const existingConfig = await this.consumableConfigModel
      .findOne({ productId: productObjectId, tenantId: tenantObjectId })
      .lean()
      .exec();

    if (existingConfig) {
      throw new BadRequestException(
        "Product already has a consumable configuration",
      );
    }

    const config = await this.consumableConfigModel.create({
      productId: productObjectId,
      tenantId: tenantObjectId,
      consumableType: data.consumableType,
      isReusable: data.isReusable ?? false,
      isAutoDeducted: data.isAutoDeducted ?? true,
      defaultQuantityPerUse: data.defaultQuantityPerUse ?? 1,
      unitOfMeasure: data.unitOfMeasure || product.unitOfMeasure,
      notes: data.notes,
      isActive: true,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    // Update product type to CONSUMABLE if not already
    if (product.productType !== ProductType.CONSUMABLE) {
      await this.productModel.updateOne(
        { _id: productObjectId, tenantId: tenantObjectId },
        {
          $set: {
            productType: ProductType.CONSUMABLE,
            typeConfigId: config._id,
          },
        },
      );
    }

    this.logger.log(
      `Created consumable config for product ${productId} in tenant ${tenantId}`,
    );

    return config;
  }

  /**
   * Update a consumable configuration
   */
  async updateConsumableConfig(
    tenantId: string,
    configId: string,
    data: Partial<{
      consumableType: string;
      isReusable: boolean;
      isAutoDeducted: boolean;
      defaultQuantityPerUse: number;
      unitOfMeasure: string;
      notes: string;
      isActive: boolean;
    }>,
    userId?: string,
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const configObjectId = new Types.ObjectId(configId);

    const config = await this.consumableConfigModel
      .findOneAndUpdate(
        { _id: configObjectId, tenantId: tenantObjectId },
        {
          $set: {
            ...data,
            updatedBy: userId ? new Types.ObjectId(userId) : undefined,
          },
        },
        { new: true },
      )
      .exec();

    if (!config) {
      throw new NotFoundException("Consumable configuration not found");
    }

    this.logger.log(
      `Updated consumable config ${configId} in tenant ${tenantId}`,
    );

    return config;
  }

  /**
   * Get consumable configuration by product ID
   */
  async getConsumableConfigByProduct(tenantId: string, productId: string) {
    const productObjectId = new Types.ObjectId(productId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    const config = await this.consumableConfigModel
      .findOne({ productId: productObjectId, tenantId: tenantObjectId })
      .populate("productId")
      .lean()
      .exec();

    return config;
  }

  /**
   * List all consumable configurations
   */
  async listConsumableConfigs(
    tenantId: string,
    filters?: {
      consumableType?: string;
      isActive?: boolean;
      isAutoDeducted?: boolean;
    },
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const query: any = { tenantId: tenantObjectId };

    if (filters?.consumableType) {
      query.consumableType = filters.consumableType;
    }
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters?.isAutoDeducted !== undefined) {
      query.isAutoDeducted = filters.isAutoDeducted;
    }

    const configs = await this.consumableConfigModel
      .find(query)
      .populate("productId")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return configs;
  }

  /**
   * Create a relation between a product and a consumable
   */
  async createProductConsumableRelation(
    tenantId: string,
    data: {
      productId: string;
      consumableId: string;
      quantityRequired: number;
      isRequired?: boolean;
      isAutoDeducted?: boolean;
      applicableContext?: string;
      notes?: string;
    },
    userId?: string,
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const productObjectId = new Types.ObjectId(data.productId);
    const consumableObjectId = new Types.ObjectId(data.consumableId);

    // Verify both products exist
    const [product, consumable] = await Promise.all([
      this.productModel
        .findOne({ _id: productObjectId, tenantId: tenantObjectId })
        .lean()
        .exec(),
      this.productModel
        .findOne({ _id: consumableObjectId, tenantId: tenantObjectId })
        .lean()
        .exec(),
    ]);

    if (!product) {
      throw new NotFoundException("Product not found");
    }
    if (!consumable) {
      throw new NotFoundException("Consumable product not found");
    }

    // Verify consumable has configuration
    const consumableConfig = await this.consumableConfigModel
      .findOne({ productId: consumableObjectId, tenantId: tenantObjectId })
      .lean()
      .exec();

    if (!consumableConfig) {
      throw new BadRequestException(
        "Consumable product must have a consumable configuration",
      );
    }

    // Check if relation already exists
    const existingRelation = await this.consumableRelationModel
      .findOne({
        productId: productObjectId,
        consumableId: consumableObjectId,
        tenantId: tenantObjectId,
      })
      .lean()
      .exec();

    if (existingRelation) {
      throw new BadRequestException(
        "Relation between product and consumable already exists",
      );
    }

    const relation = await this.consumableRelationModel.create({
      tenantId: tenantObjectId,
      productId: productObjectId,
      consumableId: consumableObjectId,
      quantityRequired: data.quantityRequired,
      isRequired: data.isRequired ?? true,
      isAutoDeducted: data.isAutoDeducted ?? true,
      applicableContext: data.applicableContext || "always",
      notes: data.notes,
      isActive: true,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    this.logger.log(
      `Created relation: product ${data.productId} requires ${data.quantityRequired}x consumable ${data.consumableId}`,
    );

    return relation;
  }

  /**
   * Get all consumables for a product
   */
  async getProductConsumables(tenantId: string, productId: string) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const productObjectId = new Types.ObjectId(productId);

    const relations = await this.consumableRelationModel
      .find({
        productId: productObjectId,
        tenantId: tenantObjectId,
        isActive: true,
      })
      .populate("consumableId")
      .sort({ priority: 1 })
      .lean()
      .exec();

    return relations;
  }

  /**
   * Update a product-consumable relation
   */
  async updateProductConsumableRelation(
    tenantId: string,
    relationId: string,
    data: Partial<{
      quantityRequired: number;
      isRequired: boolean;
      isAutoDeducted: boolean;
      priority: number;
      applicableContext: string;
      notes: string;
      isActive: boolean;
    }>,
    userId?: string,
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const relationObjectId = new Types.ObjectId(relationId);

    const relation = await this.consumableRelationModel
      .findOneAndUpdate(
        { _id: relationObjectId, tenantId: tenantObjectId },
        {
          $set: {
            ...data,
            updatedBy: userId ? new Types.ObjectId(userId) : undefined,
          },
        },
        { new: true },
      )
      .populate("productId")
      .populate("consumableId")
      .exec();

    if (!relation) {
      throw new NotFoundException("Product-consumable relation not found");
    }

    this.logger.log(
      `Updated product-consumable relation ${relationId} in tenant ${tenantId}`,
    );

    return relation;
  }

  /**
   * Delete a product-consumable relation
   */
  async deleteProductConsumableRelation(tenantId: string, relationId: string) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const relationObjectId = new Types.ObjectId(relationId);

    const relation = await this.consumableRelationModel
      .findOneAndDelete({ _id: relationObjectId, tenantId: tenantObjectId })
      .exec();

    if (!relation) {
      throw new NotFoundException("Product-consumable relation not found");
    }

    this.logger.log(
      `Deleted product-consumable relation ${relationId} in tenant ${tenantId}`,
    );

    return { success: true, message: "Relation deleted successfully" };
  }

  /**
   * Get all products that use a specific consumable
   */
  async getProductsUsingConsumable(tenantId: string, consumableId: string) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const consumableObjectId = new Types.ObjectId(consumableId);

    const relations = await this.consumableRelationModel
      .find({
        consumableId: consumableObjectId,
        tenantId: tenantObjectId,
        isActive: true,
      })
      .populate("productId")
      .lean()
      .exec();

    return relations;
  }
}
