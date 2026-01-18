import { PricingService, BulkUpdateCriteria, BulkPriceOperation } from "./pricing.service";
import { Types } from "mongoose";

describe("PricingService", () => {
  let service: PricingService;
  let productModel: any;
  let auditLogModel: any;
  let inventoryModel: any;
  let purchasesService: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  const buildModel = () => {
    const model: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() }),
    }));
    model.find = jest.fn();
    model.findOne = jest.fn();
    model.findById = jest.fn();
    model.countDocuments = jest.fn();
    model.aggregate = jest.fn();
    model.create = jest.fn();
    model.exec = jest.fn();
    return model;
  };

  const createMockProduct = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    name: "Test Product",
    tenantId: new Types.ObjectId(tenantId),
    isActive: true,
    category: "alimentos",
    variants: [
      {
        _id: new Types.ObjectId(),
        sku: "SKU-001",
        name: "Default",
        basePrice: 100,
        costPrice: 70,
      },
    ],
    suppliers: [
      {
        supplierId: new Types.ObjectId(),
        supplierName: "Proveedor 1",
        paymentCurrency: "USD_PARALELO",
        preferredPaymentMethod: "zelle",
        usesParallelRate: true,
      },
    ],
    save: jest.fn().mockResolvedValue({}),
    hasActivePromotion: false,
    promotion: null as any,
    ...overrides,
  });

  beforeEach(() => {
    productModel = buildModel();
    auditLogModel = buildModel();
    inventoryModel = buildModel();
    purchasesService = {
      findProductIdsByPaymentMethod: jest.fn().mockResolvedValue([]),
    };

    service = new PricingService(
      productModel as any,
      auditLogModel as any,
      inventoryModel as any,
      purchasesService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // === BASIC PRICING TESTS ===
  // ============================================================

  describe("calculateMargin", () => {
    it("should calculate correct margin percentage", () => {
      const margin = service.calculateMargin(70, 100);
      expect(margin).toBe(30); // (100 - 70) / 100 * 100 = 30%
    });

    it("should return 0 when costPrice is 0", () => {
      const margin = service.calculateMargin(0, 100);
      expect(margin).toBe(0);
    });

    it("should handle high margins correctly", () => {
      const margin = service.calculateMargin(10, 100);
      expect(margin).toBe(90); // 90% margin
    });
  });

  describe("applyPricingRules", () => {
    it("should apply minimum margin rule", () => {
      const result = service.applyPricingRules(100, { minimumMargin: 0.3 });
      // 100 / (1 - 0.3) = 142.86
      expect(result).toBeGreaterThan(100);
    });

    it("should apply maximum discount rule", () => {
      const result = service.applyPricingRules(100, { maximumDiscount: 0.2 });
      // 100 * (1 - 0.2) = 80
      expect(result).toBeGreaterThanOrEqual(80);
    });

    it("should return base price when no rules apply", () => {
      const result = service.applyPricingRules(100, {});
      expect(result).toBe(100);
    });
  });

  describe("getExchangeRate", () => {
    it("should return a valid exchange rate", async () => {
      const rate = await service.getExchangeRate();
      expect(rate).toBe(36.5);
    });
  });

  // ============================================================
  // === BULK PRICING ENGINE TESTS ===
  // ============================================================

  describe("previewBulkUpdate", () => {
    it("should generate price previews for products matching criteria", async () => {
      const products = [createMockProduct()];
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(1);

      const criteria: BulkUpdateCriteria = {
        category: "alimentos",
        status: "active",
      };

      const operation: BulkPriceOperation = {
        type: "percentage_increase",
        payload: { percentage: 10 },
      };

      const previews = await service.previewBulkUpdate(tenantId, criteria, operation);

      expect(previews.length).toBeGreaterThan(0);
      expect(previews[0].currentPrice).toBe(100);
      // newPrice uses Math.ceil(), so 100 * 1.1 = 110 (or 111 due to floating point)
      expect(previews[0].newPrice).toBeGreaterThanOrEqual(110);
      expect(previews[0].newPrice).toBeLessThanOrEqual(111);
    });

    it("should preview supplier_rate_adjustment operation", async () => {
      const products = [createMockProduct()];
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(1);

      const criteria: BulkUpdateCriteria = {
        supplierPaymentCurrency: "USD_PARALELO",
      };

      const operation: BulkPriceOperation = {
        type: "supplier_rate_adjustment",
        payload: {
          oldRate: 50,
          newRate: 55,
          preserveMargin: true,
        },
      };

      const previews = await service.previewBulkUpdate(tenantId, criteria, operation);

      expect(previews.length).toBeGreaterThan(0);
      // New price should be adjusted by factor 55/50 = 1.1
      expect(previews[0].newPrice).toBeGreaterThan(previews[0].currentPrice);
    });

    it("should handle inflation_formula operation with error for zero cost", async () => {
      const products = [
        createMockProduct({
          variants: [
            {
              _id: new Types.ObjectId(),
              sku: "SKU-NOCOST",
              name: "No Cost",
              basePrice: 100,
              costPrice: 0, // Zero cost
            },
          ],
        }),
      ];
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(1);

      const criteria: BulkUpdateCriteria = {};
      const operation: BulkPriceOperation = {
        type: "inflation_formula",
        payload: {
          parallelRate: 55,
          bcvRate: 50,
          targetMargin: 0.3,
        },
      };

      const previews = await service.previewBulkUpdate(tenantId, criteria, operation);

      expect(previews[0].hasError).toBe(true);
      expect(previews[0].errorMessage).toBe("Sin Costo de Referencia");
    });
  });

  describe("executeBulkUpdate", () => {
    it("should execute bulk price update and create audit log", async () => {
      const products = [createMockProduct()];
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(1);
      auditLogModel.create.mockResolvedValue({});

      const criteria: BulkUpdateCriteria = {
        category: "alimentos",
      };

      const operation: BulkPriceOperation = {
        type: "percentage_increase",
        payload: { percentage: 5 },
      };

      const result = await service.executeBulkUpdate(
        tenantId,
        userId,
        criteria,
        operation,
      );

      expect(result.updatedCount).toBeGreaterThan(0);
      expect(products[0].save).toHaveBeenCalled();
      expect(auditLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "bulk_price_update",
          entity: "product",
        }),
      );
    });

    it("should execute promotion operation correctly", async () => {
      const products = [createMockProduct()];
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(1);
      auditLogModel.create.mockResolvedValue({});

      const operation: BulkPriceOperation = {
        type: "promotion",
        payload: {
          discountPercentage: 15,
          durationDays: 7,
        },
      };

      const result = await service.executeBulkUpdate(
        tenantId,
        userId,
        {},
        operation,
      );

      expect(result.updatedCount).toBeGreaterThan(0);
      expect(products[0].hasActivePromotion).toBe(true);
      expect(products[0].promotion.discountPercentage).toBe(15);
    });
  });

  // ============================================================
  // === CRITERIA FILTERING TESTS ===
  // ============================================================

  describe("findProductsByCriteria (via previewBulkUpdate)", () => {
    beforeEach(() => {
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });
      productModel.countDocuments.mockResolvedValue(0);
    });

    it("should filter by category", async () => {
      await service.previewBulkUpdate(
        tenantId,
        { category: "bebidas" },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "bebidas",
        }),
      );
    });

    it("should filter by supplier ID", async () => {
      const supplierId = new Types.ObjectId().toString();

      await service.previewBulkUpdate(
        tenantId,
        { supplierId },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "suppliers.supplierId": expect.any(Types.ObjectId),
        }),
      );
    });

    it("should filter by multiple supplier IDs", async () => {
      const supplierIds = [
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ];

      await service.previewBulkUpdate(
        tenantId,
        { supplierIds },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "suppliers.supplierId": { $in: expect.any(Array) },
        }),
      );
    });

    it("should filter by supplierPaymentCurrency", async () => {
      await service.previewBulkUpdate(
        tenantId,
        { supplierPaymentCurrency: "USD_PARALELO" },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "suppliers.paymentCurrency": "USD_PARALELO",
        }),
      );
    });

    it("should filter by supplierPaymentMethod with $or", async () => {
      await service.previewBulkUpdate(
        tenantId,
        { supplierPaymentMethod: "zelle" },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { "suppliers.preferredPaymentMethod": "zelle" },
            { "suppliers.acceptedPaymentMethods": "zelle" },
          ],
        }),
      );
    });

    it("should filter by usesParallelRate", async () => {
      await service.previewBulkUpdate(
        tenantId,
        { usesParallelRate: true },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "suppliers.usesParallelRate": true,
        }),
      );
    });

    it("should filter by status active", async () => {
      await service.previewBulkUpdate(
        tenantId,
        { status: "active" },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        }),
      );
    });

    it("should filter by status inactive", async () => {
      await service.previewBulkUpdate(
        tenantId,
        { status: "inactive" },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      );
    });

    it("should filter by specific product IDs", async () => {
      const ids = [
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ];

      await service.previewBulkUpdate(
        tenantId,
        { ids },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $in: expect.any(Array) },
        }),
      );
    });
  });

  // ============================================================
  // === PRICE CALCULATION TESTS ===
  // ============================================================

  describe("Price Calculation Logic", () => {
    it("should calculate inflation_formula correctly", async () => {
      const products = [
        createMockProduct({
          variants: [
            {
              _id: new Types.ObjectId(),
              sku: "SKU-001",
              basePrice: 100,
              costPrice: 10, // USD cost
            },
          ],
        }),
      ];
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(1);

      const operation: BulkPriceOperation = {
        type: "inflation_formula",
        payload: {
          parallelRate: 55,
          bcvRate: 50,
          targetMargin: 0.3, // 30% margin
        },
      };

      const previews = await service.previewBulkUpdate(tenantId, {}, operation);

      // Formula: (CostUSD * Par / BCV) * (1 + Margin) * BCV
      // (10 * 55 / 50) * (1.3) * 50 = 11 * 1.3 * 50 = 715
      const expectedPrice = Math.ceil(10 * (55 / 50) * 1.3 * 50);
      expect(previews[0].newPrice).toBe(expectedPrice);
    });

    it("should calculate margin_update correctly", async () => {
      const products = [
        createMockProduct({
          variants: [
            {
              _id: new Types.ObjectId(),
              sku: "SKU-001",
              basePrice: 100,
              costPrice: 50,
            },
          ],
        }),
      ];
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(1);

      const operation: BulkPriceOperation = {
        type: "margin_update",
        payload: { targetMargin: 0.5 }, // 50% margin
      };

      const previews = await service.previewBulkUpdate(tenantId, {}, operation);

      // 50 * (1 + 0.5) = 75
      expect(previews[0].newPrice).toBe(75);
    });

    it("should calculate supplier_rate_adjustment correctly", async () => {
      const products = [
        createMockProduct({
          variants: [
            {
              _id: new Types.ObjectId(),
              sku: "SKU-001",
              basePrice: 100,
              costPrice: 60, // 40% margin
            },
          ],
        }),
      ];
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(1);

      const operation: BulkPriceOperation = {
        type: "supplier_rate_adjustment",
        payload: {
          oldRate: 50,
          newRate: 60, // 20% increase in rate
          preserveMargin: false,
        },
      };

      const previews = await service.previewBulkUpdate(tenantId, {}, operation);

      // Direct adjustment: 100 * (60/50) = 120
      expect(previews[0].newPrice).toBe(120);
    });

    it("should calculate supplier_rate_adjustment preserving margin", async () => {
      const products = [
        createMockProduct({
          variants: [
            {
              _id: new Types.ObjectId(),
              sku: "SKU-001",
              basePrice: 100,
              costPrice: 60, // Current margin = (100-60)/100 = 40%
            },
          ],
        }),
      ];
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(1);

      const operation: BulkPriceOperation = {
        type: "supplier_rate_adjustment",
        payload: {
          oldRate: 50,
          newRate: 55, // 10% increase in rate
          preserveMargin: true,
        },
      };

      const previews = await service.previewBulkUpdate(tenantId, {}, operation);

      // New cost = 60 * (55/50) = 66
      // Margin was 40% -> new price = 66 / (1 - 0.4) = 110
      expect(previews[0].newPrice).toBe(110);
    });

    it("should handle supplier_rate_adjustment with invalid rates", async () => {
      const products = [createMockProduct()];
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(1);

      const operation: BulkPriceOperation = {
        type: "supplier_rate_adjustment",
        payload: {
          oldRate: 0, // Invalid
          newRate: 55,
        },
      };

      const previews = await service.previewBulkUpdate(tenantId, {}, operation);

      expect(previews[0].hasError).toBe(true);
      expect(previews[0].errorMessage).toBe("Tasas inválidas");
    });
  });

  // ============================================================
  // === INVENTORY FILTER TESTS ===
  // ============================================================

  describe("Inventory-based Filtering", () => {
    it("should filter by low stock level", async () => {
      inventoryModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { productId: new Types.ObjectId() },
        ]),
      });
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });
      productModel.countDocuments.mockResolvedValue(0);

      await service.previewBulkUpdate(
        tenantId,
        { stockLevel: "low" },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(inventoryModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "alerts.lowStock": true,
        }),
      );
    });

    it("should filter by high velocity", async () => {
      inventoryModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      productModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });
      productModel.countDocuments.mockResolvedValue(0);

      await service.previewBulkUpdate(
        tenantId,
        { velocity: "high" },
        { type: "percentage_increase", payload: { percentage: 5 } },
      );

      expect(inventoryModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "metrics.turnoverRate": { $gte: 2.0 },
        }),
      );
    });
  });
});
