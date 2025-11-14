import { Types } from "mongoose";
import { SuppliesService } from "./supplies.service";
import { ProductType } from "../../schemas/product.schema";

describe("SuppliesService", () => {
  let service: SuppliesService;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const productId = new Types.ObjectId().toString();
  const supplyId = new Types.ObjectId().toString();

  // Mock models
  const productDoc = {
    _id: new Types.ObjectId(productId),
    tenantId,
    name: "Test Supply Product",
    sku: "SUP-001",
    productType: ProductType.SIMPLE,
  };

  const supplyConfigDoc = {
    _id: new Types.ObjectId(),
    productId: new Types.ObjectId(productId),
    tenantId,
    supplyCategory: "cleaning",
    supplySubcategory: "detergent",
    requiresTracking: true,
    requiresAuthorization: false,
    unitOfMeasure: "litro",
    isActive: true,
    createdBy: new Types.ObjectId(userId),
  };

  const consumptionLogDoc = {
    _id: new Types.ObjectId(),
    supplyId: new Types.ObjectId(supplyId),
    tenantId,
    quantityConsumed: 2,
    unitOfMeasure: "litro",
    consumptionType: "manual",
    department: "kitchen",
    consumedBy: "user@example.com",
    consumedAt: new Date(),
  };

  const supplyConfigModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const consumptionLogModel = {
    create: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
  };

  const productModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new SuppliesService(
      supplyConfigModel as any,
      consumptionLogModel as any,
      productModel as any,
    );
  });

  describe("createSupplyConfig", () => {
    it("should create a supply configuration successfully", async () => {
      const data = {
        supplyCategory: "cleaning",
        supplySubcategory: "detergent",
        requiresTracking: true,
        unitOfMeasure: "litro",
        safetyInfo: {
          requiresPPE: true,
          isHazardous: false,
        },
      };

      productModel.findOne.mockResolvedValue(productDoc);
      supplyConfigModel.create.mockResolvedValue(supplyConfigDoc);
      productModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.createSupplyConfig(
        tenantId,
        productId,
        data,
        userId,
      );

      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: productId,
        tenantId,
      });
      expect(supplyConfigModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          tenantId,
          supplyCategory: data.supplyCategory,
          supplySubcategory: data.supplySubcategory,
          createdBy: userId,
        }),
      );
      expect(productModel.updateOne).toHaveBeenCalledWith(
        { _id: productId, tenantId },
        expect.objectContaining({
          $set: expect.objectContaining({
            productType: ProductType.SUPPLY,
          }),
        }),
      );
      expect(result).toEqual(supplyConfigDoc);
    });

    it("should throw error if product not found", async () => {
      productModel.findOne.mockResolvedValue(null);

      await expect(
        service.createSupplyConfig(tenantId, productId, {} as any, userId),
      ).rejects.toThrow("Product not found");

      expect(supplyConfigModel.create).not.toHaveBeenCalled();
    });

    it("should throw error if config already exists", async () => {
      productModel.findOne.mockResolvedValue(productDoc);
      supplyConfigModel.findOne.mockResolvedValue(supplyConfigDoc);

      const data = {
        supplyCategory: "cleaning",
        supplySubcategory: "detergent",
        unitOfMeasure: "litro",
      };

      await expect(
        service.createSupplyConfig(tenantId, productId, data, userId),
      ).rejects.toThrow("Supply config already exists for this product");

      expect(supplyConfigModel.create).not.toHaveBeenCalled();
    });

    it("should handle safety info correctly", async () => {
      const data = {
        supplyCategory: "cleaning",
        supplySubcategory: "bleach",
        unitOfMeasure: "litro",
        safetyInfo: {
          requiresPPE: true,
          isHazardous: true,
          storageRequirements: "Keep in cool, dry place",
          handlingInstructions: "Use protective gloves",
        },
      };

      productModel.findOne.mockResolvedValue(productDoc);
      supplyConfigModel.create.mockResolvedValue({
        ...supplyConfigDoc,
        safetyInfo: data.safetyInfo,
      });
      productModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await service.createSupplyConfig(tenantId, productId, data, userId);

      expect(supplyConfigModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          safetyInfo: data.safetyInfo,
        }),
      );
    });
  });

  describe("updateSupplyConfig", () => {
    it("should update a supply configuration successfully", async () => {
      const configId = new Types.ObjectId().toString();
      const updateData = {
        estimatedMonthlyConsumption: 10,
        usageDepartment: "kitchen",
        notes: "Updated notes",
      };

      const updatedConfig = { ...supplyConfigDoc, ...updateData };
      supplyConfigModel.findByIdAndUpdate.mockResolvedValue(updatedConfig);

      const result = await service.updateSupplyConfig(
        tenantId,
        configId,
        updateData,
        userId,
      );

      expect(supplyConfigModel.findByIdAndUpdate).toHaveBeenCalledWith(
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
      supplyConfigModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateSupplyConfig(tenantId, configId, {}, userId),
      ).rejects.toThrow("Supply config not found");
    });
  });

  describe("getSupplyConfigByProduct", () => {
    it("should retrieve config by product ID", async () => {
      supplyConfigModel.findOne.mockResolvedValue(supplyConfigDoc);

      const result = await service.getSupplyConfigByProduct(
        tenantId,
        productId,
      );

      expect(supplyConfigModel.findOne).toHaveBeenCalledWith({
        productId,
        tenantId,
      });
      expect(result).toEqual(supplyConfigDoc);
    });

    it("should return null if config not found", async () => {
      supplyConfigModel.findOne.mockResolvedValue(null);

      const result = await service.getSupplyConfigByProduct(
        tenantId,
        productId,
      );

      expect(result).toBeNull();
    });
  });

  describe("listSupplyConfigs", () => {
    it("should list all supply configs", async () => {
      const configs = [supplyConfigDoc];
      supplyConfigModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(configs),
      });

      const result = await service.listSupplyConfigs(tenantId, {});

      expect(supplyConfigModel.find).toHaveBeenCalledWith({ tenantId });
      expect(result).toEqual(configs);
    });

    it("should filter by supplyCategory", async () => {
      const configs = [supplyConfigDoc];
      supplyConfigModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(configs),
      });

      await service.listSupplyConfigs(tenantId, {
        supplyCategory: "cleaning",
      });

      expect(supplyConfigModel.find).toHaveBeenCalledWith({
        tenantId,
        supplyCategory: "cleaning",
      });
    });

    it("should filter by isActive status", async () => {
      supplyConfigModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.listSupplyConfigs(tenantId, { isActive: true });

      expect(supplyConfigModel.find).toHaveBeenCalledWith({
        tenantId,
        isActive: true,
      });
    });
  });

  describe("logConsumption", () => {
    it("should log supply consumption successfully", async () => {
      const data = {
        supplyId,
        quantityConsumed: 2,
        unitOfMeasure: "litro",
        consumptionType: "manual" as const,
        department: "kitchen",
        consumedBy: "user@example.com",
        reason: "Daily cleaning",
      };

      consumptionLogModel.create.mockResolvedValue(consumptionLogDoc);

      const result = await service.logConsumption(tenantId, data, userId);

      expect(consumptionLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplyId,
          tenantId,
          quantityConsumed: data.quantityConsumed,
          consumptionType: data.consumptionType,
          department: data.department,
          createdBy: userId,
        }),
      );
      expect(result).toEqual(consumptionLogDoc);
    });

    it("should handle cost information", async () => {
      const data = {
        supplyId,
        quantityConsumed: 2,
        unitOfMeasure: "litro",
        consumptionType: "manual" as const,
        costInfo: {
          unitCost: 10,
          totalCost: 20,
          currency: "USD",
        },
      };

      consumptionLogModel.create.mockResolvedValue({
        ...consumptionLogDoc,
        costInfo: data.costInfo,
      });

      await service.logConsumption(tenantId, data, userId);

      expect(consumptionLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          costInfo: data.costInfo,
        }),
      );
    });

    it("should handle different consumption types", async () => {
      const types = ["manual", "automatic", "scheduled"] as const;

      for (const type of types) {
        consumptionLogModel.create.mockClear();
        consumptionLogModel.create.mockResolvedValue({
          ...consumptionLogDoc,
          consumptionType: type,
        });

        await service.logConsumption(
          tenantId,
          {
            supplyId,
            quantityConsumed: 1,
            unitOfMeasure: "unidad",
            consumptionType: type,
          },
          userId,
        );

        expect(consumptionLogModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            consumptionType: type,
          }),
        );
      }
    });
  });

  describe("getConsumptionLogs", () => {
    it("should retrieve consumption logs for a supply", async () => {
      const logs = [consumptionLogDoc];
      consumptionLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(logs),
      });

      const result = await service.getSupplyConsumptionLogs(
        tenantId,
        supplyId,
        {},
      );

      expect(consumptionLogModel.find).toHaveBeenCalledWith({
        supplyId,
        tenantId,
      });
      expect(result).toEqual(logs);
    });

    it("should filter by date range", async () => {
      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      consumptionLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.getSupplyConsumptionLogs(tenantId, supplyId, {
        startDate,
        endDate,
      });

      expect(consumptionLogModel.find).toHaveBeenCalledWith({
        supplyId,
        tenantId,
        consumedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });
    });

    it("should return empty array if no logs found", async () => {
      consumptionLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getSupplyConsumptionLogs(
        tenantId,
        supplyId,
        {},
      );

      expect(result).toEqual([]);
    });
  });

  describe("getConsumptionReportByDepartment", () => {
    it("should generate report grouped by department", async () => {
      const reportData = [
        {
          _id: "kitchen",
          totalQuantity: 10,
          totalCost: 100,
          count: 5,
        },
        {
          _id: "warehouse",
          totalQuantity: 5,
          totalCost: 50,
          count: 2,
        },
      ];

      consumptionLogModel.aggregate.mockResolvedValue(reportData);

      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      const result = await service.getConsumptionReportByDepartment(
        tenantId,
        startDate,
        endDate,
      );

      expect(consumptionLogModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: { tenantId } }),
          expect.objectContaining({ $group: expect.any(Object) }),
        ]),
      );
      expect(result).toEqual(reportData);
    });

    it("should filter report by date range", async () => {
      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      consumptionLogModel.aggregate.mockResolvedValue([]);

      await service.getConsumptionReportByDepartment(
        tenantId,
        startDate,
        endDate,
      );

      expect(consumptionLogModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              tenantId,
              consumedAt: { $gte: startDate, $lte: endDate },
            }),
          }),
        ]),
      );
    });
  });

  describe("getConsumptionReportBySupply", () => {
    it("should generate report grouped by supply", async () => {
      const reportData = [
        {
          _id: new Types.ObjectId(),
          totalQuantity: 15,
          totalCost: 150,
          count: 8,
        },
      ];

      consumptionLogModel.aggregate.mockResolvedValue(reportData);

      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      const result = await service.getConsumptionReportBySupply(
        tenantId,
        startDate,
        endDate,
      );

      expect(consumptionLogModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: { tenantId } }),
          expect.objectContaining({ $group: expect.any(Object) }),
        ]),
      );
      expect(result).toEqual(reportData);
    });

    it("should return empty report if no consumption", async () => {
      consumptionLogModel.aggregate.mockResolvedValue([]);

      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      const result = await service.getConsumptionReportBySupply(
        tenantId,
        startDate,
        endDate,
      );

      expect(result).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle invalid ObjectId gracefully", async () => {
      const invalidId = "invalid-id";

      await expect(
        service.getSupplyConfigByProduct(tenantId, invalidId),
      ).rejects.toThrow();
    });

    it("should preserve tenantId isolation in queries", async () => {
      const otherTenantId = new Types.ObjectId().toString();
      supplyConfigModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.listSupplyConfigs(otherTenantId, {});

      expect(supplyConfigModel.find).toHaveBeenCalledWith({
        tenantId: otherTenantId,
      });
      expect(supplyConfigModel.find).not.toHaveBeenCalledWith({
        tenantId,
      });
    });

    it("should handle negative consumption quantities", async () => {
      const data = {
        supplyId,
        quantityConsumed: -5,
        unitOfMeasure: "litro",
        consumptionType: "manual" as const,
      };

      // Service should validate or throw error for negative values
      await expect(
        service.logConsumption(tenantId, data, userId),
      ).rejects.toThrow();
    });

    it("should handle zero consumption", async () => {
      const data = {
        supplyId,
        quantityConsumed: 0,
        unitOfMeasure: "litro",
        consumptionType: "manual" as const,
      };

      consumptionLogModel.create.mockResolvedValue({
        ...consumptionLogDoc,
        quantityConsumed: 0,
      });

      const result = await service.logConsumption(tenantId, data, userId);

      expect(result.quantityConsumed).toBe(0);
    });
  });

  describe("Performance Tests", () => {
    it("should handle large consumption log queries efficiently", async () => {
      const largeLogs = Array.from({ length: 1000 }, (_, i) => ({
        ...consumptionLogDoc,
        _id: new Types.ObjectId(),
      }));

      consumptionLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(largeLogs),
      });

      const startTime = Date.now();
      const result = await service.getSupplyConsumptionLogs(
        tenantId,
        supplyId,
        {},
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(result).toHaveLength(1000);
    });

    it("should handle complex aggregation reports", async () => {
      consumptionLogModel.aggregate.mockResolvedValue([
        { _id: "dept1", totalQuantity: 100, totalCost: 1000, count: 50 },
        { _id: "dept2", totalQuantity: 200, totalCost: 2000, count: 100 },
      ]);

      const startTime = Date.now();
      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");
      await service.getConsumptionReportByDepartment(
        tenantId,
        startDate,
        endDate,
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
