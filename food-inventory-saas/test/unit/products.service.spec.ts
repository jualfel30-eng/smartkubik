import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { ProductsService } from "../../src/modules/products/products.service";
import { Product } from "../../src/schemas/product.schema";
import { Inventory } from "../../src/schemas/inventory.schema";
import { Tenant } from "../../src/schemas/tenant.schema";
import { NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";

describe("ProductsService (unit)", () => {
  let service: ProductsService;
  let productModel: any;
  let inventoryModel: any;
  let tenantModel: any;
  const user = { tenantId: "tenant1" };

  const baseDto = {
    product: {
      sku: "SKU-1",
      name: "Producto 1",
      productType: "simple",
      variants: [
        {
          name: "Var A",
          barcode: "111",
          images: ["YWJjZA=="], // 4 bytes
        },
      ],
    },
    supplier: {
      newSupplierName: "Proveedor",
      newSupplierRif: "J-123",
      newSupplierContactName: "Contacto",
      newSupplierContactPhone: "000",
    },
    purchase: {
      quantity: 1,
      unitCost: 10,
      currency: "USD",
      documentNumber: "PO-1",
    },
  };

  beforeEach(async () => {
    productModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    inventoryModel = {};
    tenantModel = {
      findById: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: productModel },
        { provide: getModelToken(Inventory.name), useValue: inventoryModel },
        { provide: getModelToken(Tenant.name), useValue: tenantModel },
        { provide: "CustomersService", useValue: { create: jest.fn() } as any },
        { provide: "InventoryService", useValue: {} as any },
        { provide: "PurchasesService", useValue: {} as any },
        { provide: getConnectionToken(), useValue: {} },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  it("rechaza si el tenant excede el límite de almacenamiento", async () => {
    tenantModel.findById.mockResolvedValue({
      limits: { maxProducts: 100, maxStorage: 2 },
      usage: { currentProducts: 0, currentStorage: 5 },
    });
    productModel.findOne.mockResolvedValue(null);

    await expect(
      service.createWithInitialPurchase(baseDto as any, user),
    ).rejects.toThrow(BadRequestException);
  });

  it("rechaza SKU duplicado para el tenant", async () => {
    tenantModel.findById.mockResolvedValue({
      limits: { maxProducts: 100, maxStorage: 100000 },
      usage: { currentProducts: 0, currentStorage: 0 },
    });
    productModel.findOne.mockResolvedValue({ _id: "exists" });

    await expect(
      service.createWithInitialPurchase(baseDto as any, user),
    ).rejects.toThrow(BadRequestException);
  });

  it("rechaza si falta información del proveedor nuevo", async () => {
    tenantModel.findById.mockResolvedValue({
      limits: { maxProducts: 100, maxStorage: 100000 },
      usage: { currentProducts: 0, currentStorage: 0 },
    });
    productModel.findOne.mockResolvedValue(null);

    const dto = {
      ...baseDto,
      supplier: { newSupplierName: "", newSupplierRif: "", newSupplierContactName: "" },
    };

    await expect(
      service.createWithInitialPurchase(dto as any, user),
    ).rejects.toThrow(BadRequestException);
  });

  it("rechaza cuando se alcanza el límite de productos del plan", async () => {
    tenantModel.findById.mockResolvedValue({
      limits: { maxProducts: 1, maxStorage: 100000 },
      usage: { currentProducts: 1, currentStorage: 0 },
    });
    productModel.findOne.mockResolvedValue(null);

    await expect(
      service.createWithInitialPurchase(baseDto as any, user),
    ).rejects.toThrow(BadRequestException);
  });

  describe("findByBarcode", () => {
    it("lanza BadRequest si el código está vacío", async () => {
      await expect(service.findByBarcode("  ", "t1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("retorna producto y variante cuando existe", async () => {
      productModel
        .findOne.mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue({
            name: "Prod",
            variants: [{ sku: "V1", barcode: "111" }],
          }),
        });

      const result = await service.findByBarcode("111", "t1");
      expect(result.product.name).toBe("Prod");
      expect(result.variant?.sku).toBe("V1");
    });

    it("lanza NotFound si no hay coincidencias", async () => {
      productModel
        .findOne.mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(null),
        });

      await expect(service.findByBarcode("999", "t1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createWithInitialPurchase (happy path)", () => {
    it("crea producto cuando límites son válidos", async () => {
      tenantModel.findById.mockResolvedValue({
        limits: { maxProducts: 10, maxStorage: 100000 },
        usage: { currentProducts: 0, currentStorage: 0 },
      });
      productModel.findOne.mockResolvedValue(null);
      productModel.create.mockImplementation(async (data: any) => ({
        ...data,
        _id: "prod1",
      }));
      (service as any).inventoryService = {
        create: jest.fn().mockResolvedValue({ _id: "inv1" }),
      };
      (service as any).purchasesService = {
        createPurchaseOrder: jest.fn().mockResolvedValue({ _id: "po1" }),
      };
      (service as any).customersService = {
        create: jest.fn().mockResolvedValue({ _id: "sup1" }),
      };

      const result = await service.createWithInitialPurchase(baseDto as any, user);
      expect(result._id).toBe("prod1");
      expect((service as any).inventoryService.create).toHaveBeenCalled();
      expect((service as any).purchasesService.createPurchaseOrder).toHaveBeenCalled();
    });
  });

  describe("barcodes duplicados entre productos", () => {
    it("lanza BadRequest si variante ya existe en otro producto", async () => {
      tenantModel.findById.mockResolvedValue({
        limits: { maxProducts: 10, maxStorage: 100000 },
        usage: { currentProducts: 0, currentStorage: 0 },
      });
      productModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
        name: "OtroProd",
        sku: "SKU-OTHER",
      });

      const dto = {
        product: {
          sku: "SKU-NEW",
          name: "Producto Nuevo",
          productType: "simple",
          variants: [{ name: "Var A", barcode: "111" }],
        },
        supplier: {
          newSupplierName: "Proveedor",
          newSupplierRif: "J-123",
          newSupplierContactName: "Contacto",
        },
        purchase: { quantity: 1, unitCost: 10, currency: "USD", documentNumber: "PO-1" },
      };

      await expect(
        service.createWithInitialPurchase(dto as any, user),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
