import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken, getConnectionToken } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { BadRequestException } from "@nestjs/common";
import { BillOfMaterialsService } from "./bill-of-materials.service";
import { BillOfMaterials } from "../../schemas/bill-of-materials.schema";
import { Product } from "../../schemas/product.schema";
import { InventoryService } from "../inventory/inventory.service";

/**
 * Cobertura del flujo ligero "Producir lote" (produceBatch / previewProduction).
 * Verifica el camino feliz (consume materias, suma terminado, costo correcto)
 * y el caso de error (stock insuficiente lanza y NO muta inventario).
 */
describe("BillOfMaterialsService — produceBatch / previewProduction", () => {
  let service: BillOfMaterialsService;
  let inventoryService: {
    findByProductSku: jest.Mock;
    adjustInventory: jest.Mock;
    create: jest.Mock;
  };
  let session: {
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    abortTransaction: jest.Mock;
    endSession: jest.Mock;
  };

  const tenantId = new Types.ObjectId();
  const finishedProductId = new Types.ObjectId();
  const componentProductId = new Types.ObjectId();
  const bomId = new Types.ObjectId();

  const mockUser = {
    _id: new Types.ObjectId().toString(),
    tenantId: tenantId.toString(),
    email: "abasto@test.com",
  };

  // Receta: rinde 20 unidades, lleva 2 unidades de la materia prima por tanda.
  const bom = {
    _id: bomId,
    code: "BOM-GALLETAS",
    name: "Galletas de avena",
    productId: finishedProductId,
    productionQuantity: 20,
    productionUnit: "unidad",
    components: [
      {
        componentProductId,
        quantity: 2,
        unit: "kg",
        scrapPercentage: 0,
      },
    ],
    isActive: true,
    tenantId,
  };

  const componentProduct = {
    _id: componentProductId,
    name: "Avena",
    sku: "AVENA-001",
  };
  const finishedProduct = {
    _id: finishedProductId,
    name: "Galletas de avena",
    sku: "GALLETAS-001",
  };

  // Mongoose chain mock que soporta populate/lean/session/sort y resuelve en exec.
  const chain = (resolved: any) => {
    const c: any = {
      populate: jest.fn(() => c),
      lean: jest.fn(() => c),
      session: jest.fn(() => c),
      sort: jest.fn(() => c),
      exec: jest.fn(() => Promise.resolve(resolved)),
    };
    return c;
  };

  const buildInventory = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(),
    totalQuantity: 100,
    availableQuantity: 100,
    averageCostPrice: 5,
    ...overrides,
  });

  beforeEach(async () => {
    session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    inventoryService = {
      findByProductSku: jest.fn(),
      adjustInventory: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillOfMaterialsService,
        {
          provide: getModelToken(BillOfMaterials.name),
          useValue: {
            findOne: jest.fn(() => chain(bom)),
          },
        },
        {
          provide: getModelToken(Product.name),
          useValue: {
            findById: jest.fn((id: any) =>
              chain(
                id?.toString() === finishedProductId.toString()
                  ? finishedProduct
                  : componentProduct,
              ),
            ),
          },
        },
        {
          provide: getConnectionToken(),
          useValue: { startSession: jest.fn(() => session) },
        },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<BillOfMaterialsService>(BillOfMaterialsService);
  });

  describe("produceBatch", () => {
    it("descuenta materias primas, suma el terminado y calcula el costo", async () => {
      // 40 unidades => 2 tandas => consume 2 * 2 = 4 de la materia prima.
      const componentInv = buildInventory({ averageCostPrice: 5 });
      const finishedInv = buildInventory({ totalQuantity: 10 });
      inventoryService.findByProductSku
        .mockResolvedValueOnce(componentInv) // checkComponentsAvailability
        .mockResolvedValueOnce(componentInv) // consumo en el loop
        .mockResolvedValueOnce(finishedInv); // producto terminado
      inventoryService.adjustInventory.mockResolvedValue({});

      const result = await service.produceBatch(bomId.toString(), 40, mockUser);

      expect(result.produced).toBe(40);
      expect(result.unit).toBe("unidad");
      expect(result.materialCost).toBe(20); // 4 * 5
      expect(result.unitCost).toBe(0.5); // 20 / 40
      expect(result.consumed).toHaveLength(1);
      expect(result.consumed[0].quantity).toBe(4);

      // Una baja de materia + una alta del terminado.
      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(2);
      expect(session.commitTransaction).toHaveBeenCalledTimes(1);
      expect(session.abortTransaction).not.toHaveBeenCalled();
    });

    it("lanza y NO muta inventario si falta stock", async () => {
      // 4000 unidades => 200 tandas => requiere 400; solo hay 100 disponibles.
      inventoryService.findByProductSku.mockResolvedValue(
        buildInventory({ availableQuantity: 100, totalQuantity: 100 }),
      );

      await expect(
        service.produceBatch(bomId.toString(), 4000, mockUser),
      ).rejects.toThrow(BadRequestException);

      // El fallo ocurre en el pre-chequeo, antes de abrir transacción.
      expect(inventoryService.adjustInventory).not.toHaveBeenCalled();
      expect(session.commitTransaction).not.toHaveBeenCalled();
    });

    it("rechaza cantidades no positivas", async () => {
      await expect(
        service.produceBatch(bomId.toString(), 0, mockUser),
      ).rejects.toThrow(BadRequestException);
      expect(inventoryService.adjustInventory).not.toHaveBeenCalled();
    });
  });

  describe("previewProduction", () => {
    it("devuelve disponibilidad y costo estimado sin mutar inventario", async () => {
      inventoryService.findByProductSku.mockResolvedValue(
        buildInventory({ averageCostPrice: 5 }),
      );

      const result = await service.previewProduction(
        bomId.toString(),
        40,
        mockUser,
      );

      expect(result.allAvailable).toBe(true);
      // costo por tanda = 2 * 5 = 10; 2 tandas => 20; unitario 0.5.
      expect(result.estimatedCost).toBe(20);
      expect(result.estimatedUnitCost).toBe(0.5);
      expect(inventoryService.adjustInventory).not.toHaveBeenCalled();
    });
  });
});
