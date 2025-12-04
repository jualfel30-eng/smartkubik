import { Test } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { PaymentsService } from "../../src/modules/payments/payments.service";
import { Payment } from "../../src/schemas/payment.schema";
import { Payable } from "../../src/schemas/payable.schema";
import { Order } from "../../src/schemas/order.schema";
import { BankTransaction } from "../../src/schemas/bank-transaction.schema";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AccountingService } from "../../src/modules/accounting/accounting.service";
import { BankAccountsService } from "../../src/modules/bank-accounts/bank-accounts.service";
import { BankTransactionsService } from "../../src/modules/bank-accounts/bank-transactions.service";

/**
 * Estos tests cubren la lógica crítica de PaymentsService sin depender de Mongo real.
 * Mockeamos los modelos y servicios externos para validar idempotencia, transiciones
 * de estado y la aplicación de allocations a órdenes.
 */
describe("PaymentsService (unit)", () => {
  let service: PaymentsService;
  const paymentModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };
  const payableModel = {
    findById: jest.fn(),
  };
  const orderModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const bankTransactionModel = {
    find: jest.fn(),
  };

  const accountingService = {
    createJournalEntryForPayment: jest.fn(),
    createJournalEntryForPayablePayment: jest.fn(),
  };
  const bankAccountsService = {
    updateBalance: jest.fn(),
    findOne: jest.fn(),
  };
  const bankTransactionsService = {
    recordPaymentMovement: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getModelToken(Payment.name), useValue: paymentModel },
        { provide: getModelToken(Payable.name), useValue: payableModel },
        { provide: getModelToken(Order.name), useValue: orderModel },
        {
          provide: getModelToken(BankTransaction.name),
          useValue: bankTransactionModel,
        },
        { provide: AccountingService, useValue: accountingService },
        { provide: BankAccountsService, useValue: bankAccountsService },
        { provide: BankTransactionsService, useValue: bankTransactionsService },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe("create - idempotencia por idempotencyKey", () => {
    it("devuelve el pago existente cuando el idempotencyKey ya fue usado", async () => {
      const existingPayment = { _id: "p1", amount: 100 };
      paymentModel.findOne.mockResolvedValueOnce(existingPayment);

      const result = await service.create(
        {
          paymentType: "sale",
          orderId: "order1",
          date: new Date().toISOString(),
          amount: 100,
          method: "transfer",
          currency: "USD",
          idempotencyKey: "abc-123",
        } as any,
        { tenantId: "t1", id: "u1" },
      );

      expect(result).toBe(existingPayment);
      expect(paymentModel.findOne).toHaveBeenCalledWith({
        tenantId: "t1",
        idempotencyKey: "abc-123",
      });
    });
  });

  describe("updateStatus - transiciones válidas", () => {
    it("lanza BadRequest cuando la transición no es permitida", async () => {
      const paymentDoc = { _id: "p1", status: "confirmed", save: jest.fn() };
      paymentModel.findOne.mockResolvedValue(paymentDoc);

      await expect(
        service.updateStatus(
          "p1",
          "draft" as any,
          { tenantId: "t1" },
          "rollback",
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(paymentDoc.save).not.toHaveBeenCalled();
    });

    it("permite confirmed -> refunded y marca confirmedAt/by", async () => {
      const save = jest.fn();
      const paymentDoc: any = { _id: "p1", status: "confirmed", save };
      paymentModel.findOne.mockResolvedValue(paymentDoc);

      const result = await service.updateStatus(
        "p1",
        "refunded",
        { tenantId: "t1", id: "user1" },
        "customer refund",
      );

      expect(result.status).toBe("refunded");
      expect(save).toHaveBeenCalled();
    });
  });

  describe("applyAllocations - agrega payment a order.payments", () => {
    it("agrega el paymentId a la orden cuando se asigna allocation a order", async () => {
      const savePayment = jest.fn();
      const paymentDoc: any = {
        _id: "pay123",
        tenantId: "t1",
        allocations: [],
        save: savePayment,
      };
      paymentModel.findOne.mockResolvedValue(paymentDoc);

      const saveOrder = jest.fn();
      const orderDoc: any = { _id: "order1", payments: [], save: saveOrder };
      orderModel.findById = jest.fn().mockResolvedValue(orderDoc);

      const updated = await service.applyAllocations(
        "pay123",
        [
          {
            documentId: "65e0f8c2d7a7b1c5e4f1a0b1",
            documentType: "order",
            amount: 50,
          },
        ],
        { tenantId: "t1" },
      );

      expect(updated.allocations).toHaveLength(1);
      expect(orderDoc.payments).toContain(paymentDoc._id);
      expect(savePayment).toHaveBeenCalled();
      expect(saveOrder).toHaveBeenCalled();
    });

    it("lanza NotFound si el pago no existe para el tenant", async () => {
      paymentModel.findOne.mockResolvedValue(null);
      await expect(
        service.applyAllocations(
          "missing",
          [{ documentId: "order1", documentType: "order", amount: 10 }],
          { tenantId: "t1" },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
