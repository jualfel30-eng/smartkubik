import { Test } from "@nestjs/testing";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { InventoryService } from "../../src/modules/inventory/inventory.service";
import { EventsService } from "../../src/modules/events/events.service";
import {
  Inventory,
  InventoryMovement,
} from "../../src/schemas/inventory.schema";
import { Product } from "../../src/schemas/product.schema";

describe("InventoryService (unit)", () => {
  let service: InventoryService;
  let inventoryModel: any;
  let movementModel: any;
  let productModel: any;

  const user = { id: "user1", tenantId: new Types.ObjectId().toString() };

  beforeEach(async () => {
    inventoryModel = {
      collection: { dropIndex: jest.fn().mockReturnThis() },
      findOne: jest.fn(),
      findById: jest.fn(),
    };
    movementModel = {
      create: jest.fn(),
      find: jest.fn(),
    };
    productModel = {
      findById: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getModelToken(Inventory.name), useValue: inventoryModel },
        { provide: getModelToken(InventoryMovement.name), useValue: movementModel },
        { provide: getModelToken(Product.name), useValue: productModel },
        { provide: getConnectionToken(), useValue: { } },
        { provide: EventsService, useValue: { emit: jest.fn() } as any },
      ],
    }).compile();

    service = module.get(InventoryService);
  });

  it("lanza error si no existe inventario al crear movimiento", async () => {
    inventoryModel.findById.mockResolvedValue(null);

    await expect(
      service.createMovement(
        {
          inventoryId: "inv1",
          productSku: "SKU-1",
          movementType: "out",
          quantity: 1,
          unitCost: 10,
          totalCost: 10,
          reason: "test",
        } as any,
        user,
      ),
    ).rejects.toThrow("Inventario no encontrado");
  });

  it("retorna false al eliminar inventario inexistente", async () => {
    inventoryModel.findOne.mockResolvedValue(null);
    const result = await service.remove("inv1", user.tenantId, user);
    expect(result).toBe(false);
  });

  it("crea un movimiento de entrada cuando hay cantidad inicial", async () => {
    const movementSpy = jest
      .spyOn<any, any>(service as any, "createMovementRecord")
      .mockResolvedValue({ _id: "mov1" });

    inventoryModel.findOne.mockResolvedValue(null);
    inventoryModel.inventoryModel = inventoryModel;
    inventoryModel.save = jest.fn();
    const saveMock = jest.fn().mockResolvedValue({
      _id: "inv1",
      totalQuantity: 5,
      availableQuantity: 5,
      reservedQuantity: 0,
      averageCostPrice: 10,
    });
    inventoryModel.inventoryModel = jest.fn();
    const doc: any = {
      ...inventoryModel,
      save: saveMock,
    };
    (InventoryService as any).prototype = service;
    inventoryModel = Object.assign(jest.fn().mockImplementation(() => doc), {
      collection: { dropIndex: jest.fn() },
      findOne: jest.fn().mockResolvedValue(null),
    });

    // Reinyectar con el nuevo mock de constructor
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getModelToken(Inventory.name), useValue: inventoryModel },
        { provide: getModelToken(InventoryMovement.name), useValue: movementModel },
        { provide: getModelToken(Product.name), useValue: productModel },
        { provide: getConnectionToken(), useValue: {} },
        { provide: EventsService, useValue: { emit: jest.fn() } as any },
      ],
    }).compile();
    service = module.get(InventoryService);

    await service.create(
      {
        productId: new Types.ObjectId().toString(),
        productSku: "SKU-INIT",
        productName: "Init",
        totalQuantity: 5,
        averageCostPrice: 10,
      } as any,
      user,
    );

    expect(movementSpy).toHaveBeenCalled();
  });

  it("crea movimiento cuando existe inventario y se actualizan cantidades", async () => {
    const inventory = {
      _id: "inv1",
      productId: new Types.ObjectId(),
      productSku: "SKU-1",
      availableQuantity: 10,
      reservedQuantity: 0,
      totalQuantity: 10,
      averageCostPrice: 5,
    };
    inventoryModel.findById.mockResolvedValue(inventory);
    jest
      .spyOn<any, any>(service as any, "updateInventoryQuantities")
      .mockResolvedValue({
        ...inventory,
        totalQuantity: 11,
        availableQuantity: 11,
        averageCostPrice: 6,
      });
    jest
      .spyOn<any, any>(service as any, "createMovementRecord")
      .mockResolvedValue({ _id: "mov1" });

    const movement = await service.createMovement(
      {
        inventoryId: "inv1",
        productSku: "SKU-1",
        movementType: "in",
        quantity: 1,
        unitCost: 6,
        totalCost: 6,
        reason: "ajuste",
      } as any,
      user,
    );

    expect(movement._id).toBe("mov1");
  });

  it("impide eliminar inventario con unidades reservadas", async () => {
    inventoryModel.findOne.mockResolvedValue({
      reservedQuantity: 2,
    });

    await expect(
      service.remove("inv1", user.tenantId, user),
    ).rejects.toThrow("No se puede eliminar el inventario porque hay unidades reservadas.");
  });

  it("elimina (soft delete) cuando no hay reservas", async () => {
    const save = jest.fn().mockResolvedValue(true);
    const inventory = {
      reservedQuantity: 0,
      isActive: true,
      save,
      lots: [],
      alerts: {},
      metrics: {},
    };
    inventoryModel.findOne.mockResolvedValue(inventory);

    const result = await service.remove("inv1", user.tenantId, user);

    expect(result).toBe(true);
    expect(inventory.isActive).toBe(false);
    expect(save).toHaveBeenCalled();
  });

  it("reactiva inventario inactivo y limpia cantidades", async () => {
    const save = jest.fn().mockResolvedValue(true);
    const inventory = {
      reservedQuantity: 0,
      set: jest.fn(),
      save,
      isActive: false,
    };
    inventoryModel.findOne.mockResolvedValue(inventory);

    const dto = {
      productId: new Types.ObjectId().toString(),
      productSku: "SKU-1",
      productName: "Prod",
      totalQuantity: 0,
      averageCostPrice: 0,
    };

    const result = await service.create(dto as any, user);

    expect(inventory.set).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  describe("reserveInventory / releaseInventory", () => {
    it("reserva inventario si hay stock suficiente", async () => {
      const save = jest.fn().mockResolvedValue(true);
      const inventoryDoc: any = {
        _id: new Types.ObjectId(),
        productId: new Types.ObjectId(),
        productSku: "SKU-RES",
        availableQuantity: 5,
        reservedQuantity: 0,
        averageCostPrice: 10,
        totalQuantity: 5,
        save,
        tenantId: user.tenantId,
      };
      inventoryModel.findOne.mockResolvedValue(inventoryDoc);
      jest
        .spyOn<any, any>(service as any, "createMovementRecord")
        .mockResolvedValue({ _id: "mov-res" });

      await service.reserveInventory(
        { items: [{ productSku: "SKU-RES", quantity: 2 }], orderId: "ord1" },
        user,
      );

      expect(inventoryDoc.availableQuantity).toBe(3);
      expect(inventoryDoc.reservedQuantity).toBe(2);
      expect(save).toHaveBeenCalled();
    });

    it("lanza error si stock es insuficiente al reservar", async () => {
      const inventoryDoc: any = {
        _id: new Types.ObjectId(),
        productId: new Types.ObjectId(),
        productSku: "SKU-RES",
        availableQuantity: 1,
        reservedQuantity: 0,
        averageCostPrice: 10,
        totalQuantity: 1,
        save: jest.fn(),
        tenantId: user.tenantId,
      };
      inventoryModel.findOne.mockResolvedValue(inventoryDoc);

      await expect(
        service.reserveInventory(
          { items: [{ productSku: "SKU-RES", quantity: 3 }], orderId: "ord1" },
          user,
        ),
      ).rejects.toThrow("Stock insuficiente");
    });

    it("libera inventario reservado y crea movimiento release", async () => {
      const save = jest.fn().mockResolvedValue(true);
      const inventoryDoc: any = {
        _id: new Types.ObjectId(),
        productId: new Types.ObjectId(),
        productSku: "SKU-RES",
        availableQuantity: 1,
        reservedQuantity: 2,
        averageCostPrice: 10,
        totalQuantity: 3,
        save,
        tenantId: user.tenantId,
      };
      movementModel.find.mockReturnValue({
        session: jest.fn().mockResolvedValue([
          {
            inventoryId: inventoryDoc._id,
            productSku: "SKU-RES",
            quantity: 2,
            unitCost: 10,
            totalCost: 20,
          },
        ]),
      });
      inventoryModel.findById.mockResolvedValue(inventoryDoc);
      jest
        .spyOn<any, any>(service as any, "createMovementRecord")
        .mockResolvedValue({ _id: "mov-rel" });

      await service.releaseInventory(
        { orderId: "ord1" } as any,
        user,
      );

      expect(inventoryDoc.availableQuantity).toBe(3);
      expect(inventoryDoc.reservedQuantity).toBe(0);
      expect(save).toHaveBeenCalled();
    });
  });

  describe("commitInventory / adjustInventory", () => {
    it("commitInventory descuenta reservado y total, creando movimiento out", async () => {
      const save = jest.fn().mockResolvedValue(true);
      const inventoryDoc: any = {
        _id: new Types.ObjectId(),
        productId: new Types.ObjectId(),
        productSku: "SKU-OUT",
        availableQuantity: 5,
        reservedQuantity: 2,
        totalQuantity: 7,
        averageCostPrice: 3,
        save,
        tenantId: user.tenantId,
        alerts: {},
        lots: [],
      };
      inventoryModel.findOne = jest.fn().mockResolvedValue(inventoryDoc);
      jest
        .spyOn<any, any>(service as any, "createMovementRecord")
        .mockResolvedValue({ _id: "mov-out" });
      jest
        .spyOn<any, any>(service as any, "checkAndCreateAlerts")
        .mockResolvedValue(null);

      await service.commitInventory(
        {
          _id: "order1",
          orderNumber: "ORD-1",
          items: [{ productSku: "SKU-OUT", quantity: 2, costPrice: 3 }],
        },
        user,
      );

      expect(inventoryDoc.reservedQuantity).toBe(0);
      expect(inventoryDoc.totalQuantity).toBe(5);
      expect(save).toHaveBeenCalled();
    });

    it("adjustInventory recalcula quantities y crea movimiento", async () => {
      const save = jest.fn().mockResolvedValue(true);
      const inventoryDoc: any = {
        _id: new Types.ObjectId(),
        productId: new Types.ObjectId(),
        productSku: "SKU-ADJ",
        totalQuantity: 5,
        availableQuantity: 5,
        reservedQuantity: 0,
        averageCostPrice: 10,
        save,
        alerts: {},
        lots: [],
        tenantId: user.tenantId,
      };
      inventoryModel.findById.mockResolvedValue(inventoryDoc);
      jest
        .spyOn<any, any>(service as any, "createMovementRecord")
        .mockResolvedValue({ _id: "mov-adj" });
      productModel.findById.mockResolvedValue({
        inventoryConfig: {},
        shelfLifeDays: 0,
        name: "Prod",
        sku: "SKU-ADJ",
      });
      jest
        .spyOn<any, any>(service as any, "checkAndCreateAlerts")
        .mockResolvedValue(null);

      const result = await service.adjustInventory(
        {
          inventoryId: inventoryDoc._id.toString(),
          newQuantity: 7,
          newCostPrice: 12,
          reason: "ajuste manual",
        } as any,
        user,
      );

      expect(result.totalQuantity).toBe(7);
      expect(result.availableQuantity).toBe(7);
      expect(result.averageCostPrice).toBe(12);
      expect(save).toHaveBeenCalled();
    });

    it("checkAndCreateAlerts marca lowStock y genera alertas si corresponde", async () => {
      const inventoryDoc: any = {
        _id: new Types.ObjectId(),
        productId: new Types.ObjectId(),
        productSku: "SKU-ALERT",
        availableQuantity: 1,
        reservedQuantity: 0,
        totalQuantity: 1,
        averageCostPrice: 10,
        alerts: {},
        lots: [],
        tenantId: user.tenantId,
      };
      productModel.findById.mockResolvedValue({
        name: "Prod Alert",
        sku: "SKU-ALERT",
        inventoryConfig: { minimumStock: 2, trackExpiration: false },
      });
      const eventsSpy = jest
        .spyOn<any, any>(service as any, "eventsService", "get")
        .mockReturnValue({
          createFromInventoryAlert: jest.fn().mockResolvedValue(true),
        });

      // Ejecutar método privado vía bracket notation
      await (service as any).checkAndCreateAlerts(inventoryDoc, user, null);

      expect(eventsSpy().createFromInventoryAlert).toHaveBeenCalled();
      expect(inventoryDoc.alerts.lowStock).toBe(true);
    });
  });
});
