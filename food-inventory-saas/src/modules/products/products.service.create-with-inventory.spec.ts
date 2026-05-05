/**
 * Unit tests for ProductsService.create() with the new inventoryContext flow.
 *
 * Covers:
 *   - When inventoryContext is provided, the helper is invoked with the
 *     resolved product, the owner tenant, the warehouseId, and the initial
 *     quantity verbatim.
 *   - When inventoryContext is omitted, the helper is NOT invoked (backward
 *     compatibility for callers like importers/seeds).
 *   - When the helper throws, product creation still succeeds (graceful
 *     degradation: the new product is returned, the inventory creation
 *     failure is logged but does not propagate).
 */

import { ProductsService } from "./products.service";
import { Types } from "mongoose";

describe("ProductsService.create — inventoryContext integration", () => {
  let service: ProductsService;
  let productModel: any;
  let inventoryModel: any;
  let inventoryMovementModel: any;
  let tenantModel: any;
  let customersService: any;
  let purchasesService: any;
  let suppliersService: any;
  let openaiService: any;
  let priceHistoryService: any;
  let priceListsService: any;
  let inventoryService: any;
  let connection: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  const buildModel = () => {
    const model: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id ?? new Types.ObjectId(),
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve({ ...this });
      }),
    }));
    model.find = jest.fn();
    model.findOne = jest.fn();
    model.findById = jest.fn();
    model.findByIdAndUpdate = jest.fn();
    return model;
  };

  const baseDto = (overrides: any = {}): any => ({
    sku: "TST-0001",
    name: "Test Product",
    brand: "TestBrand",
    category: ["General"],
    subcategory: [],
    productType: "simple",
    isPerishable: false,
    taxCategory: "general",
    ivaApplicable: true,
    ivaRate: 0,
    igtfExempt: false,
    unitOfMeasure: "unidad",
    variants: [
      {
        name: "Default",
        sku: "TST-0001",
        unit: "und",
        unitSize: 1,
        basePrice: 10,
        costPrice: 5,
        images: [],
      },
    ],
    pricingRules: {
      cashDiscount: 0,
      cardSurcharge: 0,
      minimumMargin: 0,
      maximumDiscount: 0,
    },
    inventoryConfig: {
      trackLots: false,
      trackExpiration: false,
      minimumStock: 0,
      maximumStock: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      fefoEnabled: false,
    },
    ...overrides,
  });

  beforeEach(() => {
    productModel = buildModel();
    inventoryModel = buildModel();
    inventoryMovementModel = buildModel();
    tenantModel = buildModel();
    customersService = {};
    purchasesService = {};
    suppliersService = {};
    openaiService = {};
    priceHistoryService = {};
    priceListsService = {};
    inventoryService = {
      createInitialInventoriesForProductInGroup: jest
        .fn()
        .mockResolvedValue({ created: 3, skipped: 0, warnings: [] }),
    };
    connection = { startSession: jest.fn() };

    // tenant defaults: under limits, no images stored yet
    tenantModel.findById = jest.fn().mockResolvedValue({
      _id: tenantId,
      usage: { currentProducts: 0, currentStorage: 0 },
      limits: { maxProducts: 1000, maxStorage: 10_000_000 },
    });
    tenantModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});

    // SKU does not collide
    productModel.findOne = jest.fn().mockResolvedValue(null);
    // No existing barcodes
    productModel.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    service = new ProductsService(
      productModel,
      inventoryModel,
      inventoryMovementModel,
      tenantModel,
      customersService,
      purchasesService,
      suppliersService,
      openaiService,
      priceHistoryService,
      priceListsService,
      inventoryService,
      connection,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does NOT invoke the inventory helper when inventoryContext is omitted", async () => {
    await service.create(baseDto(), { id: userId, tenantId });

    expect(
      inventoryService.createInitialInventoriesForProductInGroup,
    ).not.toHaveBeenCalled();
  });

  it("invokes the inventory helper with the provided context", async () => {
    const warehouseId = new Types.ObjectId().toString();

    await service.create(
      baseDto(),
      { id: userId, tenantId },
      {
        ownerTenantId: tenantId,
        warehouseId,
        initialQuantity: 12,
      },
    );

    expect(
      inventoryService.createInitialInventoriesForProductInGroup,
    ).toHaveBeenCalledTimes(1);

    const callArgs =
      inventoryService.createInitialInventoriesForProductInGroup.mock.calls[0];
    const productArg = callArgs[0];
    const optionsArg = callArgs[1];

    expect(productArg.sku).toBe("TST-0001");
    expect(productArg.name).toBe("Test Product");
    expect(optionsArg.ownerTenantId).toBe(tenantId);
    expect(optionsArg.warehouseId).toBe(warehouseId);
    expect(optionsArg.initialQuantity).toBe(12);
    expect(optionsArg.createdBy).toBe(userId);
  });

  it("uses ownerTenantId from inventoryContext, not from user.tenantId — proves the controller's tenant-real vs catalog distinction is honored at this layer", async () => {
    // Simulate: catalog user (matrix) is what arrives in `user`, but the real
    // operating tenant (subsidiary) is in inventoryContext.ownerTenantId.
    const catalogTenantId = new Types.ObjectId().toString();
    const realOwnerTenantId = new Types.ObjectId().toString();

    await service.create(
      baseDto(),
      { id: userId, tenantId: catalogTenantId },
      { ownerTenantId: realOwnerTenantId },
    );

    const optionsArg =
      inventoryService.createInitialInventoriesForProductInGroup.mock.calls[0][1];
    expect(optionsArg.ownerTenantId).toBe(realOwnerTenantId);
    expect(optionsArg.ownerTenantId).not.toBe(catalogTenantId);
  });

  it("returns the saved product even if the inventory helper throws (graceful degradation)", async () => {
    inventoryService.createInitialInventoriesForProductInGroup = jest
      .fn()
      .mockRejectedValue(new Error("boom: warehouse not found"));

    const result = await service.create(
      baseDto({ sku: "GRACE-001" }),
      { id: userId, tenantId },
      { ownerTenantId: tenantId, initialQuantity: 0 },
    );

    expect(result).toBeDefined();
    expect((result as any).sku).toBe("GRACE-001");
    expect(
      inventoryService.createInitialInventoriesForProductInGroup,
    ).toHaveBeenCalledTimes(1);
  });

  it("forwards initialQuantity=0 (not undefined) when the user wants to create an empty inventory", async () => {
    await service.create(
      baseDto(),
      { id: userId, tenantId },
      { ownerTenantId: tenantId, initialQuantity: 0 },
    );

    const optionsArg =
      inventoryService.createInitialInventoriesForProductInGroup.mock.calls[0][1];
    expect(optionsArg.initialQuantity).toBe(0);
  });
});
