import { TransferOrdersService } from "./transfer-orders.service";
import { BadRequestException } from "@nestjs/common";
import { Types } from "mongoose";
import {
  TransferOrderStatus,
  TransferRequestType,
} from "../../schemas/transfer-order.schema";

/**
 * Regresión del bug de despacho no-atómico (incidente 2026-06-16):
 * - ship() debe validar TODOS los ítems antes de descontar ninguno; si uno no
 *   alcanza, NO se debe descontar inventario, crear movimientos ni avanzar el
 *   estado (rollback total / nada committeado).
 * - ship() exitoso registra balanceBefore + balanceAfter por movimiento.
 * - cancel() repone al origen los movimientos OUT no recibidos.
 */
describe("TransferOrdersService — despacho atómico", () => {
  let service: TransferOrdersService;
  let transferOrderModel: any;
  let inventoryModel: any;
  let movementModel: any;
  let connection: any;
  let session: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  const noopModel = () => {
    const m: any = jest.fn();
    m.find = jest.fn();
    m.findOne = jest.fn();
    m.findById = jest.fn();
    m.create = jest.fn().mockResolvedValue([{}]);
    return m;
  };

  const buildOrder = (overrides: any = {}) => ({
    _id: new Types.ObjectId(),
    orderNumber: "TO-TEST",
    status: TransferOrderStatus.IN_PREPARATION,
    type: TransferRequestType.PUSH,
    tenantId: new Types.ObjectId(tenantId),
    sourceWarehouseId: new Types.ObjectId(),
    destinationWarehouseId: new Types.ObjectId(),
    items: [],
    isDeleted: false,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const buildInv = (qty: number) => ({
    _id: new Types.ObjectId(),
    productSku: "SKU",
    totalQuantity: qty,
    availableQuantity: qty,
    reservedQuantity: 0,
    averageCostPrice: 1,
    save: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    transferOrderModel = noopModel();
    inventoryModel = noopModel();
    movementModel = noopModel();
    session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    };
    connection = { startSession: jest.fn().mockResolvedValue(session) };

    service = new TransferOrdersService(
      transferOrderModel as any,
      noopModel() as any, // locationModel
      noopModel() as any, // warehouseModel
      inventoryModel as any,
      movementModel as any,
      noopModel() as any, // productModel
      noopModel() as any, // tenantModel
      connection as any,
      {} as any, // organizationsService
    );
  });

  afterEach(() => jest.clearAllMocks());

  it("NO descuenta ningún ítem si uno no tiene stock suficiente (rollback total)", async () => {
    const itemA = {
      productId: new Types.ObjectId(),
      productSku: "A",
      productName: "A",
      requestedQuantity: 10,
      approvedQuantity: 10,
    };
    const itemB = {
      productId: new Types.ObjectId(),
      productSku: "B",
      productName: "B",
      requestedQuantity: 50,
      approvedQuantity: 50,
    };
    const order = buildOrder({ items: [itemA, itemB] });
    transferOrderModel.findOne.mockResolvedValue(order);

    const invA = buildInv(100); // suficiente
    const invB = buildInv(1); // insuficiente para 50
    inventoryModel.findOne
      .mockResolvedValueOnce(invA)
      .mockResolvedValueOnce(invB);

    await expect(
      service.ship(order._id.toString(), {} as any, tenantId, userId),
    ).rejects.toThrow(BadRequestException);

    // Nada se mutó ni committeó:
    expect(connection.startSession).not.toHaveBeenCalled();
    expect(invA.save).not.toHaveBeenCalled();
    expect(invB.save).not.toHaveBeenCalled();
    expect(movementModel.create).not.toHaveBeenCalled();
    expect(order.save).not.toHaveBeenCalled();
    expect(order.status).toBe(TransferOrderStatus.IN_PREPARATION);
  });

  it("despacha en transacción y registra balanceBefore + balanceAfter", async () => {
    const itemA = {
      productId: new Types.ObjectId(),
      productSku: "A",
      productName: "A",
      requestedQuantity: 10,
      approvedQuantity: 10,
    };
    const order = buildOrder({ items: [itemA] });
    transferOrderModel.findOne.mockResolvedValue(order);

    const invA = buildInv(100);
    inventoryModel.findOne.mockResolvedValueOnce(invA);

    await service.ship(order._id.toString(), {} as any, tenantId, userId);

    expect(connection.startSession).toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(invA.availableQuantity).toBe(90);
    expect(invA.totalQuantity).toBe(90);
    expect(order.status).toBe(TransferOrderStatus.IN_TRANSIT);

    expect(movementModel.create).toHaveBeenCalledTimes(1);
    const movementDoc = movementModel.create.mock.calls[0][0][0];
    expect(movementDoc.balanceBefore).toEqual({
      totalQuantity: 100,
      availableQuantity: 100,
      reservedQuantity: 0,
      averageCostPrice: 1,
    });
    expect(movementDoc.balanceAfter).toEqual({
      totalQuantity: 90,
      availableQuantity: 90,
      reservedQuantity: 0,
      averageCostPrice: 1,
    });
  });

  it("cancel() repone al origen los movimientos OUT no recibidos", async () => {
    const order = buildOrder({ items: [] });
    transferOrderModel.findOne.mockResolvedValue(order);

    const inv = buildInv(5);
    const outMov = {
      _id: new Types.ObjectId(),
      inventoryId: inv._id,
      productId: new Types.ObjectId(),
      productSku: "A",
      quantity: 10,
      unitCost: 1,
      totalCost: 10,
      transferId: "tid-1",
    };

    // OUT movements emitidos
    movementModel.find.mockReturnValue({
      session: jest.fn().mockResolvedValue([outMov]),
    });
    // No hay reverso previo
    movementModel.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });
    inventoryModel.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(inv),
    });

    await service.cancel(
      order._id.toString(),
      { reason: "test" } as any,
      tenantId,
      userId,
    );

    // Stock repuesto: 5 + 10
    expect(inv.availableQuantity).toBe(15);
    expect(inv.totalQuantity).toBe(15);
    expect(movementModel.create).toHaveBeenCalledTimes(1);
    const reverseDoc = movementModel.create.mock.calls[0][0][0];
    expect(reverseDoc.reason).toMatch(/^Reverso cancelación transferencia/);
    expect(reverseDoc.quantity).toBe(10);
    expect(order.status).toBe(TransferOrderStatus.CANCELLED);
    expect(session.commitTransaction).toHaveBeenCalled();
  });
});
