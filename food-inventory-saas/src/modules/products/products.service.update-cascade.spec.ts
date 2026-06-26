/**
 * Unit tests para el cascade producto → inventario en ProductsService.update().
 *
 * El catálogo es la fuente de verdad: al actualizar un producto, los campos
 * desnormalizados del inventario deben seguirlo. Cubre:
 *   - cambio de NAME → inventory.productName se actualiza (updateMany).
 *   - name sin cambios → NO se cascadea el nombre.
 *   - cambio de variantSku (mismo _id de variante) → inventory.variantSku se actualiza.
 */

import { ProductsService } from "./products.service";
import { Types } from "mongoose";

describe("ProductsService.update — cascade producto → inventario", () => {
  let service: ProductsService;
  let productModel: any;
  let inventoryModel: any;
  let inventoryMovementModel: any;
  let tenantModel: any;
  let priceHistoryService: any;
  let priceListsService: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const productId = new Types.ObjectId();
  const variantId = new Types.ObjectId();

  const buildModel = () => {
    const model: any = jest.fn();
    model.find = jest.fn();
    model.findOne = jest.fn();
    model.findById = jest.fn();
    model.findByIdAndUpdate = jest.fn();
    model.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    return model;
  };

  const productBefore = (overrides: any = {}) => ({
    _id: productId,
    sku: "TBS-0378",
    name: "Agua Crystal 500ml",
    productType: "simple",
    variants: [
      {
        _id: variantId,
        sku: "TBS-0378",
        name: "Principal",
        basePrice: 1,
        costPrice: 0.5,
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    productModel = buildModel();
    inventoryModel = buildModel();
    inventoryMovementModel = buildModel();
    tenantModel = buildModel();
    priceHistoryService = { recordPriceChange: jest.fn() };
    priceListsService = { assignProduct: jest.fn() };

    tenantModel.findById = jest.fn().mockResolvedValue({
      _id: tenantId,
      usage: { currentStorage: 0 },
      limits: { maxStorage: 10_000_000 },
    });
    tenantModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});

    service = new ProductsService(
      productModel,
      inventoryModel,
      inventoryMovementModel,
      tenantModel,
      {} as any, // customersService
      {} as any, // purchasesService
      {} as any, // suppliersService
      {} as any, // openaiService
      priceHistoryService,
      priceListsService,
      {} as any, // inventoryService
      { startSession: jest.fn() } as any, // connection
    );
  });

  afterEach(() => jest.clearAllMocks());

  const wireUpdate = (before: any, updated: any) => {
    productModel.findById = jest
      .fn()
      .mockReturnValue({ lean: jest.fn().mockResolvedValue(before) });
    productModel.findByIdAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) });
  };

  it("cascadea el cambio de NAME al inventario (productName)", async () => {
    const before = productBefore();
    wireUpdate(before, { ...before, name: "Agua Cristal 600ml" });

    await service.update(
      productId.toString(),
      { name: "Agua Cristal 600ml" } as any,
      { id: userId, tenantId },
    );

    expect(inventoryModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: { $in: [productId, productId.toString()] },
      }),
      { $set: { productName: "Agua Cristal 600ml" } },
    );
  });

  it("NO cascadea el nombre cuando no cambia", async () => {
    const before = productBefore();
    wireUpdate(before, before);

    await service.update(productId.toString(), { brand: "OtraMarca" } as any, {
      id: userId,
      tenantId,
    });

    const nameCascade = inventoryModel.updateMany.mock.calls.find(
      (c: any[]) => c[1]?.$set?.productName !== undefined,
    );
    expect(nameCascade).toBeUndefined();
  });

  it("cascadea variantSku cuando cambia el SKU de la variante (mismo _id)", async () => {
    const before = productBefore();
    wireUpdate(before, before);

    await service.update(
      productId.toString(),
      {
        variants: [
          {
            _id: variantId,
            sku: "TBS-0378-NEW",
            name: "Principal",
            basePrice: 1,
            costPrice: 0.5,
          },
        ],
      } as any,
      { id: userId, tenantId },
    );

    const variantSkuCascade = inventoryModel.updateMany.mock.calls.find(
      (c: any[]) => c[1]?.$set?.variantSku === "TBS-0378-NEW",
    );
    expect(variantSkuCascade).toBeDefined();
    expect(variantSkuCascade[0]).toEqual(
      expect.objectContaining({
        variantId: { $in: [variantId, variantId.toString()] },
      }),
    );
  });
});
