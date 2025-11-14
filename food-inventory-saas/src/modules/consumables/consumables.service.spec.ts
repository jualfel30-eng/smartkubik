import { Types } from "mongoose";
import { ConsumablesService } from "./consumables.service";
import { ProductType } from "../../schemas/product.schema";

describe("ConsumablesService", () => {
  let service: ConsumablesService;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const productId = new Types.ObjectId().toString();
  const consumableId = new Types.ObjectId().toString();

  // Mock models
  const productDoc = {
    _id: new Types.ObjectId(productId),
    tenantId,
    name: "Test Product",
    sku: "SKU-001",
    productType: ProductType.SIMPLE,
  };

  const consumableConfigDoc = {
    _id: new Types.ObjectId(),
    productId: new Types.ObjectId(productId),
    tenantId,
    consumableType: "container",
    isReusable: false,
    isAutoDeducted: true,
    defaultQuantityPerUse: 1,
    unitOfMeasure: "unidad",
    isActive: true,
    createdBy: new Types.ObjectId(userId),
  };

  const relationDoc = {
    _id: new Types.ObjectId(),
    productId: new Types.ObjectId(productId),
    consumableId: new Types.ObjectId(consumableId),
    tenantId,
    quantityRequired: 2,
    isRequired: true,
    isAutoDeducted: true,
    priority: 1,
    applicableContext: "always",
    isActive: true,
  };

  // Helper to create chainable query mock
  const createQueryMock = (returnValue: any) => ({
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(returnValue),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  });

  const consumableConfigModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const relationModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  const productModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ConsumablesService(
      consumableConfigModel as any,
      relationModel as any,
      productModel as any,
    );
  });

  describe("createConsumableConfig", () => {
    it("should create a consumable configuration successfully", async () => {
      const data = {
        consumableType: "container",
        isAutoDeducted: true,
        defaultQuantityPerUse: 1,
        unitOfMeasure: "unidad",
        isActive: true,
      };

      productModel.findOne.mockReturnValue(createQueryMock(productDoc));
      consumableConfigModel.create.mockResolvedValue(consumableConfigDoc);
      productModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.createConsumableConfig(
        tenantId,
        productId,
        data,
        userId,
      );

      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: productId,
        tenantId,
      });
      expect(consumableConfigModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          tenantId,
          consumableType: data.consumableType,
          isAutoDeducted: data.isAutoDeducted,
          createdBy: userId,
        }),
      );
      expect(productModel.updateOne).toHaveBeenCalledWith(
        { _id: productId, tenantId },
        expect.objectContaining({
          $set: expect.objectContaining({
            productType: ProductType.CONSUMABLE,
          }),
        }),
      );
      expect(result).toEqual(consumableConfigDoc);
    });

    it("should throw error if product not found", async () => {
      productModel.findOne.mockResolvedValue(null);

      await expect(
        service.createConsumableConfig(tenantId, productId, {} as any, userId),
      ).rejects.toThrow("Product not found");

      expect(consumableConfigModel.create).not.toHaveBeenCalled();
    });

    it("should throw error if config already exists", async () => {
      productModel.findOne.mockResolvedValue(productDoc);
      consumableConfigModel.findOne.mockResolvedValue(consumableConfigDoc);

      const data = {
        consumableType: "container",
        isAutoDeducted: true,
        defaultQuantityPerUse: 1,
        unitOfMeasure: "unidad",
        isActive: true,
      };

      await expect(
        service.createConsumableConfig(tenantId, productId, data, userId),
      ).rejects.toThrow("Consumable config already exists for this product");

      expect(consumableConfigModel.create).not.toHaveBeenCalled();
    });
  });

  describe("updateConsumableConfig", () => {
    it("should update a consumable configuration successfully", async () => {
      const configId = new Types.ObjectId().toString();
      const updateData = {
        defaultQuantityPerUse: 2,
        unitOfMeasure: "pieza",
        notes: "Updated notes",
      };

      const updatedConfig = { ...consumableConfigDoc, ...updateData };
      consumableConfigModel.findByIdAndUpdate.mockResolvedValue(updatedConfig);

      const result = await service.updateConsumableConfig(
        tenantId,
        configId,
        updateData,
        userId,
      );

      expect(consumableConfigModel.findByIdAndUpdate).toHaveBeenCalledWith(
        configId,
        expect.objectContaining({
          $set: expect.objectContaining({
            ...updateData,
            updatedBy: userId,
          }),
        }),
        { new: true },
      );
      expect(result).toEqual(updatedConfig);
    });

    it("should throw error if config not found", async () => {
      const configId = new Types.ObjectId().toString();
      consumableConfigModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateConsumableConfig(tenantId, configId, {}, userId),
      ).rejects.toThrow("Consumable config not found");
    });
  });

  describe("getConsumableConfigByProduct", () => {
    it("should retrieve config by product ID", async () => {
      consumableConfigModel.findOne.mockResolvedValue(consumableConfigDoc);

      const result = await service.getConsumableConfigByProduct(
        tenantId,
        productId,
      );

      expect(consumableConfigModel.findOne).toHaveBeenCalledWith({
        productId,
        tenantId,
      });
      expect(result).toEqual(consumableConfigDoc);
    });

    it("should return null if config not found", async () => {
      consumableConfigModel.findOne.mockResolvedValue(null);

      const result = await service.getConsumableConfigByProduct(
        tenantId,
        productId,
      );

      expect(result).toBeNull();
    });
  });

  describe("listConsumableConfigs", () => {
    it("should list all consumable configs", async () => {
      const configs = [consumableConfigDoc];
      consumableConfigModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(configs),
      });

      const result = await service.listConsumableConfigs(tenantId, {});

      expect(consumableConfigModel.find).toHaveBeenCalledWith({ tenantId });
      expect(result).toEqual(configs);
    });

    it("should filter by consumableType", async () => {
      const configs = [consumableConfigDoc];
      consumableConfigModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(configs),
      });

      await service.listConsumableConfigs(tenantId, {
        consumableType: "container",
      });

      expect(consumableConfigModel.find).toHaveBeenCalledWith({
        tenantId,
        consumableType: "container",
      });
    });

    it("should filter by isActive status", async () => {
      consumableConfigModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.listConsumableConfigs(tenantId, { isActive: true });

      expect(consumableConfigModel.find).toHaveBeenCalledWith({
        tenantId,
        isActive: true,
      });
    });
  });

  describe("createProductConsumableRelation", () => {
    it("should create a product-consumable relation successfully", async () => {
      const data = {
        productId,
        consumableId,
        quantityRequired: 2,
        isRequired: true,
        isAutoDeducted: true,
        priority: 1,
        applicableContext: "always",
      };

      productModel.findOne
        .mockResolvedValueOnce(productDoc) // product exists
        .mockResolvedValueOnce({ ...productDoc, _id: consumableId }); // consumable exists
      consumableConfigModel.findOne.mockResolvedValue(consumableConfigDoc);
      relationModel.create.mockResolvedValue(relationDoc);

      const result = await service.createProductConsumableRelation(
        tenantId,
        data as any,
        userId,
      );

      expect(productModel.findOne).toHaveBeenCalledTimes(2);
      expect(consumableConfigModel.findOne).toHaveBeenCalledWith({
        productId: consumableId,
        tenantId,
      });
      expect(relationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          consumableId,
          tenantId,
          quantityRequired: 2,
          createdBy: userId,
        }),
      );
      expect(result).toEqual(relationDoc);
    });

    it("should throw error if product not found", async () => {
      productModel.findOne.mockResolvedValue(null);

      await expect(
        service.createProductConsumableRelation(
          tenantId,
          { productId, consumableId } as any,
          userId,
        ),
      ).rejects.toThrow("Product not found");
    });

    it("should throw error if consumable not configured", async () => {
      productModel.findOne.mockResolvedValue(productDoc);
      consumableConfigModel.findOne.mockResolvedValue(null);

      await expect(
        service.createProductConsumableRelation(
          tenantId,
          { productId, consumableId } as any,
          userId,
        ),
      ).rejects.toThrow("is not configured as a consumable");
    });
  });

  describe("getProductConsumables", () => {
    it("should retrieve all consumables for a product", async () => {
      const relations = [relationDoc];
      relationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(relations),
      });

      const result = await service.getProductConsumables(tenantId, productId);

      expect(relationModel.find).toHaveBeenCalledWith({
        productId,
        tenantId,
        isActive: true,
      });
      expect(result).toEqual(relations);
    });

    it("should return empty array if no consumables found", async () => {
      relationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getProductConsumables(tenantId, productId);

      expect(result).toEqual([]);
    });
  });

  describe("getProductsUsingConsumable", () => {
    it("should retrieve all products using a consumable", async () => {
      const relations = [relationDoc];
      relationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(relations),
      });

      const result = await service.getProductsUsingConsumable(
        tenantId,
        consumableId,
      );

      expect(relationModel.find).toHaveBeenCalledWith({
        consumableId,
        tenantId,
        isActive: true,
      });
      expect(result).toEqual(relations);
    });
  });

  describe("updateProductConsumableRelation", () => {
    it("should update a relation successfully", async () => {
      const relationId = new Types.ObjectId().toString();
      const updateData = {
        quantityRequired: 3,
        priority: 2,
      };

      const updatedRelation = { ...relationDoc, ...updateData };
      relationModel.findByIdAndUpdate.mockResolvedValue(updatedRelation);

      const result = await service.updateProductConsumableRelation(
        tenantId,
        relationId,
        updateData,
        userId,
      );

      expect(relationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        relationId,
        expect.objectContaining({
          $set: expect.objectContaining({
            ...updateData,
            updatedBy: userId,
          }),
        }),
        { new: true },
      );
      expect(result).toEqual(updatedRelation);
    });

    it("should throw error if relation not found", async () => {
      const relationId = new Types.ObjectId().toString();
      relationModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateProductConsumableRelation(
          tenantId,
          relationId,
          {},
          userId,
        ),
      ).rejects.toThrow("Relation not found");
    });
  });

  describe("deleteProductConsumableRelation", () => {
    it("should delete a relation successfully", async () => {
      const relationId = new Types.ObjectId().toString();
      relationModel.findOneAndDelete.mockReturnValue(
        createQueryMock(relationDoc),
      );

      await service.deleteProductConsumableRelation(tenantId, relationId);

      expect(relationModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: relationId,
        tenantId,
      });
    });

    it("should throw error if relation not found", async () => {
      const relationId = new Types.ObjectId().toString();
      relationModel.findOneAndDelete.mockReturnValue(createQueryMock(null));

      await expect(
        service.deleteProductConsumableRelation(tenantId, relationId),
      ).rejects.toThrow("Relation not found");
    });
  });

  describe("Edge Cases", () => {
    it("should handle invalid ObjectId gracefully", async () => {
      const invalidId = "invalid-id";

      await expect(
        service.getConsumableConfigByProduct(tenantId, invalidId),
      ).rejects.toThrow();
    });

    it("should handle concurrent config creation", async () => {
      productModel.findOne.mockResolvedValue(productDoc);
      consumableConfigModel.findOne.mockResolvedValue(null);
      consumableConfigModel.create.mockRejectedValue(
        new Error("Duplicate key error"),
      );

      const data = {
        consumableType: "container",
        isAutoDeducted: true,
        defaultQuantityPerUse: 1,
        unitOfMeasure: "unidad",
        isActive: true,
      };

      await expect(
        service.createConsumableConfig(tenantId, productId, data, userId),
      ).rejects.toThrow("Duplicate key error");
    });

    it("should preserve tenantId isolation in queries", async () => {
      const otherTenantId = new Types.ObjectId().toString();
      consumableConfigModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.listConsumableConfigs(otherTenantId, {});

      expect(consumableConfigModel.find).toHaveBeenCalledWith({
        tenantId: otherTenantId,
      });
      expect(consumableConfigModel.find).not.toHaveBeenCalledWith({
        tenantId,
      });
    });
  });
});
