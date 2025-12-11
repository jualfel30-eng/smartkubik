import { Test } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { InventoryAlertsService } from "./inventory-alerts.service";
import { InventoryAlertRule } from "../../schemas/inventory-alert-rule.schema";
import { Inventory } from "../../schemas/inventory.schema";
import { EventsService } from "../events/events.service";
import { Types } from "mongoose";

describe("InventoryAlertsService", () => {
  let service: InventoryAlertsService;
  let alertRuleModel: any;
  let inventoryModel: any;
  let eventsService: any;

  const tenantId = "507f1f77bcf86cd799439011";
  const user = { id: "507f191e810c19729de860ea", tenantId };

  const paginatedQuery = () => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    alertRuleModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
    };
    inventoryModel = {
      updateOne: jest.fn(),
    };
    eventsService = {
      createFromInventoryAlert: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryAlertsService,
        { provide: getModelToken(InventoryAlertRule.name), useValue: alertRuleModel },
        { provide: getModelToken(Inventory.name), useValue: inventoryModel },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compile();

    service = moduleRef.get(InventoryAlertsService);
  });

  afterEach(() => jest.clearAllMocks());

  it("dispara alerta cuando stock cae por debajo del mínimo y no se ha disparado reciente", async () => {
    const rule = {
      minQuantity: 5,
      isActive: true,
      isDeleted: false,
      warehouseId: undefined,
      lastTriggeredAt: undefined,
      productId: "p1",
      tenantId,
      save: jest.fn().mockResolvedValue(null),
    };
    alertRuleModel.find = jest.fn().mockResolvedValue([rule]);
    const inventory: any = {
      _id: "inv1",
      productId: "p1",
      productName: "Prod",
      warehouseId: undefined,
      availableQuantity: 3,
    };

    const triggered = await service.evaluateForInventory(inventory, user);

    expect(triggered).toBe(1);
    expect(eventsService.createFromInventoryAlert).toHaveBeenCalled();
    expect(inventoryModel.updateOne).toHaveBeenCalled();
  });

  it("no dispara alerta si la regla fue disparada hace poco", async () => {
    const rule = {
      minQuantity: 5,
      isActive: true,
      isDeleted: false,
      warehouseId: undefined,
      lastTriggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
      productId: "p1",
      tenantId,
      save: jest.fn().mockResolvedValue(null),
    };
    alertRuleModel.find = jest.fn().mockResolvedValue([rule]);
    const inventory: any = {
      _id: "inv1",
      productId: "p1",
      productName: "Prod",
      warehouseId: undefined,
      availableQuantity: 3,
    };

    const triggered = await service.evaluateForInventory(inventory, user);

    expect(triggered).toBe(0);
    expect(eventsService.createFromInventoryAlert).not.toHaveBeenCalled();
  });

  it("lista reglas con paginación básica", async () => {
    alertRuleModel.find = jest.fn().mockReturnValue(paginatedQuery());
    alertRuleModel.countDocuments = jest.fn().mockResolvedValue(0);
    const result = await service.listRules({ page: 2, limit: 10 }, user);
    expect(alertRuleModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: expect.any(Types.ObjectId), isDeleted: false }),
    );
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(10);
  });
});
