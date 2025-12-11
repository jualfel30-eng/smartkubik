import { ProductsService } from "./products.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";

describe("ProductsService", () => {
  let service: ProductsService;
  let productModel: any;
  let tenantModel: any;
  let categoryModel: any;
  let inventoryService: any;

  const tenantId = new Types.ObjectId().toString();

  const buildModel = () => {
    const model: any = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() }),
    }));
    model.findOne = jest.fn();
    model.find = jest.fn();
    model.findById = jest.fn();
    model.findByIdAndUpdate = jest.fn();
    model.aggregate = jest.fn();
    model.exec = jest.fn();
    return model;
  };

  beforeEach(() => {
    productModel = buildModel();
    tenantModel = buildModel();
    categoryModel = buildModel();
    inventoryService = {
      deductInventory: jest.fn(),
      reverseDeduction: jest.fn(),
    };

    service = new ProductsService(
      productModel as any,
      tenantModel as any,
      categoryModel as any,
      inventoryService as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("create valida SKU único por tenant", async () => {
    productModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: "existing" }),
    });

    await expect(
      service.create(
        { sku: "SKU-1", name: "Prod" } as any,
        { tenantId, id: "u1" } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("create guarda producto con weightSelling", async () => {
    productModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const saved = await service.create(
      { sku: "SKU-2", name: "Carne", weightSelling: true } as any,
      { tenantId, id: "u1" } as any,
    );
    expect(saved._id).toBeDefined();
    expect(productModel).toHaveBeenCalledWith(
      expect.objectContaining({ weightSelling: true }),
    );
  });

  it("create falla con barcodes duplicados en variants", async () => {
    productModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.create(
        {
          sku: "SKU-3",
          name: "Prod dup",
          variants: [
            { name: "v1", barcode: "DUP" },
            { name: "v2", barcode: "DUP" },
          ],
        } as any,
        { tenantId, id: "u1" } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("findByBarcode retorna variant y lanza NotFound si no existe", async () => {
    const product = {
      _id: new Types.ObjectId(),
      variants: [{ name: "Roja", barcode: "ABC" }],
    } as any;
    const lean = jest.fn().mockResolvedValue(product);
    const select = jest.fn().mockReturnThis();
    productModel.findOne.mockReturnValue({
      select,
      lean,
    });

    const result = await service.findByBarcode("ABC", tenantId);
    expect(result.variant?.name).toBe("Roja");
    expect(select).toHaveBeenCalled();

    lean.mockResolvedValue(null);
    await expect(service.findByBarcode("XYZ", tenantId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("update lanza BadRequest si excede almacenamiento por imágenes", async () => {
    productModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: "p1",
        productType: "simple",
        variants: [],
      }),
    });
    tenantModel.findById.mockResolvedValue({
      usage: { currentStorage: 0 },
      limits: { maxStorage: 1 }, // 1 MB
    });
    productModel.findOne.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });

    const bigImage = "a".repeat(4_000_000); // ~3 MB
    await expect(
      service.update(
        "p1",
        { variants: [{ images: [bigImage] }] } as any,
        tenantId,
        "u1",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("update valida barcodes únicos en otros productos", async () => {
    productModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: "p1",
        productType: "simple",
        variants: [{ barcode: "OLD" }],
      }),
    });
    tenantModel.findById.mockResolvedValue({
      usage: { currentStorage: 0 },
      limits: { maxStorage: 10 },
    });
    productModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: "other" }),
      }),
    });

    await expect(
      service.update(
        "p1",
        { variants: [{ barcode: "NEW" }] } as any,
        tenantId,
        "u1",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("update lanza NotFound si no existe", async () => {
    productModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.update("p1", { name: "Nuevo" } as any, tenantId, "u1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("findAll filtra por categoría/status/vertical", async () => {
    const exec = jest.fn().mockResolvedValue([]);
    productModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec,
    });

    await service.findAll(
      { category: "cat1", status: "active", vertical: "food" } as any,
      tenantId,
    );

    expect(productModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        category: "cat1",
        status: "active",
        vertical: "food",
      }),
    );
  });

  it("search aplica regex por nombre/descripcion", async () => {
    const exec = jest.fn().mockResolvedValue([]);
    productModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec,
    });
    await service.search("pizza", tenantId);
    expect(productModel.find).toHaveBeenCalled();
  });
});
