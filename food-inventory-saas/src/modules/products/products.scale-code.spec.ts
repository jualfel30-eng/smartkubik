import { ProductsService } from "./products.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";

/**
 * Cobertura de generateScaleCode (PLU de balanza) y findByScaleCode.
 */
describe("ProductsService — scaleCode (PLU de balanza)", () => {
  let service: ProductsService;
  let productModel: any;
  const tenantId = new Types.ObjectId().toString();

  const buildModel = () => {
    const model: any = jest.fn();
    model.findOne = jest.fn();
    model.find = jest.fn();
    model.findById = jest.fn();
    return model;
  };

  beforeEach(() => {
    productModel = buildModel();
    service = new ProductsService(
      productModel as any, // Product
      buildModel() as any, // Inventory
      buildModel() as any, // InventoryMovement
      buildModel() as any, // Tenant
      {} as any, // customersService
      {} as any, // purchasesService
      {} as any, // suppliersService
      {} as any, // openaiService
      {} as any, // priceHistoryService
      {} as any, // priceListsService
      {} as any, // inventoryService
      {} as any, // connection
    );
  });

  afterEach(() => jest.clearAllMocks());

  // Chain mocks
  const findChain = (resolved: any) => ({
    sort: () => ({
      limit: () => ({
        select: () => ({ lean: () => Promise.resolve(resolved) }),
      }),
    }),
  });
  const findOneLean = (resolved: any) => ({
    lean: () => Promise.resolve(resolved),
  });
  const findOneSelectLean = (resolved: any) => ({
    select: () => ({ lean: () => Promise.resolve(resolved) }),
  });

  describe("generateScaleCode", () => {
    it("genera 00001 (zero-padded a 5) cuando no hay PLUs previos", async () => {
      productModel.find.mockReturnValue(findChain([]));
      productModel.findOne.mockReturnValue(findOneLean(null));

      const code = await service.generateScaleCode(tenantId);
      expect(code).toBe("00001");
    });

    it("genera MAX+1 a partir del último PLU", async () => {
      productModel.find.mockReturnValue(findChain([{ scaleCode: "00007" }]));
      productModel.findOne.mockReturnValue(findOneLean(null));

      const code = await service.generateScaleCode(tenantId);
      expect(code).toBe("00008");
    });
  });

  describe("findByScaleCode", () => {
    it("resuelve producto + variante base por PLU", async () => {
      productModel.findOne.mockReturnValue(
        findOneSelectLean({
          name: "Almendras Broas",
          variants: [{ sku: "V1", basePrice: 80 }],
        }),
      );

      const result = await service.findByScaleCode("00008", tenantId);
      expect(result.product.name).toBe("Almendras Broas");
      expect(result.variant.basePrice).toBe(80);
    });

    it("rechaza código vacío", async () => {
      await expect(service.findByScaleCode("", tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("lanza NotFound si no existe el PLU", async () => {
      productModel.findOne.mockReturnValue(findOneSelectLean(null));
      await expect(service.findByScaleCode("99999", tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
