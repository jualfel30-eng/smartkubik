import { BadRequestException } from "@nestjs/common";
import { Types } from "mongoose";
import { OrderPaymentsService } from "./order-payments.service";

/**
 * Tests de redención de saldo a favor (Fase 2b). Se instancia el service con
 * dependencias mockeadas y se espía `registerPayments` (reutilizado por la
 * redención) para verificar el débito del ledger y la compensación en fallo.
 */
describe("OrderPaymentsService.redeemStoreCredit", () => {
  let service: OrderPaymentsService;
  let orderModel: any;
  let storeCreditService: any;
  let orderDoc: any;

  const user = {
    id: new Types.ObjectId().toString(),
    tenantId: new Types.ObjectId().toString(),
  };

  const buildOrder = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(),
    orderNumber: "ORD-1",
    customerId: new Types.ObjectId(),
    status: "delivered",
    paymentStatus: "partial",
    totalAmount: 100,
    paidAmount: 0,
    ...overrides,
  });

  beforeEach(() => {
    orderDoc = buildOrder();
    orderModel = { findOne: jest.fn().mockResolvedValue(orderDoc) };
    storeCreditService = {
      getBalance: jest.fn().mockResolvedValue(50),
      debit: jest.fn().mockResolvedValue({ balance: 0, movement: {} }),
      credit: jest.fn().mockResolvedValue({ balance: 50, movement: {} }),
    };

    service = new OrderPaymentsService(
      orderModel,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      storeCreditService,
    );
  });

  it("aplica el saldo: debita el ledger y registra un pago store_credit", async () => {
    const findOne = jest.fn().mockResolvedValue(buildOrder({ paidAmount: 50 }));
    const registerSpy = jest
      .spyOn(service, "registerPayments")
      .mockResolvedValue({} as any);

    const result = await service.redeemStoreCredit(
      orderDoc._id.toString(),
      undefined,
      user,
      findOne,
    );

    // Debita el saldo por el mínimo(balance 50, pendiente 100) = 50
    expect(storeCreditService.debit).toHaveBeenCalledTimes(1);
    expect(storeCreditService.debit.mock.calls[0][0].amount).toBe(50);
    expect(storeCreditService.debit.mock.calls[0][0].source).toBe(
      "order_redemption",
    );

    // Registra un pago de método store_credit por ese monto
    const payment = registerSpy.mock.calls[0][1].payments[0] as any;
    expect(payment.method).toBe("store_credit");
    expect(payment.amount).toBe(50);
    expect(result.paidAmount).toBe(50);
  });

  it("respeta el monto solicitado si es menor al saldo y al pendiente", async () => {
    const findOne = jest.fn().mockResolvedValue(buildOrder({ paidAmount: 20 }));
    jest.spyOn(service, "registerPayments").mockResolvedValue({} as any);

    await service.redeemStoreCredit(orderDoc._id.toString(), 20, user, findOne);

    expect(storeCreditService.debit.mock.calls[0][0].amount).toBe(20);
  });

  it("rechaza si el cliente no tiene saldo a favor", async () => {
    storeCreditService.getBalance.mockResolvedValue(0);

    await expect(
      service.redeemStoreCredit(
        orderDoc._id.toString(),
        undefined,
        user,
        jest.fn(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storeCreditService.debit).not.toHaveBeenCalled();
  });

  it("rechaza si la orden ya está pagada", async () => {
    orderModel.findOne.mockResolvedValue(buildOrder({ paymentStatus: "paid" }));

    await expect(
      service.redeemStoreCredit(
        orderDoc._id.toString(),
        undefined,
        user,
        jest.fn(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("compensa (re-acredita) si el registro del pago falla", async () => {
    const findOne = jest.fn();
    jest
      .spyOn(service, "registerPayments")
      .mockRejectedValue(new Error("fallo al registrar"));

    await expect(
      service.redeemStoreCredit(
        orderDoc._id.toString(),
        undefined,
        user,
        findOne,
      ),
    ).rejects.toThrow();

    // Débito revertido
    expect(storeCreditService.credit).toHaveBeenCalledTimes(1);
    expect(storeCreditService.credit.mock.calls[0][0].amount).toBe(50);
    expect(storeCreditService.credit.mock.calls[0][0].source).toBe("manual");
  });

  it("compensa si el pago no se refleja en la orden (paidAmount no subió)", async () => {
    // registerPayments 'ok' pero la orden final no refleja el pago
    const findOne = jest.fn().mockResolvedValue(buildOrder({ paidAmount: 0 }));
    jest.spyOn(service, "registerPayments").mockResolvedValue({} as any);

    await expect(
      service.redeemStoreCredit(
        orderDoc._id.toString(),
        undefined,
        user,
        findOne,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storeCreditService.credit).toHaveBeenCalledTimes(1);
  });
});
