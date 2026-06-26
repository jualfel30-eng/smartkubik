/**
 * Unit tests for the auto-create-inventory feature.
 *
 * Covers:
 *   - getTenantGroup() resolves matrix + subsidiaries correctly
 *   - createInitialInventoriesForProductInGroup() creates one inventory per
 *     (tenant in group × variant), with the requested quantity going only to
 *     the owner tenant and the rest receiving zero
 *   - Idempotency: pre-existing (tenantId, productId, variantId) rows are
 *     skipped without duplicate insert
 *   - Movement IN is emitted only when owner gets a positive initialQuantity
 *   - Tenants without a usable warehouse are skipped with a warning
 */

import { InventoryService } from "./inventory.service";
import { Types } from "mongoose";

describe("InventoryService — auto-create initial inventories", () => {
  let service: InventoryService;
  let inventoryModel: any;
  let movementModel: any;
  let productModel: any;
  let tenantModel: any;
  let warehouseModel: any;
  let eventsService: any;
  let connection: any;

  // Tenant IDs for the simulated group: 1 matrix + 2 subsidiaries
  const matrixId = new Types.ObjectId();
  const subAId = new Types.ObjectId();
  const subBId = new Types.ObjectId();

  // Warehouse IDs (one per tenant)
  const matrixWarehouseId = new Types.ObjectId();
  const subAWarehouseId = new Types.ObjectId();
  const subBWarehouseId = new Types.ObjectId();

  /**
   * Mock factory for a Mongoose model. The constructor returned by `model(...)`
   * stores the data and exposes a `.save()` that resolves with `{ ...data, _id }`.
   * Static methods (find, findOne, ...) are jest.fn() and configurable per test.
   */
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
    model.updateOne = jest.fn();
    model.updateMany = jest.fn();
    model.aggregate = jest.fn();
    model.countDocuments = jest.fn();
    model.collection = { dropIndex: jest.fn().mockResolvedValue(null) };
    return model;
  };

  /**
   * Default lean()-able query stub.
   */
  const queryReturning = (value: any) => ({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  });

  beforeEach(() => {
    inventoryModel = buildModel();
    movementModel = buildModel();
    productModel = buildModel();
    tenantModel = buildModel();
    warehouseModel = buildModel();
    eventsService = { emit: jest.fn() };
    connection = { startSession: jest.fn() };

    // tenantModel.findById defaults: matrix tenant has no parent
    tenantModel.findById = jest.fn().mockImplementation((id: any) => {
      const idStr = id.toString();
      if (idStr === matrixId.toString()) {
        return queryReturning({ parentTenantId: null, isSubsidiary: false });
      }
      if (idStr === subAId.toString()) {
        return queryReturning({ parentTenantId: matrixId, isSubsidiary: true });
      }
      if (idStr === subBId.toString()) {
        return queryReturning({ parentTenantId: matrixId, isSubsidiary: true });
      }
      return queryReturning(null);
    });

    // tenantModel.find defaults: matrix has subA + subB as subsidiaries
    tenantModel.find = jest.fn().mockImplementation((filter: any) => {
      if (filter?.parentTenantId?.toString() === matrixId.toString()) {
        return queryReturning([{ _id: subAId }, { _id: subBId }]);
      }
      return queryReturning([]);
    });

    // warehouseModel.findOne defaults: one active default warehouse per tenant
    warehouseModel.findOne = jest.fn().mockImplementation((filter: any) => {
      // tenantId filter is built via buildTenantFilter — it produces { $in: [...] }
      const tenantIds: string[] =
        filter?.tenantId?.$in?.map((x: any) => x.toString()) || [];
      let id: Types.ObjectId | null = null;
      if (tenantIds.includes(matrixId.toString())) id = matrixWarehouseId;
      else if (tenantIds.includes(subAId.toString())) id = subAWarehouseId;
      else if (tenantIds.includes(subBId.toString())) id = subBWarehouseId;
      return {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(id ? { _id: id } : null),
      };
    });

    // inventoryModel.findOne defaults: nothing pre-existing
    inventoryModel.findOne = jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });

    service = new InventoryService(
      inventoryModel,
      movementModel,
      productModel,
      tenantModel,
      warehouseModel,
      eventsService,
      connection,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getTenantGroup
  // ---------------------------------------------------------------------------

  describe("getTenantGroup", () => {
    it("returns matrix + subsidiaries when called with matrix tenantId", async () => {
      const group = await (service as any).getTenantGroup(matrixId.toString());
      const ids = group.map((g: Types.ObjectId) => g.toString());
      expect(ids).toContain(matrixId.toString());
      expect(ids).toContain(subAId.toString());
      expect(ids).toContain(subBId.toString());
      expect(ids.length).toBe(3);
    });

    it("returns the same group when called with a subsidiary tenantId", async () => {
      const group = await (service as any).getTenantGroup(subAId.toString());
      const ids = group.map((g: Types.ObjectId) => g.toString());
      expect(ids).toContain(matrixId.toString());
      expect(ids).toContain(subAId.toString());
      expect(ids).toContain(subBId.toString());
      expect(ids.length).toBe(3);
    });

    it("returns just the tenant when it has no parent and no subsidiaries", async () => {
      const standaloneId = new Types.ObjectId();
      tenantModel.findById = jest
        .fn()
        .mockReturnValue(
          queryReturning({ parentTenantId: null, isSubsidiary: false }),
        );
      tenantModel.find = jest.fn().mockReturnValue(queryReturning([]));

      const group = await (service as any).getTenantGroup(
        standaloneId.toString(),
      );
      expect(group.length).toBe(1);
      expect(group[0].toString()).toBe(standaloneId.toString());
    });
  });

  // ---------------------------------------------------------------------------
  // createInitialInventoriesForProductInGroup
  // ---------------------------------------------------------------------------

  describe("createInitialInventoriesForProductInGroup", () => {
    const buildProduct = (overrides: any = {}) => ({
      _id: new Types.ObjectId(),
      sku: "TST-0001",
      name: "Test Product",
      variants: [
        { _id: new Types.ObjectId(), sku: "TST-0001-VAR1", costPrice: 5 },
      ],
      ...overrides,
    });

    it("creates one inventory per tenant in the group when product has a single variant", async () => {
      const product = buildProduct();
      const userId = new Types.ObjectId();

      const result = await service.createInitialInventoriesForProductInGroup(
        product as any,
        {
          ownerTenantId: matrixId.toString(),
          initialQuantity: 0,
          createdBy: userId.toString(),
        },
      );

      // 3 tenants × 1 variant = 3 inventories
      expect(result.created).toBe(3);
      expect(result.skipped).toBe(0);
      expect(inventoryModel).toHaveBeenCalledTimes(3);
    });

    it("creates N inventories per tenant when product has N variants", async () => {
      const product = buildProduct({
        variants: [
          { _id: new Types.ObjectId(), sku: "V1", costPrice: 5 },
          { _id: new Types.ObjectId(), sku: "V2", costPrice: 7 },
          { _id: new Types.ObjectId(), sku: "V3", costPrice: 9 },
        ],
      });

      const result = await service.createInitialInventoriesForProductInGroup(
        product as any,
        {
          ownerTenantId: matrixId.toString(),
          initialQuantity: 0,
          createdBy: new Types.ObjectId().toString(),
        },
      );

      // 3 tenants × 3 variants = 9 inventories
      expect(result.created).toBe(9);
      expect(inventoryModel).toHaveBeenCalledTimes(9);
    });

    it("creates inventory with quantity=0 when no initialQuantity is provided", async () => {
      const product = buildProduct();
      const inventoryDocs: any[] = [];
      inventoryModel.mockImplementation((data: any) => {
        inventoryDocs.push(data);
        return {
          ...data,
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue({ ...data }),
        };
      });

      await service.createInitialInventoriesForProductInGroup(product as any, {
        ownerTenantId: matrixId.toString(),
        createdBy: new Types.ObjectId().toString(),
      });

      // All inventories created should have totalQuantity=0
      expect(inventoryDocs).toHaveLength(3);
      inventoryDocs.forEach((d) => {
        expect(d.totalQuantity).toBe(0);
        expect(d.availableQuantity).toBe(0);
      });
    });

    it("only the owner tenant receives the initialQuantity, others get 0", async () => {
      const product = buildProduct();
      const inventoryDocs: any[] = [];
      inventoryModel.mockImplementation((data: any) => {
        inventoryDocs.push(data);
        return {
          ...data,
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue({ ...data }),
        };
      });

      await service.createInitialInventoriesForProductInGroup(product as any, {
        ownerTenantId: subAId.toString(), // Owner is subsidiary A
        initialQuantity: 50,
        createdBy: new Types.ObjectId().toString(),
      });

      const ownerDoc = inventoryDocs.find(
        (d) => d.tenantId.toString() === subAId.toString(),
      );
      const others = inventoryDocs.filter(
        (d) => d.tenantId.toString() !== subAId.toString(),
      );

      expect(ownerDoc.totalQuantity).toBe(50);
      expect(ownerDoc.availableQuantity).toBe(50);
      others.forEach((d) => {
        expect(d.totalQuantity).toBe(0);
        expect(d.availableQuantity).toBe(0);
      });
    });

    it("creates an IN movement when owner has initialQuantity > 0", async () => {
      const product = buildProduct();
      const movementDocs: any[] = [];
      movementModel.mockImplementation((data: any) => {
        movementDocs.push(data);
        return {
          ...data,
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue({ ...data }),
        };
      });

      await service.createInitialInventoriesForProductInGroup(product as any, {
        ownerTenantId: matrixId.toString(),
        initialQuantity: 25,
        createdBy: new Types.ObjectId().toString(),
      });

      // Should create exactly one IN movement (owner only, single variant)
      expect(movementDocs).toHaveLength(1);
      expect(movementDocs[0].movementType).toBe("IN");
      expect(movementDocs[0].quantity).toBe(25);
      expect(movementDocs[0].reason).toBe("Stock inicial al crear producto");
      expect(movementDocs[0].tenantId.toString()).toBe(matrixId.toString());
    });

    it("does NOT create a movement when initialQuantity is 0", async () => {
      const product = buildProduct();
      const movementDocs: any[] = [];
      movementModel.mockImplementation((data: any) => {
        movementDocs.push(data);
        return {
          ...data,
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue({ ...data }),
        };
      });

      await service.createInitialInventoriesForProductInGroup(product as any, {
        ownerTenantId: matrixId.toString(),
        initialQuantity: 0,
        createdBy: new Types.ObjectId().toString(),
      });

      expect(movementDocs).toHaveLength(0);
    });

    it("is idempotent: skips tenants that already have an inventory for this (productId, variantId)", async () => {
      const product = buildProduct();

      // Make subA already have an inventory for this product
      inventoryModel.findOne = jest.fn().mockImplementation((filter: any) => {
        const tenantIds: string[] = filter?.tenantId?.$in
          ? filter.tenantId.$in.map((x: any) => x.toString())
          : [filter.tenantId?.toString()];
        if (tenantIds.includes(subAId.toString())) {
          return {
            session: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }), // exists
          };
        }
        return { session: jest.fn().mockResolvedValue(null) }; // does not exist
      });

      const result = await service.createInitialInventoriesForProductInGroup(
        product as any,
        {
          ownerTenantId: matrixId.toString(),
          initialQuantity: 0,
          createdBy: new Types.ObjectId().toString(),
        },
      );

      // 3 tenants, 1 already exists (subA) → 2 created, 1 skipped
      expect(result.created).toBe(2);
      expect(result.skipped).toBe(1);
    });

    it("reactivates a pre-existing INACTIVE inventory instead of skipping it", async () => {
      const product = buildProduct();
      const inactiveDoc: any = {
        _id: new Types.ObjectId(),
        isActive: false,
        save: jest.fn().mockResolvedValue({}),
      };

      // subA already has an inventory, but it's INACTIVE (was "deleted")
      inventoryModel.findOne = jest.fn().mockImplementation((filter: any) => {
        const tenantIds: string[] = filter?.tenantId?.$in
          ? filter.tenantId.$in.map((x: any) => x.toString())
          : [filter.tenantId?.toString()];
        if (tenantIds.includes(subAId.toString())) {
          return { session: jest.fn().mockResolvedValue(inactiveDoc) };
        }
        return { session: jest.fn().mockResolvedValue(null) };
      });

      const result = await service.createInitialInventoriesForProductInGroup(
        product as any,
        {
          ownerTenantId: matrixId.toString(),
          initialQuantity: 0,
          createdBy: new Types.ObjectId().toString(),
        },
      );

      // matrix + subB created (2), subA reactivated (1), none skipped
      expect(result.created).toBe(2);
      expect(result.reactivated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(inactiveDoc.isActive).toBe(true);
      expect(inactiveDoc.save).toHaveBeenCalled();
    });

    it("skips a tenant with no usable warehouse and emits a warning", async () => {
      const product = buildProduct();

      // subB has no warehouse
      warehouseModel.findOne = jest.fn().mockImplementation((filter: any) => {
        const tenantIds: string[] =
          filter?.tenantId?.$in?.map((x: any) => x.toString()) || [];
        if (tenantIds.includes(subBId.toString())) {
          return {
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(null),
          };
        }
        let id: Types.ObjectId | null = null;
        if (tenantIds.includes(matrixId.toString())) id = matrixWarehouseId;
        else if (tenantIds.includes(subAId.toString())) id = subAWarehouseId;
        return {
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(id ? { _id: id } : null),
        };
      });

      const result = await service.createInitialInventoriesForProductInGroup(
        product as any,
        {
          ownerTenantId: matrixId.toString(),
          initialQuantity: 0,
          createdBy: new Types.ObjectId().toString(),
        },
      );

      // matrix + subA created (2), subB skipped → warning
      expect(result.created).toBe(2);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes(subBId.toString()))).toBe(
        true,
      );
    });

    it("uses the explicit warehouseId for the owner tenant when provided", async () => {
      const product = buildProduct();
      const customWarehouseId = new Types.ObjectId();
      const inventoryDocs: any[] = [];
      inventoryModel.mockImplementation((data: any) => {
        inventoryDocs.push(data);
        return {
          ...data,
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue({ ...data }),
        };
      });

      await service.createInitialInventoriesForProductInGroup(product as any, {
        ownerTenantId: matrixId.toString(),
        warehouseId: customWarehouseId.toString(),
        initialQuantity: 0,
        createdBy: new Types.ObjectId().toString(),
      });

      const ownerDoc = inventoryDocs.find(
        (d) => d.tenantId.toString() === matrixId.toString(),
      );
      expect(ownerDoc.warehouseId.toString()).toBe(
        customWarehouseId.toString(),
      );
    });

    it("falls back gracefully and skips IN movement if createdBy is missing for owner with initialQuantity > 0", async () => {
      const product = buildProduct();
      const movementDocs: any[] = [];
      movementModel.mockImplementation((data: any) => {
        movementDocs.push(data);
        return {
          ...data,
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue({ ...data }),
        };
      });

      const result = await service.createInitialInventoriesForProductInGroup(
        product as any,
        {
          ownerTenantId: matrixId.toString(),
          initialQuantity: 30,
          // createdBy intentionally omitted
        },
      );

      // Inventory still created, but movement skipped with warning
      expect(result.created).toBe(3);
      expect(movementDocs).toHaveLength(0);
      expect(
        result.warnings.some((w) => w.toLowerCase().includes("createdby")),
      ).toBe(true);
    });
  });
});
