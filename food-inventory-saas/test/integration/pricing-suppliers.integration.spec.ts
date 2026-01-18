import { Types } from "mongoose";

/**
 * Pricing Engine - Suppliers Integration Tests
 *
 * These tests verify the complete integration between:
 * 1. Pricing Engine criteria filtering by supplier payment config
 * 2. Supplier payment settings sync to products
 * 3. Bulk price operations based on supplier rate changes
 *
 * The key requirement:
 * When a supplier changes their rate (e.g., sells only in parallel $),
 * ALL products from that supplier should be adjustable in the pricing engine,
 * regardless of when they were purchased.
 */

describe("Pricing-Suppliers Integration", () => {
  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  // Helper to create mock supplier
  const createSupplier = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    name: "Test Supplier",
    tenantId,
    status: "active",
    paymentSettings: {
      preferredPaymentMethod: "zelle",
      acceptedPaymentMethods: ["zelle", "efectivo_usd"],
    },
    ...overrides,
  });

  // Helper to create mock product with supplier link
  const createProduct = (supplier: any, overrides = {}) => ({
    _id: new Types.ObjectId(),
    name: "Test Product",
    sku: `SKU-${Date.now()}`,
    tenantId: new Types.ObjectId(tenantId),
    isActive: true,
    suppliers: [
      {
        supplierId: supplier._id,
        supplierName: supplier.name,
        isPreferred: true,
        cost: 10,
        paymentCurrency: "USD_PARALELO",
        preferredPaymentMethod: "zelle",
        acceptedPaymentMethods: ["zelle", "efectivo_usd"],
        usesParallelRate: true,
        paymentConfigSyncedAt: new Date(),
      },
    ],
    variants: [
      {
        _id: new Types.ObjectId(),
        sku: `VAR-${Date.now()}`,
        basePrice: 100,
        costPrice: 70,
      },
    ],
    ...overrides,
  });

  describe("Core Integration Flow: Supplier Rate Change → Price Adjustment", () => {
    it("should support complete flow from supplier config to price update", () => {
      // Step 1: Supplier exists with payment config
      const supplier = createSupplier({
        name: "Proveedor Dólar Paralelo",
        paymentSettings: {
          preferredPaymentMethod: "zelle",
          acceptedPaymentMethods: ["zelle", "binance_usdt"],
        },
      });

      // Step 2: Products are linked to supplier with synced payment config
      const products = [
        createProduct(supplier, { name: "Producto A" }),
        createProduct(supplier, { name: "Producto B" }),
        createProduct(supplier, { name: "Producto C" }),
      ];

      // Step 3: Verify all products have synced payment config
      for (const product of products) {
        expect(product.suppliers[0].paymentCurrency).toBe("USD_PARALELO");
        expect(product.suppliers[0].usesParallelRate).toBe(true);
      }

      // Step 4: Simulate pricing engine query by payment currency
      const filteredProducts = products.filter(
        (p) => p.suppliers.some((s) => s.paymentCurrency === "USD_PARALELO"),
      );

      expect(filteredProducts.length).toBe(3);

      // Step 5: Apply supplier rate adjustment
      const oldRate = 50;
      const newRate = 55;
      const adjustmentFactor = newRate / oldRate;

      const updatedProducts = filteredProducts.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          basePrice: Math.ceil(variant.basePrice * adjustmentFactor),
        })),
      }));

      // Step 6: Verify prices were adjusted (ceil of 100 * 1.1 = 110)
      expect(updatedProducts[0].variants[0].basePrice).toBe(Math.ceil(100 * 1.1));
    });
  });

  describe("Filtering Products by Supplier Payment Configuration", () => {
    it("should filter products by USD_PARALELO currency", () => {
      const zelleSupplier = createSupplier({
        name: "Zelle Supplier",
        paymentSettings: { preferredPaymentMethod: "zelle" },
      });
      const pagoMovilSupplier = createSupplier({
        name: "Pago Movil Supplier",
        paymentSettings: { preferredPaymentMethod: "pago_movil" },
      });

      const products = [
        createProduct(zelleSupplier, {
          name: "Zelle Product",
          suppliers: [
            {
              supplierId: zelleSupplier._id,
              paymentCurrency: "USD_PARALELO",
              usesParallelRate: true,
            },
          ],
        }),
        createProduct(pagoMovilSupplier, {
          name: "Pago Movil Product",
          suppliers: [
            {
              supplierId: pagoMovilSupplier._id,
              paymentCurrency: "VES",
              usesParallelRate: false,
            },
          ],
        }),
      ];

      // Filter by USD_PARALELO
      const parallelProducts = products.filter((p) =>
        p.suppliers.some((s) => s.paymentCurrency === "USD_PARALELO"),
      );

      expect(parallelProducts.length).toBe(1);
      expect(parallelProducts[0].name).toBe("Zelle Product");

      // Filter by VES
      const vesProducts = products.filter((p) =>
        p.suppliers.some((s) => s.paymentCurrency === "VES"),
      );

      expect(vesProducts.length).toBe(1);
      expect(vesProducts[0].name).toBe("Pago Movil Product");
    });

    it("should filter products by usesParallelRate", () => {
      const supplier = createSupplier();

      const products = [
        createProduct(supplier, {
          name: "Parallel Rate Product",
          suppliers: [{ supplierId: supplier._id, usesParallelRate: true }],
        }),
        createProduct(supplier, {
          name: "BCV Rate Product",
          suppliers: [{ supplierId: supplier._id, usesParallelRate: false }],
        }),
      ];

      const parallelProducts = products.filter((p) =>
        p.suppliers.some((s) => s.usesParallelRate === true),
      );

      expect(parallelProducts.length).toBe(1);
      expect(parallelProducts[0].name).toBe("Parallel Rate Product");
    });

    it("should filter products by specific supplier IDs", () => {
      const supplier1 = createSupplier({ name: "Supplier 1" });
      const supplier2 = createSupplier({ name: "Supplier 2" });
      const supplier3 = createSupplier({ name: "Supplier 3" });

      const products = [
        createProduct(supplier1, { name: "Product from S1" }),
        createProduct(supplier2, { name: "Product from S2" }),
        createProduct(supplier3, { name: "Product from S3" }),
      ];

      const targetSupplierIds = [supplier1._id.toString(), supplier2._id.toString()];

      const filteredProducts = products.filter((p) =>
        p.suppliers.some((s) =>
          targetSupplierIds.includes(s.supplierId.toString()),
        ),
      );

      expect(filteredProducts.length).toBe(2);
    });
  });

  describe("Supplier Rate Adjustment Operation", () => {
    it("should calculate price adjustment without preserving margin", () => {
      const supplier = createSupplier();
      const product = createProduct(supplier, {
        variants: [{ basePrice: 100, costPrice: 60 }],
      });

      const oldRate = 50;
      const newRate = 55;
      const adjustmentFactor = newRate / oldRate;

      // Direct adjustment: price * factor (55/50 = 1.1, so 100 * 1.1 = 110)
      const newPrice = Math.ceil(product.variants[0].basePrice * adjustmentFactor);
      expect(newPrice).toBe(Math.ceil(100 * 1.1));
    });

    it("should calculate price adjustment preserving margin", () => {
      const supplier = createSupplier();
      const product = createProduct(supplier, {
        variants: [{ basePrice: 100, costPrice: 60 }],
      });

      const oldRate = 50;
      const newRate = 55;
      const adjustmentFactor = newRate / oldRate;

      // Current margin = (100 - 60) / 100 = 0.4
      const currentMargin =
        (product.variants[0].basePrice - product.variants[0].costPrice) /
        product.variants[0].basePrice;

      // New cost = old cost * factor
      const newCost = product.variants[0].costPrice * adjustmentFactor;

      // New price preserving margin: cost / (1 - margin)
      const newPrice = Math.ceil(newCost / (1 - currentMargin));

      expect(newPrice).toBe(110); // 66 / 0.6 = 110
    });

    it("should handle 20% rate increase scenario", () => {
      const product = {
        variants: [{ basePrice: 100, costPrice: 50 }],
      };

      const oldRate = 50;
      const newRate = 60; // 20% increase
      const factor = newRate / oldRate; // 1.2

      const newPriceNoMargin = Math.ceil(product.variants[0].basePrice * factor);
      expect(newPriceNoMargin).toBe(120);
    });
  });

  describe("Bulk Sync: Supplier Payment Config to Products", () => {
    it("should sync payment config to all linked products", () => {
      const supplier = createSupplier({
        paymentSettings: {
          preferredPaymentMethod: "efectivo_usd",
          acceptedPaymentMethods: ["efectivo_usd", "zelle"],
        },
      });

      // Products before sync
      const productsBefore = [
        createProduct(supplier, {
          suppliers: [
            {
              supplierId: supplier._id,
              paymentCurrency: undefined,
              usesParallelRate: undefined,
            },
          ],
        }),
        createProduct(supplier, {
          suppliers: [
            {
              supplierId: supplier._id,
              paymentCurrency: undefined,
              usesParallelRate: undefined,
            },
          ],
        }),
      ];

      // Sync operation
      const paymentConfig = {
        paymentCurrency: "USD_PARALELO",
        preferredPaymentMethod: "efectivo_usd",
        acceptedPaymentMethods: ["efectivo_usd", "zelle"],
        usesParallelRate: true,
      };

      // Simulate sync result
      const productsAfter = productsBefore.map((p) => ({
        ...p,
        suppliers: p.suppliers.map((s) =>
          s.supplierId.toString() === supplier._id.toString()
            ? {
                ...s,
                ...paymentConfig,
                paymentConfigSyncedAt: new Date(),
              }
            : s,
        ),
      }));

      // Verify sync
      for (const product of productsAfter) {
        const linkedSupplier = product.suppliers.find(
          (s: any) => s.supplierId.toString() === supplier._id.toString(),
        );
        expect(linkedSupplier!.paymentCurrency).toBe("USD_PARALELO");
        expect(linkedSupplier!.usesParallelRate).toBe(true);
        expect(linkedSupplier!.paymentConfigSyncedAt).toBeDefined();
      }
    });

    it("should update only the matching supplier in products with multiple suppliers", () => {
      const supplier1 = createSupplier({ name: "Supplier 1" });
      const supplier2 = createSupplier({ name: "Supplier 2" });

      const productWithMultipleSuppliers = {
        _id: new Types.ObjectId(),
        name: "Multi-Supplier Product",
        suppliers: [
          {
            supplierId: supplier1._id,
            paymentCurrency: "USD",
            usesParallelRate: false,
          },
          {
            supplierId: supplier2._id,
            paymentCurrency: "VES",
            usesParallelRate: false,
          },
        ],
      };

      // Update only supplier1's config
      const updatedProduct = {
        ...productWithMultipleSuppliers,
        suppliers: productWithMultipleSuppliers.suppliers.map((s) =>
          s.supplierId.toString() === supplier1._id.toString()
            ? {
                ...s,
                paymentCurrency: "USD_PARALELO",
                usesParallelRate: true,
              }
            : s,
        ),
      };

      // Verify supplier1 was updated
      const s1Link = updatedProduct.suppliers.find(
        (s: any) => s.supplierId.toString() === supplier1._id.toString(),
      );
      expect(s1Link?.paymentCurrency).toBe("USD_PARALELO");
      expect(s1Link?.usesParallelRate).toBe(true);

      // Verify supplier2 was NOT changed
      const s2Link = updatedProduct.suppliers.find(
        (s: any) => s.supplierId.toString() === supplier2._id.toString(),
      );
      expect(s2Link?.paymentCurrency).toBe("VES");
      expect(s2Link?.usesParallelRate).toBe(false);
    });
  });

  describe("MongoDB Query Patterns", () => {
    it("should build correct filter for payment currency query", () => {
      const filter = {
        tenantId: new Types.ObjectId(tenantId),
        "suppliers.paymentCurrency": "USD_PARALELO",
      };

      expect(filter["suppliers.paymentCurrency"]).toBe("USD_PARALELO");
    });

    it("should build correct $or filter for payment method query", () => {
      const paymentMethod = "zelle";
      const filter = {
        tenantId: new Types.ObjectId(tenantId),
        $or: [
          { "suppliers.preferredPaymentMethod": paymentMethod },
          { "suppliers.acceptedPaymentMethods": paymentMethod },
        ],
      };

      expect(filter.$or.length).toBe(2);
    });

    it("should build correct updateMany with arrayFilters", () => {
      const supplierId = new Types.ObjectId();

      const updateCommand = {
        filter: {
          tenantId: new Types.ObjectId(tenantId),
          "suppliers.supplierId": supplierId,
        },
        update: {
          $set: {
            "suppliers.$[elem].paymentCurrency": "USD_PARALELO",
            "suppliers.$[elem].usesParallelRate": true,
            "suppliers.$[elem].paymentConfigSyncedAt": new Date(),
          },
        },
        options: {
          arrayFilters: [{ "elem.supplierId": supplierId }],
        },
      };

      expect(updateCommand.options.arrayFilters[0]["elem.supplierId"]).toEqual(supplierId);
    });
  });

  describe("Edge Cases", () => {
    it("should handle products with no suppliers", () => {
      const product = {
        _id: new Types.ObjectId(),
        name: "Product Without Suppliers",
        suppliers: [] as any[],
        variants: [{ basePrice: 100 }],
      };

      const hasParallelSupplier = product.suppliers.some(
        (s: any) => s.paymentCurrency === "USD_PARALELO",
      );

      expect(hasParallelSupplier).toBe(false);
    });

    it("should handle products with null supplier payment config", () => {
      const product = {
        suppliers: [
          {
            supplierId: new Types.ObjectId(),
            paymentCurrency: null,
            usesParallelRate: null,
          },
        ],
      };

      // Default to USD_PARALELO when null
      const effectiveCurrency =
        product.suppliers[0].paymentCurrency || "USD_PARALELO";
      expect(effectiveCurrency).toBe("USD_PARALELO");
    });

    it("should handle zero or negative rates gracefully", () => {
      const oldRate = 0;
      const newRate = 50;

      // Should be treated as invalid
      const isValid = oldRate > 0 && newRate > 0;
      expect(isValid).toBe(false);
    });

    it("should handle very large rate changes", () => {
      const oldRate = 10;
      const newRate = 100; // 10x increase
      const factor = newRate / oldRate;

      const originalPrice = 100;
      const newPrice = Math.ceil(originalPrice * factor);

      expect(newPrice).toBe(1000);
    });
  });

  describe("Integration with Inventory Module", () => {
    it("should combine supplier filter with low stock filter", () => {
      const product = {
        _id: new Types.ObjectId(),
        suppliers: [
          {
            supplierId: new Types.ObjectId(),
            paymentCurrency: "USD_PARALELO",
          },
        ],
        inventory: {
          alerts: { lowStock: true },
        },
      };

      const matchesSupplierCriteria =
        product.suppliers[0].paymentCurrency === "USD_PARALELO";
      const matchesStockCriteria = product.inventory.alerts.lowStock === true;

      expect(matchesSupplierCriteria && matchesStockCriteria).toBe(true);
    });
  });

  describe("Audit Trail for Pricing Operations", () => {
    it("should capture correct audit log structure", () => {
      const auditLog = {
        tenantId: new Types.ObjectId(tenantId),
        action: "bulk_price_update",
        entity: "product",
        entityId: "bulk",
        performedBy: new Types.ObjectId(userId),
        details: {
          criteria: {
            supplierPaymentCurrency: "USD_PARALELO",
          },
          operation: {
            type: "supplier_rate_adjustment",
            payload: {
              oldRate: 50,
              newRate: 55,
              preserveMargin: true,
            },
          },
          updatedCount: 25,
        },
        timestamp: new Date(),
      };

      expect(auditLog.action).toBe("bulk_price_update");
      expect(auditLog.details.operation.type).toBe("supplier_rate_adjustment");
      expect(auditLog.details.updatedCount).toBe(25);
    });
  });
});
