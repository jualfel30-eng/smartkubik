import { Test } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { InventoryMovementsService } from "./inventory-movements.service";
import {
  Inventory,
  InventoryMovement,
} from "../../schemas/inventory.schema";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MovementType } from "../../dto/inventory-movement.dto";
import { Types } from "mongoose";
import { InventoryAlertsService } from "./inventory-alerts.service";

describe("InventoryMovementsService", () => {
  let service: InventoryMovementsService;
  let inventoryModel: any;
  let movementModel: any;
  let warehouseModel: any;
  let productModel: any;
  let alertsService: any;
  const TENANT_ID = "507f1f77bcf86cd799439011";
  const USER_ID = "507f191e810c19729de860ea";

  const buildQueryModel = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const buildConstructorModel = () => {
    const ctor: any = jest.fn();
    ctor.prototype = {};
    ctor.find = jest.fn();
    ctor.countDocuments = jest.fn();
    return ctor;
  };

  beforeEach(async () => {
    inventoryModel = buildQueryModel();
    movementModel = buildConstructorModel();
    warehouseModel = buildQueryModel();
    productModel = buildQueryModel();
    alertsService = { evaluateForInventory: jest.fn().mockResolvedValue(0) };

    const module = await Test.createTestingModule({
      providers: [
        InventoryMovementsService,
        { provide: getModelToken(Inventory.name), useValue: inventoryModel },
        {
          provide: getModelToken(InventoryMovement.name),
          useValue: movementModel,
        },
        { provide: getModelToken("Warehouse"), useValue: warehouseModel },
        { provide: getModelToken("Product"), useValue: productModel },
        { provide: InventoryAlertsService, useValue: alertsService },
      ],
    }).compile();

    service = module.get(InventoryMovementsService);
  });

  afterEach(() => jest.clearAllMocks());

  it("respeta paginación con filtros numéricos", async () => {
    movementModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
      exec: jest.fn().mockResolvedValue([]),
    });
    movementModel.countDocuments.mockResolvedValue(0);
    const result = await service.findAll(TENANT_ID, {
      page: 2 as any,
      limit: 50 as any,
      movementType: MovementType.IN,
    });
    expect(movementModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: expect.any(Types.ObjectId),
        movementType: MovementType.IN,
      }),
    );
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(50);
  });

  it("lanza NotFound si no existe inventario", async () => {
    inventoryModel.findOne.mockResolvedValue(null);
    await expect(
      service.create(
        {
          inventoryId: "inv1",
          movementType: MovementType.IN,
          quantity: 1,
          unitCost: 1,
        } as any,
        TENANT_ID,
        USER_ID,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("crea movimiento IN y aumenta stock", async () => {
    const saveInv = jest.fn().mockResolvedValue(null);
    inventoryModel.findOne.mockResolvedValue({
      _id: "inv1",
      productId: "p1",
      productSku: "SKU",
      isActive: true,
      availableQuantity: 0,
      totalQuantity: 0,
      reservedQuantity: 0,
      averageCostPrice: 0,
      save: saveInv,
    });
    productModel.findOne = jest.fn().mockResolvedValue({ _id: "p1", isActive: true });
    const saveMov = jest.fn().mockResolvedValue({ _id: "mov1" });
    movementModel.mockImplementation((data) => ({ ...data, save: saveMov }));

    const movement = await service.create(
      {
        inventoryId: "inv1",
        movementType: MovementType.IN,
        quantity: 5,
        unitCost: 2,
      } as any,
      TENANT_ID,
      USER_ID,
    );

    expect(saveInv).toHaveBeenCalled();
    expect(movement).toBeDefined();
  });

  it("evita salida si stock insuficiente", async () => {
    inventoryModel.findOne.mockResolvedValue({
      _id: "inv1",
      productId: "p1",
      productSku: "SKU",
      isActive: true,
      availableQuantity: 1,
      totalQuantity: 1,
      reservedQuantity: 0,
      averageCostPrice: 0,
      save: jest.fn(),
    });
    productModel.findOne = jest.fn().mockResolvedValue({ _id: "p1", isActive: true });
    await expect(
      service.create(
        {
          inventoryId: "inv1",
          movementType: MovementType.OUT,
          quantity: 2,
          unitCost: 1,
        } as any,
        TENANT_ID,
        USER_ID,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("rechaza movimientos si el producto está inactivo", async () => {
    inventoryModel.findOne.mockResolvedValue({
      _id: "inv1",
      productId: "p1",
      productSku: "SKU",
      isActive: true,
      availableQuantity: 5,
      totalQuantity: 5,
      reservedQuantity: 0,
      averageCostPrice: 0,
      save: jest.fn(),
    });
    productModel.findOne = jest.fn().mockResolvedValue({ _id: "p1", isActive: false });

    await expect(
      service.create(
        {
          inventoryId: "inv1",
          movementType: MovementType.OUT,
          quantity: 1,
          unitCost: 1,
        } as any,
        TENANT_ID,
        USER_ID,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("acepta salida si enforceStock=false aunque quede negativo", async () => {
    const save = jest.fn().mockResolvedValue(null);
    inventoryModel.findOne.mockResolvedValue({
      _id: "inv1",
      productId: "p1",
      productSku: "SKU",
      availableQuantity: 1,
      totalQuantity: 1,
      reservedQuantity: 0,
      averageCostPrice: 0,
      save,
    });
    productModel.findOne = jest.fn().mockResolvedValue({ _id: "p1", isActive: true });
    const saveMov = jest.fn().mockResolvedValue({ _id: "mov2" });
    movementModel.mockImplementation((data) => ({ ...data, save: saveMov }));

    const movement = await service.create(
      {
        inventoryId: "inv1",
        movementType: MovementType.OUT,
        quantity: 5,
        unitCost: 1,
      } as any,
      TENANT_ID,
      USER_ID,
      false, // enforceStock off
    );

    expect(movement).toBeDefined();
    expect(save).toHaveBeenCalled();
  });
});
