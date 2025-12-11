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
    findOne: jest.fn().mockReturnThis(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    exec: jest.fn(),
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
    findOne: jest.fn(),
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
        { tenantId: "t1", id: "65e0f8c2d7a7b1c5e4f1a0b1" },
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

      // Properly mock findOne with exec chain
      paymentModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      paymentModel.findOne.mockResolvedValue(paymentDoc);

      // Mock aggregate for allocation calculation
      paymentModel.aggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ total: 50 }]),
      });

      const saveOrder = jest.fn();
      const orderDoc: any = {
        _id: "order1",
        payments: [],
        totalAmount: 100,
        paymentStatus: "pending",
        save: saveOrder
      };
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

  describe("create - validación de referencia requerida", () => {
    it("lanza BadRequest cuando bankAccountId está presente pero falta reference", async () => {
      paymentModel.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            paymentType: "sale",
            orderId: "order1",
            date: new Date().toISOString(),
            amount: 100,
            method: "transfer",
            currency: "USD",
            bankAccountId: "65e0f8c2d7a7b1c5e4f1a0b1",
            // reference missing
          } as any,
          { tenantId: "t1", id: "u1" },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza BadRequest para métodos bancarios sin referencia", async () => {
      paymentModel.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            paymentType: "sale",
            orderId: "order1",
            date: new Date().toISOString(),
            amount: 100,
            method: "pago_movil",
            currency: "VES",
            // reference missing
          } as any,
          { tenantId: "t1", id: "u1" },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("create - auto-reconciliación", () => {
    it("marca el pago como 'matched' cuando PAYMENTS_AUTO_RECONCILE=true y hay bankAccountId", async () => {
      // Mock environment variable
      const originalEnv = process.env.PAYMENTS_AUTO_RECONCILE;
      process.env.PAYMENTS_AUTO_RECONCILE = "true";

      const mockSave = jest.fn().mockResolvedValue(undefined);
      const mockPayment: any = {
        _id: "pay123",
        save: mockSave,
        statusHistory: [],
      };

      // Mock the constructor while preserving findOne and find methods
      const mockConstructor: any = jest.fn().mockImplementation(() => mockPayment);
      mockConstructor.findOne = jest.fn().mockResolvedValue(null);
      mockConstructor.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      (service as any).paymentModel = mockConstructor;

      const validOrderId = "65e0f8c2d7a7b1c5e4f1a0b1";
      const mockOrderData = {
        _id: validOrderId,
        orderNumber: "ORD-001",
        tenantId: "t1",
        totalAmount: 100,
        paymentStatus: "pending",
        payments: [],
      };

      // Mock findById with select and lean chain
      orderModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOrderData),
          exec: jest.fn().mockResolvedValue(mockOrderData),
        }),
      });
      orderModel.findByIdAndUpdate.mockResolvedValue({});

      bankAccountsService.findOne.mockResolvedValue({
        _id: "bank1",
        currency: "USD",
        currentBalance: 1000,
      });
      bankAccountsService.updateBalance.mockResolvedValue({
        currentBalance: 1100,
      });
      bankTransactionsService.recordPaymentMovement.mockResolvedValue({});
      accountingService.createJournalEntryForPayment.mockResolvedValue({});

      await service.create(
        {
          paymentType: "sale",
          orderId: validOrderId,
          date: new Date().toISOString(),
          amount: 100,
          method: "transfer",
          currency: "USD",
          bankAccountId: "bank1",
          reference: "REF-123",
        } as any,
        { tenantId: "t1", id: "65e0f8c2d7a7b1c5e4f1a0b2" },
      );

      expect(mockPayment.save).toHaveBeenCalled();
      expect(mockPayment.statusHistory).toContainEqual(
        expect.objectContaining({
          status: "reconciliation:matched",
          reason: "Auto-conciliado al seleccionar cuenta bancaria",
        }),
      );

      // Restore environment variable
      process.env.PAYMENTS_AUTO_RECONCILE = originalEnv;
    });
  });

  describe("reconcile - validaciones de estado", () => {
    it("lanza BadRequest cuando status=manual y no hay note", async () => {
      const paymentDoc = { _id: "p1", tenantId: "t1", save: jest.fn() };
      paymentModel.findOne.mockResolvedValue(paymentDoc);

      await expect(
        service.reconcile("p1", "manual", { tenantId: "t1", id: "u1" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("marca el pago como reconciliado con status=matched", async () => {
      const save = jest.fn();
      const paymentDoc: any = {
        _id: "p1",
        tenantId: "t1",
        save,
        statusHistory: [],
      };
      paymentModel.findOne.mockResolvedValue(paymentDoc);
      bankTransactionModel.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.reconcile(
        "p1",
        "matched",
        { tenantId: "t1", id: "65e0f8c2d7a7b1c5e4f1a0b1" },
        "STMT-001",
        "Bank statement matched",
      );

      expect(result.reconciliationStatus).toBe("matched");
      expect(result.statementRef).toBe("STMT-001");
      expect(result.reconciledAt).toBeDefined();
      expect(save).toHaveBeenCalled();
    });
  });

  describe("getSummary - agregación por método/estado", () => {
    it("devuelve resumen de pagos agrupados por método", async () => {
      const mockAggregation = [
        { _id: "transfer", totalAmount: 5000, count: 10 },
        { _id: "cash", totalAmount: 1500, count: 5 },
        { _id: "pago_movil", totalAmount: 800, count: 3 },
      ];

      paymentModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregation),
      });

      const result = await service.getSummary("t1", { groupBy: "method" });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        key: "transfer",
        totalAmount: 5000,
        count: 10,
      });
      expect(result[1]).toEqual({
        key: "cash",
        totalAmount: 1500,
        count: 5,
      });
      expect(paymentModel.aggregate).toHaveBeenCalled();
    });

    it("filtra por rango de fechas", async () => {
      paymentModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.getSummary("t1", {
        from: "2024-01-01",
        to: "2024-12-31",
        groupBy: "status",
      });

      const aggregateCall = paymentModel.aggregate.mock.calls[0][0];
      expect(aggregateCall[0].$match.date).toEqual({
        $gte: new Date("2024-01-01"),
        $lte: new Date("2024-12-31"),
      });
    });
  });
});
