import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { ReturnsService } from "./returns.service";
import { Return } from "./schemas/return.schema";
import { Order } from "../../schemas/order.schema";
import { InventoryService } from "../inventory/inventory.service";
import { InventoryMovementsService } from "../inventory/inventory-movements.service";
import { CashRegisterService } from "../cash-register/cash-register.service";
import { PaymentsService } from "../payments/payments.service";
import { StoreCreditService } from "../store-credit/store-credit.service";
import { ReturnsAccountingService } from "./returns-accounting.service";

describe("ReturnsService", () => {
  let service: ReturnsService;

  const tenantId = new Types.ObjectId();
  const user = { id: new Types.ObjectId().toString(), tenantId };

  let orderDoc: any;
  let returnModel: any;
  let orderModel: any;
  let inventoryService: any;
  let inventoryMovementsService: any;
  let cashRegisterService: any;
  let paymentsService: any;
  let returnsAccountingService: any;
  let storeCreditService: any;

  const buildOrder = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(),
    orderNumber: "ORD-1",
    customerId: new Types.ObjectId(),
    customerName: "Cliente Test",
    status: "delivered",
    paymentStatus: "paid",
    paidAmount: 100,
    paidAmountVes: 0,
    totalAmount: 100,
    payments: [new Types.ObjectId()],
    items: [
      {
        _id: new Types.ObjectId(),
        productId: new Types.ObjectId(),
        productSku: "SKU-1",
        productName: "Producto 1",
        quantity: 2,
        returnedQuantity: 0,
        quantityInBaseUnit: 2,
        unitPrice: 50,
        totalPrice: 100,
      },
    ],
    markModified: jest.fn(),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  beforeEach(async () => {
    orderDoc = buildOrder();

    returnModel = {
      create: jest
        .fn()
        .mockImplementation((doc: any) =>
          Promise.resolve({ ...doc, _id: new Types.ObjectId() }),
        ),
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      }),
    };

    orderModel = {
      findOne: jest.fn().mockResolvedValue(orderDoc),
    };

    inventoryService = {
      findByProductSku: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        warehouseId: new Types.ObjectId(),
        averageCostPrice: 25,
      }),
      findByProductId: jest.fn().mockResolvedValue(null),
    };

    inventoryMovementsService = {
      create: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    cashRegisterService = {
      getOpenSession: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId() }),
      addCashMovement: jest.fn().mockResolvedValue(true),
    };

    paymentsService = {
      updateStatus: jest.fn().mockResolvedValue(true),
    };

    returnsAccountingService = {
      createRefundEntry: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    storeCreditService = {
      credit: jest.fn().mockResolvedValue({
        balance: 50,
        movement: { _id: new Types.ObjectId() },
      }),
      debit: jest.fn(),
      getBalance: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: getModelToken(Return.name), useValue: returnModel },
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: InventoryService, useValue: inventoryService },
        {
          provide: InventoryMovementsService,
          useValue: inventoryMovementsService,
        },
        { provide: CashRegisterService, useValue: cashRegisterService },
        { provide: PaymentsService, useValue: paymentsService },
        {
          provide: ReturnsAccountingService,
          useValue: returnsAccountingService,
        },
        { provide: StoreCreditService, useValue: storeCreditService },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
  });

  it("procesa una devolución total: reingresa stock, saca caja y marca la orden devuelta", async () => {
    const result = await service.createReturn(
      orderDoc._id.toString(),
      { refundMethod: "cash", reason: "Cliente insatisfecho" },
      user,
    );

    // Reingreso de stock (movimiento IN por ítem, en unidad base)
    expect(inventoryMovementsService.create).toHaveBeenCalledTimes(1);
    const [movementDto, , , enforceStock] =
      inventoryMovementsService.create.mock.calls[0];
    expect(movementDto.movementType).toBe("IN");
    expect(movementDto.quantity).toBe(2);
    expect(enforceStock).toBe(false);

    // Salida de caja por el monto pagado en USD
    expect(cashRegisterService.addCashMovement).toHaveBeenCalledTimes(1);
    const [, cashDto] = cashRegisterService.addCashMovement.mock.calls[0];
    expect(cashDto.type).toBe("out");
    expect(cashDto.amount).toBe(100);
    expect(cashDto.currency).toBe("USD");

    // Asiento contable generado (best-effort)
    expect(returnsAccountingService.createRefundEntry).toHaveBeenCalledTimes(1);
    expect(
      returnsAccountingService.createRefundEntry.mock.calls[0][0].refundAmount,
    ).toBe(100);

    // Pago marcado como refunded (best-effort)
    expect(paymentsService.updateStatus).toHaveBeenCalledWith(
      orderDoc.payments[0].toString(),
      "refunded",
      user,
      expect.any(String),
    );

    // Orden marcada como devuelta
    expect(orderDoc.status).toBe("refunded");
    expect(orderDoc.paymentStatus).toBe("refunded");
    expect(orderDoc.save).toHaveBeenCalled();

    // Documento de devolución persistido
    expect(returnModel.create).toHaveBeenCalledTimes(1);
    expect(result.refundAmountUsd).toBe(100);
    expect(result.status).toBe("completed");
    expect(result.isPartial).toBe(false);
  });

  it("reembolso a SALDO A FAVOR: acredita al cliente, no toca caja y contabiliza al pasivo", async () => {
    const result = await service.createReturn(
      orderDoc._id.toString(),
      { refundMethod: "store_credit" },
      user,
    );

    // No se pide sesión de caja ni se saca efectivo
    expect(cashRegisterService.getOpenSession).not.toHaveBeenCalled();
    expect(cashRegisterService.addCashMovement).not.toHaveBeenCalled();

    // Se acredita el saldo a favor del cliente por el valor devuelto (USD)
    expect(storeCreditService.credit).toHaveBeenCalledTimes(1);
    const creditArg = storeCreditService.credit.mock.calls[0][0];
    expect(creditArg.amount).toBe(100);
    expect(creditArg.source).toBe("return");
    expect(creditArg.customerId).toBe(orderDoc.customerId.toString());

    // Asiento contable con método store_credit (crédito a pasivo 2104)
    expect(
      returnsAccountingService.createRefundEntry.mock.calls[0][0].refundMethod,
    ).toBe("store_credit");

    // Documento de devolución refleja el método y el monto acreditado
    expect(result.refundMethod).toBe("store_credit");
    expect(result.refundAmountUsd).toBe(100);
    expect(result.storeCreditMovementId).toBeDefined();
    expect(orderDoc.status).toBe("refunded");
  });

  it("saldo a favor no exige sesión de caja abierta", async () => {
    cashRegisterService.getOpenSession.mockResolvedValue(null);

    await expect(
      service.createReturn(
        orderDoc._id.toString(),
        { refundMethod: "store_credit" },
        user,
      ),
    ).resolves.toBeDefined();
    expect(storeCreditService.credit).toHaveBeenCalledTimes(1);
  });

  it("createExchange: devuelve SIEMPRE a saldo a favor, marca isExchange y reporta el balance", async () => {
    storeCreditService.getBalance.mockResolvedValue(100);

    const result = await service.createExchange(
      orderDoc._id.toString(),
      { reason: "Cambio de talla" },
      user,
    );

    // Fuerza store_credit: acredita al cliente, no toca caja
    expect(storeCreditService.credit).toHaveBeenCalledTimes(1);
    expect(cashRegisterService.addCashMovement).not.toHaveBeenCalled();

    // El Return queda marcado como parte de un cambio
    expect(result.return.isExchange).toBe(true);
    expect(result.return.refundMethod).toBe("store_credit");

    // Reporta el saldo para que la UI redirija al POS con contexto
    expect(result.customerId).toBe(orderDoc.customerId.toString());
    expect(result.storeCreditBalance).toBe(100);
  });

  it("devolución PARCIAL: reembolsa proporcional, deja la orden partially_returned y NO reembolsa el pago", async () => {
    const itemId = orderDoc.items[0]._id.toString();

    const result = await service.createReturn(
      orderDoc._id.toString(),
      { items: [{ orderItemId: itemId, quantity: 1 }] },
      user,
    );

    // Reingresa sólo 1 unidad (base) de las 2
    expect(inventoryMovementsService.create).toHaveBeenCalledTimes(1);
    expect(inventoryMovementsService.create.mock.calls[0][0].quantity).toBe(1);

    // Reembolso proporcional: 1 de 2 uds → mitad de lo pagado
    const [, cashDto] = cashRegisterService.addCashMovement.mock.calls[0];
    expect(cashDto.amount).toBe(50);
    expect(result.refundAmountUsd).toBe(50);
    expect(result.isPartial).toBe(true);

    // returnedQuantity acumulado en la línea
    expect(orderDoc.items[0].returnedQuantity).toBe(1);

    // Orden parcialmente devuelta; el pago NO se reembolsa (no está completa)
    expect(orderDoc.status).toBe("partially_returned");
    expect(orderDoc.paymentStatus).toBe("paid");
    expect(paymentsService.updateStatus).not.toHaveBeenCalled();
  });

  it("devolución parcial que agota la última unidad deja la orden refunded", async () => {
    // Orden que ya tenía 1 de 2 devuelta; devolvemos la última.
    const partiallyReturned = buildOrder();
    partiallyReturned.items[0].returnedQuantity = 1;
    orderModel.findOne.mockResolvedValue(partiallyReturned);
    const itemId = partiallyReturned.items[0]._id.toString();

    await service.createReturn(
      partiallyReturned._id.toString(),
      { items: [{ orderItemId: itemId, quantity: 1 }] },
      user,
    );

    expect(partiallyReturned.items[0].returnedQuantity).toBe(2);
    expect(partiallyReturned.status).toBe("refunded");
    expect(partiallyReturned.paymentStatus).toBe("refunded");
    expect(paymentsService.updateStatus).toHaveBeenCalled();
  });

  it("rechaza devolver más cantidad que la pendiente", async () => {
    const itemId = orderDoc.items[0]._id.toString();

    await expect(
      service.createReturn(
        orderDoc._id.toString(),
        { items: [{ orderItemId: itemId, quantity: 3 }] },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inventoryMovementsService.create).not.toHaveBeenCalled();
  });

  it("rechaza un orderItemId que no pertenece a la orden", async () => {
    await expect(
      service.createReturn(
        orderDoc._id.toString(),
        {
          items: [
            { orderItemId: new Types.ObjectId().toString(), quantity: 1 },
          ],
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rechaza devolver una orden no pagada", async () => {
    orderModel.findOne.mockResolvedValue(
      buildOrder({ paymentStatus: "partial" }),
    );

    await expect(
      service.createReturn(orderDoc._id.toString(), {}, user),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inventoryMovementsService.create).not.toHaveBeenCalled();
    expect(cashRegisterService.addCashMovement).not.toHaveBeenCalled();
  });

  it("rechaza devolver sin sesión de caja abierta", async () => {
    cashRegisterService.getOpenSession.mockResolvedValue(null);

    await expect(
      service.createReturn(orderDoc._id.toString(), {}, user),
    ).rejects.toBeInstanceOf(BadRequestException);
    // No debe mutar nada si no hay caja
    expect(inventoryMovementsService.create).not.toHaveBeenCalled();
  });

  it("rechaza devolver una orden con factura fiscal", async () => {
    orderModel.findOne.mockResolvedValue(
      buildOrder({ billingDocumentId: new Types.ObjectId() }),
    );

    await expect(
      service.createReturn(orderDoc._id.toString(), {}, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rechaza devolver una orden ya devuelta", async () => {
    orderModel.findOne.mockResolvedValue(buildOrder({ status: "refunded" }));

    await expect(
      service.createReturn(orderDoc._id.toString(), {}, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lanza NotFound si la orden no existe", async () => {
    orderModel.findOne.mockResolvedValue(null);

    await expect(
      service.createReturn(orderDoc._id.toString(), {}, user),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
