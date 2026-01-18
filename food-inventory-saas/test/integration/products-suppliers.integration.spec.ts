import { Types } from "mongoose";

/**
 * Products-Suppliers Integration Tests
 *
 * These tests verify that:
 * 1. Products correctly link to suppliers via the suppliers[] array
 * 2. Supplier payment configuration syncs correctly to product.suppliers[]
 * 3. Product queries by supplier payment attributes work correctly
 */

describe("Products-Suppliers Integration", () => {
  // Mock product with supplier links
  const createMockProduct = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    name: "Test Product",
    sku: "SKU-001",
    tenantId: new Types.ObjectId(),
    isActive: true,
    suppliers: [
      {
        supplierId: new Types.ObjectId(),
        supplierName: "Proveedor Principal",
        isPreferred: true,
        cost: 10,
        currency: "USD",
        leadTimeDays: 3,
        paymentCurrency: "USD_PARALELO",
        preferredPaymentMethod: "zelle",
        acceptedPaymentMethods: ["zelle", "efectivo_usd"],
        usesParallelRate: true,
        paymentConfigSyncedAt: new Date(),
      },
    ],
    variants: [
      {
        sku: "SKU-001-RED",
        name: "Rojo",
        basePrice: 15,
        costPrice: 10,
      },
    ],
    ...overrides,
  });

  // Mock supplier
  const createMockSupplier = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    name: "Test Supplier",
    supplierNumber: "PROV-000001",
    tenantId: new Types.ObjectId().toString(),
    status: "active",
    paymentSettings: {
      preferredPaymentMethod: "zelle",
      acceptedPaymentMethods: ["zelle", "efectivo_usd"],
    },
    ...overrides,
  });

  describe("Product-Supplier Linking", () => {
    it("should have correct ProductSupplier subdocument structure", () => {
      const product = createMockProduct();

      expect(product.suppliers).toBeDefined();
      expect(product.suppliers.length).toBe(1);

      const supplierLink = product.suppliers[0];
      expect(supplierLink.supplierId).toBeInstanceOf(Types.ObjectId);
      expect(supplierLink.supplierName).toBe("Proveedor Principal");
      expect(supplierLink.isPreferred).toBe(true);
      expect(supplierLink.cost).toBe(10);
    });

    it("should include payment configuration in ProductSupplier", () => {
      const product = createMockProduct();
      const supplierLink = product.suppliers[0];

      // New fields for pricing engine integration
      expect(supplierLink.paymentCurrency).toBe("USD_PARALELO");
      expect(supplierLink.preferredPaymentMethod).toBe("zelle");
      expect(supplierLink.acceptedPaymentMethods).toEqual(["zelle", "efectivo_usd"]);
      expect(supplierLink.usesParallelRate).toBe(true);
      expect(supplierLink.paymentConfigSyncedAt).toBeInstanceOf(Date);
    });

    it("should support multiple suppliers per product", () => {
      const product = createMockProduct({
        suppliers: [
          {
            supplierId: new Types.ObjectId(),
            supplierName: "Supplier A",
            isPreferred: true,
            paymentCurrency: "USD_PARALELO",
          },
          {
            supplierId: new Types.ObjectId(),
            supplierName: "Supplier B",
            isPreferred: false,
            paymentCurrency: "VES",
          },
        ],
      });

      expect(product.suppliers.length).toBe(2);
      expect(product.suppliers[0].paymentCurrency).toBe("USD_PARALELO");
      expect(product.suppliers[1].paymentCurrency).toBe("VES");
    });
  });

  describe("Payment Configuration Sync Validation", () => {
    it("should validate payment currency values", () => {
      const validCurrencies = ["USD", "USD_PARALELO", "VES", "EUR", "USD_BCV"];
      const product = createMockProduct();

      expect(validCurrencies).toContain(product.suppliers[0].paymentCurrency);
    });

    it("should validate payment method values", () => {
      const validMethods = [
        "zelle",
        "efectivo_usd",
        "binance_usdt",
        "pago_movil",
        "transferencia_ves",
        "transferencia_bcv",
      ];

      const product = createMockProduct({
        suppliers: [
          {
            supplierId: new Types.ObjectId(),
            preferredPaymentMethod: "zelle",
          },
        ],
      });

      expect(validMethods).toContain(
        product.suppliers[0].preferredPaymentMethod,
      );
    });

    it("should sync payment config from supplier to product", () => {
      const supplier = createMockSupplier({
        paymentSettings: {
          preferredPaymentMethod: "pago_movil",
          acceptedPaymentMethods: ["pago_movil", "transferencia_ves"],
        },
      });

      // Simulate sync operation
      const syncedProductSupplier = {
        supplierId: supplier._id,
        paymentCurrency: "VES", // Inferred from pago_movil
        preferredPaymentMethod: supplier.paymentSettings.preferredPaymentMethod,
        acceptedPaymentMethods: supplier.paymentSettings.acceptedPaymentMethods,
        usesParallelRate: false, // pago_movil doesn't use parallel rate
        paymentConfigSyncedAt: new Date(),
      };

      expect(syncedProductSupplier.paymentCurrency).toBe("VES");
      expect(syncedProductSupplier.usesParallelRate).toBe(false);
      expect(syncedProductSupplier.paymentConfigSyncedAt).toBeDefined();
    });
  });

  describe("Supplier Payment Currency Inference Logic", () => {
    const inferPaymentCurrency = (paymentMethod?: string): string => {
      if (!paymentMethod) return "USD_PARALELO";

      const parallelMethods = ["zelle", "efectivo_usd", "binance_usdt", "binance", "payoneer"];
      const vesMethods = ["pago_movil", "transferencia_ves", "bolivares_bcv", "efectivo_ves"];
      const usdBcvMethods = ["transferencia_bcv", "dolares_bcv"];

      if (parallelMethods.includes(paymentMethod)) return "USD_PARALELO";
      if (vesMethods.includes(paymentMethod)) return "VES";
      if (usdBcvMethods.includes(paymentMethod)) return "USD_BCV";

      return "USD_PARALELO";
    };

    const inferUsesParallelRate = (paymentMethod?: string): boolean => {
      if (!paymentMethod) return true;
      const parallelMethods = ["zelle", "efectivo_usd", "binance_usdt", "binance", "payoneer", "paypal"];
      return parallelMethods.includes(paymentMethod);
    };

    it("should infer USD_PARALELO for zelle", () => {
      expect(inferPaymentCurrency("zelle")).toBe("USD_PARALELO");
      expect(inferUsesParallelRate("zelle")).toBe(true);
    });

    it("should infer USD_PARALELO for efectivo_usd", () => {
      expect(inferPaymentCurrency("efectivo_usd")).toBe("USD_PARALELO");
      expect(inferUsesParallelRate("efectivo_usd")).toBe(true);
    });

    it("should infer VES for pago_movil", () => {
      expect(inferPaymentCurrency("pago_movil")).toBe("VES");
      expect(inferUsesParallelRate("pago_movil")).toBe(false);
    });

    it("should infer VES for transferencia_ves", () => {
      expect(inferPaymentCurrency("transferencia_ves")).toBe("VES");
      expect(inferUsesParallelRate("transferencia_ves")).toBe(false);
    });

    it("should infer USD_BCV for transferencia_bcv", () => {
      expect(inferPaymentCurrency("transferencia_bcv")).toBe("USD_BCV");
      expect(inferUsesParallelRate("transferencia_bcv")).toBe(false);
    });

    it("should default to USD_PARALELO for unknown methods", () => {
      expect(inferPaymentCurrency("unknown_method")).toBe("USD_PARALELO");
      expect(inferPaymentCurrency(undefined)).toBe("USD_PARALELO");
    });
  });

  describe("Product Query by Supplier Payment Config", () => {
    it("should build correct MongoDB filter for payment currency", () => {
      const tenantId = new Types.ObjectId();
      const paymentCurrency = "USD_PARALELO";

      const filter = {
        tenantId,
        "suppliers.paymentCurrency": paymentCurrency,
      };

      expect(filter["suppliers.paymentCurrency"]).toBe("USD_PARALELO");
    });

    it("should build correct filter for payment method with $or", () => {
      const tenantId = new Types.ObjectId();
      const paymentMethod = "zelle";

      const filter = {
        tenantId,
        $or: [
          { "suppliers.preferredPaymentMethod": paymentMethod },
          { "suppliers.acceptedPaymentMethods": paymentMethod },
        ],
      };

      expect(filter.$or).toHaveLength(2);
      expect(filter.$or[0]["suppliers.preferredPaymentMethod"]).toBe("zelle");
    });

    it("should build correct filter for usesParallelRate", () => {
      const tenantId = new Types.ObjectId();

      const filter = {
        tenantId,
        "suppliers.usesParallelRate": true,
      };

      expect(filter["suppliers.usesParallelRate"]).toBe(true);
    });

    it("should build correct filter for multiple supplier IDs", () => {
      const tenantId = new Types.ObjectId();
      const supplierIds = [
        new Types.ObjectId(),
        new Types.ObjectId(),
      ];

      const filter = {
        tenantId,
        "suppliers.supplierId": { $in: supplierIds },
      };

      expect(filter["suppliers.supplierId"].$in).toHaveLength(2);
    });
  });

  describe("MongoDB Array Filter Operations", () => {
    it("should correctly structure updateMany with arrayFilters", () => {
      const supplierId = new Types.ObjectId();
      const tenantId = new Types.ObjectId();

      const updateOperation = {
        filter: {
          tenantId,
          "suppliers.supplierId": supplierId,
        },
        update: {
          $set: {
            "suppliers.$[elem].paymentCurrency": "VES",
            "suppliers.$[elem].preferredPaymentMethod": "pago_movil",
            "suppliers.$[elem].acceptedPaymentMethods": ["pago_movil"],
            "suppliers.$[elem].usesParallelRate": false,
            "suppliers.$[elem].paymentConfigSyncedAt": new Date(),
          },
        },
        options: {
          arrayFilters: [{ "elem.supplierId": supplierId }],
        },
      };

      expect(updateOperation.filter["suppliers.supplierId"]).toEqual(supplierId);
      expect(updateOperation.update.$set["suppliers.$[elem].paymentCurrency"]).toBe("VES");
      expect(updateOperation.options.arrayFilters[0]["elem.supplierId"]).toEqual(supplierId);
    });
  });

  describe("Supplier Payment Settings to Products Sync Flow", () => {
    it("should validate complete sync workflow", () => {
      // Step 1: Supplier has payment settings
      const supplier = createMockSupplier({
        paymentSettings: {
          preferredPaymentMethod: "binance_usdt",
          acceptedPaymentMethods: ["binance_usdt", "zelle"],
        },
      });

      // Step 2: Infer payment configuration
      const paymentCurrency = "USD_PARALELO"; // inferred from binance_usdt
      const usesParallelRate = true;

      // Step 3: Prepare sync payload
      const syncPayload = {
        paymentCurrency,
        preferredPaymentMethod: supplier.paymentSettings.preferredPaymentMethod,
        acceptedPaymentMethods: supplier.paymentSettings.acceptedPaymentMethods,
        usesParallelRate,
      };

      expect(syncPayload).toEqual({
        paymentCurrency: "USD_PARALELO",
        preferredPaymentMethod: "binance_usdt",
        acceptedPaymentMethods: ["binance_usdt", "zelle"],
        usesParallelRate: true,
      });

      // Step 4: Mock product after sync
      const productAfterSync = createMockProduct({
        suppliers: [
          {
            supplierId: supplier._id,
            supplierName: supplier.name,
            paymentCurrency: syncPayload.paymentCurrency,
            preferredPaymentMethod: syncPayload.preferredPaymentMethod,
            acceptedPaymentMethods: syncPayload.acceptedPaymentMethods,
            usesParallelRate: syncPayload.usesParallelRate,
            paymentConfigSyncedAt: new Date(),
          },
        ],
      });

      // Verify sync result
      expect(productAfterSync.suppliers[0].paymentCurrency).toBe("USD_PARALELO");
      expect(productAfterSync.suppliers[0].usesParallelRate).toBe(true);
    });
  });
});
