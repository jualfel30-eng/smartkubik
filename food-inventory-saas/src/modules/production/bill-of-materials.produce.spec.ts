import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken, getConnectionToken } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { BadRequestException } from "@nestjs/common";
import { BillOfMaterialsService } from "./bill-of-materials.service";
import { BillOfMaterials } from "../../schemas/bill-of-materials.schema";
import { Product } from "../../schemas/product.schema";
import { InventoryService } from "../inventory/inventory.service";

/**
 * Cobertura del flujo ligero "Producir lote" (produceBatch / previewProduction),
 * incluida la sustitución de insumo al producir (overrides: chispas marca A vs B).
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
  const componentProductId = new Types.ObjectId(); // insumo por defecto (marca A)
  const replacementProductId = new Types.ObjectId(); // marca B (sustituto)
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
    name: "Galletas de chispas",
    productId: finishedProductId,
    productionQuantity: 20,
    productionUnit: "unidad",
    components: [
      { componentProductId, quantity: 2, unit: "kg", scrapPercentage: 0 },
    ],
    isActive: true,
    tenantId,
  };

  // Registro de productos por id y de inventario por sku.
  const productsById: Record<string, any> = {
    [componentProductId.toString()]: {
      _id: componentProductId,
      name: "Chispas marca A",
      sku: "CHISPAS-A",
    },
    [replacementProductId.toString()]: {
      _id: replacementProductId,
      name: "Chispas marca B",
      sku: "CHISPAS-B",
    },
    [finishedProductId.toString()]: {
      _id: finishedProductId,
      name: "Galletas de chispas",
      sku: "GALLETAS-001",
    },
  };
  const invBySku: Record<string, any> = {
    "CHISPAS-A": newInv(5),
    "CHISPAS-B": newInv(8),
    "GALLETAS-001": newInv(0, 10),
  };

  function newInv(avgCost: number, qty = 100) {
    return {
      _id: new Types.ObjectId(),
      totalQuantity: qty,
      availableQuantity: qty,
      averageCostPrice: avgCost,
    };
  }

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

  beforeEach(async () => {
    session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    inventoryService = {
      findByProductSku: jest.fn((sku: string) =>
        Promise.resolve(invBySku[sku] ?? null),
      ),
      adjustInventory: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillOfMaterialsService,
        {
          provide: getModelToken(BillOfMaterials.name),
          useValue: { findOne: jest.fn(() => chain(bom)) },
        },
        {
          provide: getModelToken(Product.name),
          useValue: {
            findById: jest.fn((id: any) =>
              chain(productsById[String(id)] ?? null),
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
    it("descuenta el insumo por defecto y calcula el costo", async () => {
      const result = await service.produceBatch(bomId.toString(), 40, mockUser);

      expect(result.produced).toBe(40);
      expect(result.materialCost).toBe(20); // 4 unidades * costo 5
      expect(result.unitCost).toBe(0.5); // 20 / 40
      expect(result.consumed[0].sku).toBe("CHISPAS-A");
      expect(result.consumed[0].quantity).toBe(4);
      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(2);
      expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it("con override, consume la marca sustituta y su costo", async () => {
      const overrides = [
        {
          componentProductId: componentProductId.toString(),
          replacementProductId: replacementProductId.toString(),
        },
      ];
      const result = await service.produceBatch(
        bomId.toString(),
        40,
        mockUser,
        overrides,
      );

      // Ahora consume marca B (costo 8) en vez de A.
      expect(result.consumed[0].sku).toBe("CHISPAS-B");
      expect(result.consumed[0].quantity).toBe(4);
      expect(result.materialCost).toBe(32); // 4 * 8
      expect(result.unitCost).toBe(0.8); // 32 / 40
    });

    it("promedia el costo del bin al producir sobre stock existente", async () => {
      // Bin con 10 unidades a costo 2; producimos 40 a costo de lote 0.5.
      const finishedInv = {
        _id: new Types.ObjectId(),
        totalQuantity: 10,
        availableQuantity: 10,
        averageCostPrice: 2,
      };
      inventoryService.findByProductSku = jest.fn((sku: string) =>
        Promise.resolve(sku === "GALLETAS-001" ? finishedInv : invBySku[sku]),
      );

      await service.produceBatch(bomId.toString(), 40, mockUser);

      // (10*2 + 40*0.5) / 50 = 0.8 (no 0.5 sobrescrito).
      const finishedCall = inventoryService.adjustInventory.mock.calls[1][0];
      expect(finishedCall.newQuantity).toBe(50);
      expect(finishedCall.newCostPrice).toBeCloseTo(0.8, 5);
    });

    it("lanza y NO muta inventario si falta stock", async () => {
      await expect(
        service.produceBatch(bomId.toString(), 4000, mockUser),
      ).rejects.toThrow(BadRequestException);
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
    it("devuelve disponibilidad y costo del insumo por defecto", async () => {
      const result = await service.previewProduction(
        bomId.toString(),
        40,
        mockUser,
      );
      expect(result.allAvailable).toBe(true);
      expect(result.estimatedCost).toBe(20); // 2*5 por tanda * 2 tandas
      expect(result.estimatedUnitCost).toBe(0.5);
      expect(inventoryService.adjustInventory).not.toHaveBeenCalled();
    });

    it("refleja el costo de la marca sustituta en el preview", async () => {
      const overrides = [
        {
          componentProductId: componentProductId.toString(),
          replacementProductId: replacementProductId.toString(),
        },
      ];
      const result = await service.previewProduction(
        bomId.toString(),
        40,
        mockUser,
        overrides,
      );
      expect(result.estimatedCost).toBe(32); // 2*8 por tanda * 2 tandas
      expect(result.estimatedUnitCost).toBe(0.8);
    });
  });
});
