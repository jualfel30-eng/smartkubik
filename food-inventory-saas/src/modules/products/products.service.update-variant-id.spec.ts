/**
 * Regresión: ProductsService.update() debe PRESERVAR el _id de las variantes
 * existentes. findByIdAndUpdate reemplaza el arreglo de variants y Mongoose
 * regenera el _id de cualquier subdoc que no lo traiga; un _id nuevo huérfana el
 * inventario vinculado por variantId y dispara inventarios DUPLICADOS por producto.
 * El backend re-vincula el _id existente por SKU aunque el cliente no lo mande.
 */
import { ProductsService } from "./products.service";
import { Types } from "mongoose";

describe("ProductsService.update — preserva _id de variante", () => {
  let service: ProductsService;
  let productModel: any;
  let tenantModel: any;
  let priceHistoryService: any;
  let priceListsService: any;
  let capturedUpdate: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const productId = new Types.ObjectId().toString();
  const existingVariantId = new Types.ObjectId();

  const buildModel = () => {
    const model: any = jest.fn();
    model.find = jest.fn();
    model.findOne = jest.fn();
    model.findById = jest.fn();
    model.findByIdAndUpdate = jest.fn();
    model.updateMany = jest.fn();
    return model;
  };

  beforeEach(() => {
    productModel = buildModel();
    tenantModel = buildModel();
    priceHistoryService = { recordPriceChange: jest.fn().mockResolvedValue(undefined) };
    priceListsService = { assignProduct: jest.fn().mockResolvedValue(undefined) };

    tenantModel.findById = jest.fn().mockResolvedValue({
      usage: { currentStorage: 0 },
      limits: { maxStorage: 1_000_000_000 },
    });

    productModel.findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: productId,
        sku: "TST-0001",
        name: "Test",
        productType: "simple",
        variants: [
          { _id: existingVariantId, sku: "TST-0001", name: "Default", basePrice: 10, costPrice: 5 },
        ],
      }),
    });

    capturedUpdate = null;
    productModel.findByIdAndUpdate = jest.fn().mockImplementation((id: any, data: any) => {
      capturedUpdate = data;
      return { exec: jest.fn().mockResolvedValue({ _id: id, ...data }) };
    });

    service = new ProductsService(
      productModel,
      buildModel(), // inventoryModel
      buildModel(), // inventoryMovementModel
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

  it("re-vincula el _id existente cuando el DTO no lo trae (match por SKU)", async () => {
    const dto: any = {
      variants: [{ sku: "TST-0001", name: "Default", basePrice: 12, costPrice: 5 }], // SIN _id
    };

    await service.update(productId, dto, { id: userId, tenantId });

    expect(capturedUpdate?.variants).toHaveLength(1);
    expect(capturedUpdate.variants[0]._id?.toString()).toBe(existingVariantId.toString());
  });

  it("respeta el _id si el cliente sí lo envía", async () => {
    const dto: any = {
      variants: [{ _id: existingVariantId, sku: "TST-0001", name: "Default", basePrice: 12 }],
    };

    await service.update(productId, dto, { id: userId, tenantId });

    expect(capturedUpdate.variants[0]._id.toString()).toBe(existingVariantId.toString());
  });

  it("una variante nueva (SKU no existente) queda sin _id forzado (Mongoose le asignará uno)", async () => {
    const dto: any = {
      variants: [{ sku: "TST-0001-VAR2", name: "Nueva", basePrice: 8 }], // SKU que no existe antes
    };

    await service.update(productId, dto, { id: userId, tenantId });

    expect(capturedUpdate.variants[0]._id).toBeUndefined();
  });
});
