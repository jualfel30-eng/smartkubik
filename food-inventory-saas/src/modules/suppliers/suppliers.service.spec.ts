import { SuppliersService, SupplierPaymentCurrency, SupplierPaymentConfig } from "./suppliers.service";
import { NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";

describe("SuppliersService", () => {
  let service: SuppliersService;
  let supplierModel: any;
  let customerModel: any;
  let productModel: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  const buildModel = () => {
    const model: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() }),
      toObject: jest.fn().mockReturnValue(data),
    }));
    model.find = jest.fn();
    model.findOne = jest.fn();
    model.findById = jest.fn();
    model.findByIdAndUpdate = jest.fn();
    model.updateMany = jest.fn();
    model.countDocuments = jest.fn();
    model.aggregate = jest.fn();
    model.exec = jest.fn();
    return model;
  };

  beforeEach(() => {
    supplierModel = buildModel();
    customerModel = buildModel();
    productModel = buildModel();

    service = new SuppliersService(
      supplierModel as any,
      customerModel as any,
      productModel as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // === BASIC CRUD TESTS ===
  // ============================================================

  describe("create", () => {
    it("should create supplier and link to new customer if not exists", async () => {
      customerModel.findOne.mockResolvedValue(null);
      supplierModel.findOne.mockResolvedValue(null);
      supplierModel.countDocuments.mockResolvedValue(0);

      const dto = {
        name: "Proveedor Test",
        rif: "J-12345678-9",
        contactName: "Juan Pérez",
        contactEmail: "juan@test.com",
        contactPhone: "+58412345678",
      };

      const result = await service.create(dto as any, { tenantId, id: userId });

      expect(result).toBeDefined();
      expect(customerModel.findOne).toHaveBeenCalled();
      expect(supplierModel).toHaveBeenCalled();
    });

    it("should link to existing customer if RIF matches", async () => {
      const existingCustomer = {
        _id: new Types.ObjectId(),
        customerType: "supplier",
        save: jest.fn().mockResolvedValue(this),
      };

      customerModel.findOne.mockResolvedValue(existingCustomer);
      supplierModel.findOne.mockResolvedValue(null);
      supplierModel.countDocuments.mockResolvedValue(5);

      const dto = {
        name: "Proveedor Existente",
        rif: "J-98765432-1",
        contactName: "Maria",
      };

      const result = await service.create(dto as any, { tenantId, id: userId });

      expect(result).toBeDefined();
      expect(customerModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          "taxInfo.taxId": dto.rif,
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return merged suppliers from both Supplier and Customer models", async () => {
      const supplier1 = {
        _id: new Types.ObjectId(),
        name: "Supplier 1",
        customerId: null,
        toObject: jest.fn().mockReturnValue({ name: "Supplier 1" }),
      };

      supplierModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([supplier1]),
      });

      customerModel.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.findAll(tenantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by search term", async () => {
      supplierModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      customerModel.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      await service.findAll(tenantId, "buscar");

      expect(supplierModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(Object) }),
          ]),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return supplier when found in Supplier model", async () => {
      const supplier = {
        _id: new Types.ObjectId(),
        name: "Test Supplier",
        customerId: null,
        toObject: jest.fn().mockReturnValue({ name: "Test Supplier" }),
      };

      supplierModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(supplier),
      });

      const result = await service.findOne(supplier._id.toString(), tenantId);

      expect(result).toBeDefined();
      expect(result.name).toBe("Test Supplier");
    });

    it("should return virtual supplier when found in Customer model", async () => {
      supplierModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const customer = {
        _id: new Types.ObjectId(),
        name: "Virtual Supplier",
        companyName: "Virtual Company",
        customerNumber: "CUST-001",
        customerType: "supplier",
        status: "active",
        taxInfo: { taxId: "J-123" },
        contacts: [],
        addresses: [],
      };

      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(customer),
      });

      const result = await service.findOne(customer._id.toString(), tenantId);

      expect(result).toBeDefined();
      expect(result.isVirtual).toBe(true);
    });

    it("should return null when not found in either model", async () => {
      supplierModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findOne(new Types.ObjectId().toString(), tenantId);

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // === PRICING ENGINE INTEGRATION TESTS ===
  // ============================================================

  describe("getSuppliersByPaymentCurrency", () => {
    it("should group suppliers by inferred payment currency", async () => {
      const suppliers = [
        {
          _id: new Types.ObjectId(),
          name: "Zelle Supplier",
          paymentSettings: { preferredPaymentMethod: "zelle" },
        },
        {
          _id: new Types.ObjectId(),
          name: "Pago Movil Supplier",
          paymentSettings: { preferredPaymentMethod: "pago_movil" },
        },
      ];

      supplierModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(suppliers),
      });

      productModel.countDocuments.mockResolvedValue(5);

      const result = await service.getSuppliersByPaymentCurrency(tenantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Should have groups
      const usdParaleloGroup = result.find((g) => g.currency === "USD_PARALELO");
      const vesGroup = result.find((g) => g.currency === "VES");

      expect(usdParaleloGroup?.suppliers).toContainEqual(
        expect.objectContaining({ name: "Zelle Supplier" }),
      );
      expect(vesGroup?.suppliers).toContainEqual(
        expect.objectContaining({ name: "Pago Movil Supplier" }),
      );
    });

    it("should count products per supplier", async () => {
      const suppliers = [
        {
          _id: new Types.ObjectId(),
          name: "Supplier X",
          paymentSettings: { preferredPaymentMethod: "efectivo_usd" },
        },
      ];

      supplierModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(suppliers),
      });

      productModel.countDocuments.mockResolvedValue(10);

      const result = await service.getSuppliersByPaymentCurrency(tenantId);

      const group = result.find((g) => g.suppliers.length > 0);
      expect(group?.suppliers[0].productCount).toBe(10);
    });
  });

  describe("getSuppliersByPaymentMethod", () => {
    it("should return suppliers that use specific payment method", async () => {
      const suppliers = [
        { _id: new Types.ObjectId(), name: "Zelle Pro" },
        { _id: new Types.ObjectId(), name: "Zelle Expert" },
      ];

      supplierModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(suppliers),
      });

      productModel.countDocuments.mockResolvedValue(3);

      const result = await service.getSuppliersByPaymentMethod(tenantId, "zelle");

      expect(result.length).toBe(2);
      expect(result[0].productCount).toBe(3);
    });
  });

  describe("syncPaymentConfigToProducts", () => {
    it("should update all products linked to supplier with payment config", async () => {
      const supplierId = new Types.ObjectId().toString();

      productModel.updateMany.mockResolvedValue({ modifiedCount: 15 });

      const paymentConfig: SupplierPaymentConfig = {
        paymentCurrency: "USD_PARALELO",
        preferredPaymentMethod: "zelle",
        acceptedPaymentMethods: ["zelle", "efectivo_usd"],
        usesParallelRate: true,
      };

      const result = await service.syncPaymentConfigToProducts(
        supplierId,
        tenantId,
        paymentConfig,
      );

      expect(result.updatedCount).toBe(15);
      expect(productModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          "suppliers.supplierId": expect.any(Types.ObjectId),
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            "suppliers.$[elem].paymentCurrency": "USD_PARALELO",
            "suppliers.$[elem].usesParallelRate": true,
          }),
        }),
        expect.objectContaining({
          arrayFilters: expect.any(Array),
        }),
      );
    });
  });

  describe("updatePaymentSettingsAndSync", () => {
    it("should update supplier payment settings and sync to products", async () => {
      const supplierId = new Types.ObjectId();

      const mockSupplier = {
        _id: supplierId,
        name: "Test Supplier",
        paymentSettings: {},
        save: jest.fn().mockResolvedValue(this),
        toObject: jest.fn().mockReturnValue({ name: "Test Supplier" }),
      };

      supplierModel.findOne.mockResolvedValue(mockSupplier);
      productModel.updateMany.mockResolvedValue({ modifiedCount: 8 });

      const result = await service.updatePaymentSettingsAndSync(
        supplierId.toString(),
        tenantId,
        userId,
        {
          preferredPaymentMethod: "pago_movil",
          acceptedPaymentMethods: ["pago_movil", "transferencia_ves"],
        },
      );

      expect(mockSupplier.save).toHaveBeenCalled();
      expect(result.syncedProducts).toBe(8);
    });

    it("should throw NotFoundException when supplier not found", async () => {
      supplierModel.findOne.mockResolvedValue(null);

      await expect(
        service.updatePaymentSettingsAndSync(
          new Types.ObjectId().toString(),
          tenantId,
          userId,
          { preferredPaymentMethod: "zelle" },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getProductIdsBySupplierPaymentCurrency", () => {
    it("should return product IDs filtered by payment currency", async () => {
      const products = [
        { _id: new Types.ObjectId() },
        { _id: new Types.ObjectId() },
      ];

      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(products),
      });

      const result = await service.getProductIdsBySupplierPaymentCurrency(
        tenantId,
        "USD_PARALELO",
      );

      expect(result.length).toBe(2);
      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "suppliers.paymentCurrency": "USD_PARALELO",
        }),
      );
    });
  });

  describe("getProductIdsBySupplierPaymentMethod", () => {
    it("should return product IDs filtered by payment method", async () => {
      const products = [{ _id: new Types.ObjectId() }];

      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(products),
      });

      const result = await service.getProductIdsBySupplierPaymentMethod(
        tenantId,
        "zelle",
      );

      expect(result.length).toBe(1);
      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({
              "suppliers.preferredPaymentMethod": "zelle",
            }),
          ]),
        }),
      );
    });
  });

  describe("bulkSyncAllSuppliersPaymentConfig", () => {
    it("should sync all suppliers payment configs to products", async () => {
      const suppliers = [
        {
          _id: new Types.ObjectId(),
          paymentSettings: { preferredPaymentMethod: "zelle" },
        },
        {
          _id: new Types.ObjectId(),
          paymentSettings: { preferredPaymentMethod: "pago_movil" },
        },
      ];

      supplierModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(suppliers),
      });

      productModel.updateMany.mockResolvedValue({ modifiedCount: 5 });

      const result = await service.bulkSyncAllSuppliersPaymentConfig(tenantId);

      expect(result.suppliersProcessed).toBe(2);
      expect(result.totalProductsUpdated).toBe(10); // 5 per supplier
      expect(productModel.updateMany).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // === PAYMENT CURRENCY INFERENCE TESTS ===
  // ============================================================

  describe("inferPaymentCurrency (private method via updatePaymentSettingsAndSync)", () => {
    it("should infer USD_PARALELO for zelle, efectivo_usd, binance methods", async () => {
      const mockSupplier = {
        _id: new Types.ObjectId(),
        paymentSettings: {},
        save: jest.fn().mockResolvedValue(this),
        toObject: jest.fn().mockReturnValue({}),
      };

      supplierModel.findOne.mockResolvedValue(mockSupplier);
      productModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

      await service.updatePaymentSettingsAndSync(
        mockSupplier._id.toString(),
        tenantId,
        userId,
        { preferredPaymentMethod: "zelle" },
      );

      expect(productModel.updateMany).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            "suppliers.$[elem].paymentCurrency": "USD_PARALELO",
            "suppliers.$[elem].usesParallelRate": true,
          }),
        }),
        expect.anything(),
      );
    });

    it("should infer VES for pago_movil, transferencia_ves methods", async () => {
      const mockSupplier = {
        _id: new Types.ObjectId(),
        paymentSettings: {},
        save: jest.fn().mockResolvedValue(this),
        toObject: jest.fn().mockReturnValue({}),
      };

      supplierModel.findOne.mockResolvedValue(mockSupplier);
      productModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

      await service.updatePaymentSettingsAndSync(
        mockSupplier._id.toString(),
        tenantId,
        userId,
        { preferredPaymentMethod: "pago_movil" },
      );

      expect(productModel.updateMany).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            "suppliers.$[elem].paymentCurrency": "VES",
            "suppliers.$[elem].usesParallelRate": false,
          }),
        }),
        expect.anything(),
      );
    });
  });
});
