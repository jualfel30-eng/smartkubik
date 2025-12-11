import { Types } from "mongoose";
import { KitchenDisplayService } from "./kitchen-display.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("KitchenDisplayService", () => {
  let service: KitchenDisplayService;
  let kitchenOrderModel: any;
  let orderModel: any;
  let savedKitchenOrder: any;

  const tenantId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId();
  const baseOrder = {
    _id: orderId,
    orderNumber: "ORD-1",
    items: [
      {
        _id: new Types.ObjectId(),
        productName: "Pizza",
        quantity: 2,
        modifiers: [{ name: "Extra cheese" }],
        specialInstructions: "No onions",
      },
    ],
    customerName: "John",
    shipping: { method: "delivery" },
    tenantId,
  } as any;

  const buildKitchenOrderModel = () => {
    const factory: any = jest.fn().mockImplementation((payload) => {
      savedKitchenOrder = {
        ...payload,
        save: jest.fn().mockResolvedValue(payload),
      };
      return savedKitchenOrder;
    });
    factory.findOne = jest.fn();
    factory.findOneAndUpdate = jest.fn();
    factory.find = jest.fn();
    factory.aggregate = jest.fn();
    return factory;
  };

  beforeEach(() => {
    kitchenOrderModel = buildKitchenOrderModel();
    orderModel = {
      findOne: jest.fn(),
    };

    service = new KitchenDisplayService(
      kitchenOrderModel as any,
      orderModel as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    savedKitchenOrder = null;
  });

  it("createFromOrder mapea items, modifiers y prioridad por defecto", async () => {
    orderModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(baseOrder) });
    kitchenOrderModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const dto = { orderId: orderId.toString(), priority: "normal" } as any;
    const result = await service.createFromOrder(dto, tenantId);

    expect(kitchenOrderModel.findOne).toHaveBeenCalledWith(
      { orderId, tenantId, isDeleted: false },
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].modifiers).toEqual(["Extra cheese"]);
    expect(result.items[0].specialInstructions).toBe("No onions");
    expect(result.priority).toBe("normal");
    expect(result.status).toBe("new");
  });

  it("createFromOrder calcula estimatedPrepTime cuando no viene en dto", async () => {
    orderModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(baseOrder) });
    kitchenOrderModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const dto = { orderId: orderId.toString() } as any;
    const result = await service.createFromOrder(dto, tenantId);

    // 5 minutos base + (items-1)*2
    expect(result.estimatedPrepTime).toBe(5);
  });

  it("findActive filtra por status/station/priority", async () => {
    const execMock = jest.fn().mockResolvedValue([]);
    kitchenOrderModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      exec: execMock,
    });

    await service.findActive(
      { status: "preparing", station: "grill", priority: "urgent" } as any,
      tenantId,
    );

    expect(kitchenOrderModel.find).toHaveBeenCalledWith({
      tenantId,
      isDeleted: false,
      status: { $in: ["new", "preparing", "ready"] },
      station: "grill",
      priority: "urgent",
    });
    expect(execMock).toHaveBeenCalled();
  });

  it("cancel marca status cancelled y guarda razón", async () => {
    const updated = { orderNumber: "ORD-1", status: "cancelled", notes: "Cliente canceló" };
    kitchenOrderModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updated),
    });

    const result = await service.cancel(
      { kitchenOrderId: "k1", reason: "Cliente canceló" } as any,
      tenantId,
    );

    expect(result.status).toBe("cancelled");
    expect(result.notes).toBe("Cliente canceló");
  });

  it("lanza NotFound si la orden no existe", async () => {
    orderModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const dto = { orderId: orderId.toString() } as any;
    await expect(service.createFromOrder(dto, tenantId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("updateItemStatus cambia a preparing y setea startedAt/waitTime", async () => {
    const kitchenOrder = {
      _id: new Types.ObjectId(),
      orderNumber: "ORD-1",
      receivedAt: new Date(Date.now() - 1000),
      items: [
        { itemId: "1", status: "pending" },
        { itemId: "2", status: "pending" },
      ],
      save: jest.fn().mockResolvedValue(null),
    };
    kitchenOrderModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(kitchenOrder),
    });

    await service.updateItemStatus(
      {
        kitchenOrderId: kitchenOrder._id.toString(),
        itemId: "1",
        status: "preparing",
      } as any,
      tenantId,
    );

    expect(kitchenOrder.status).toBe("preparing");
    expect(kitchenOrder.startedAt).toBeInstanceOf(Date);
    expect(kitchenOrder.waitTime).toBeGreaterThanOrEqual(0);
  });

  it("updateItemStatus a ready calcula prepTime y marca order ready si todos listos", async () => {
    const now = Date.now();
    const kitchenOrder = {
      _id: new Types.ObjectId(),
      orderNumber: "ORD-1",
      receivedAt: new Date(now - 5000),
      items: [
        { itemId: "1", status: "preparing", startedAt: new Date(now - 3000) },
        { itemId: "2", status: "ready" },
      ],
      save: jest.fn().mockResolvedValue(null),
    };
    kitchenOrderModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(kitchenOrder),
    });

    await service.updateItemStatus(
      {
        kitchenOrderId: kitchenOrder._id.toString(),
        itemId: "1",
        status: "ready",
      } as any,
      tenantId,
    );

    const updated = kitchenOrder.items.find((i: any) => i.itemId === "1");
    expect(updated?.prepTime).toBeGreaterThan(0);
    expect(kitchenOrder.status).toBe("ready");
  });

  it("markUrgent cambia isUrgent y prioridad asap", async () => {
    const updatedOrder = { orderNumber: "ORD-1", isUrgent: true, priority: "asap" };
    kitchenOrderModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updatedOrder),
    });

    const result = await service.markUrgent(
      { kitchenOrderId: "k1", isUrgent: true } as any,
      tenantId,
    );

    expect(result.isUrgent).toBe(true);
    expect(result.priority).toBe("asap");
  });

  it("bumpOrder marca completed y setea totalPrepTime", async () => {
    const kitchenOrder = {
      _id: new Types.ObjectId(),
      orderNumber: "ORD-1",
      status: "preparing",
      startedAt: new Date(Date.now() - 4000),
      items: [],
      save: jest.fn().mockResolvedValue(null),
    };
    kitchenOrderModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(kitchenOrder),
    });

    const result = await service.bumpOrder(
      { kitchenOrderId: kitchenOrder._id.toString(), notes: "Listo" } as any,
      tenantId,
    );

    expect(result.status).toBe("completed");
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.totalPrepTime).toBeGreaterThan(0);
  });

  it("reopen solo permite órdenes completadas", async () => {
    const kitchenOrder = {
      _id: new Types.ObjectId(),
      orderNumber: "ORD-1",
      status: "completed",
      items: [{ status: "ready" }],
      save: jest.fn().mockResolvedValue(null),
    };
    kitchenOrderModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(kitchenOrder),
    });

    const reopened = await service.reopen(
      { kitchenOrderId: kitchenOrder._id.toString() } as any,
      tenantId,
    );

    expect(reopened.status).toBe("ready");

    kitchenOrder.status = "preparing";
    await expect(
      service.reopen(
        { kitchenOrderId: kitchenOrder._id.toString() } as any,
        tenantId,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
