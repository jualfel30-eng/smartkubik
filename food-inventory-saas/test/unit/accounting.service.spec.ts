import { Test } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { AccountingService } from "../../src/modules/accounting/accounting.service";
import { ChartOfAccounts } from "../../src/schemas/chart-of-accounts.schema";
import { JournalEntry } from "../../src/schemas/journal-entry.schema";
import { Order } from "../../src/schemas/order.schema";
import { Payable } from "../../src/schemas/payable.schema";
import { BillingDocument } from "../../src/schemas/billing-document.schema";

/**
 * Pruebas mínimas para validar que los asientos automáticos de pago
 * generan las líneas de débito/crédito esperadas.
 */
describe("AccountingService (unit)", () => {
  let service: AccountingService;
  const chartModel = {};
  class JournalEntryModelMock {
    _id?: string;
    lines?: any[];
    date?: Date;
    description?: string;
    tenantId?: string;
    isAutomatic?: boolean;
    constructor(data: any) {
      Object.assign(this, data);
    }
    save() {
      this._id = this._id || "entry1";
      return Promise.resolve({ ...this });
    }
  }
  const orderModel = {};
  const payableModel = {};
  const billingModel = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: getModelToken(ChartOfAccounts.name), useValue: chartModel },
        {
          provide: getModelToken(JournalEntry.name),
          useValue: JournalEntryModelMock,
        },
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(Payable.name), useValue: payableModel },
        {
          provide: getModelToken(BillingDocument.name),
          useValue: billingModel,
        },
      ],
    }).compile();

    service = module.get(AccountingService);

    // Mock helper methods to avoid DB access
    (service as any).findAccountByCode = jest
      .fn()
      .mockResolvedValue({ _id: "acct-cash" });
    (service as any).findOrCreateAccount = jest
      .fn()
      .mockResolvedValue({ _id: "acct-igtf" });
  });

  it("crea asiento de cobro de venta (debe caja/banco, haber CxC)", async () => {
    const order: any = { orderNumber: "A-1" };
    const payment: any = {
      amount: 100,
      confirmedAt: new Date(),
      date: new Date(),
    };
    const entry = await service.createJournalEntryForPayment(
      order,
      payment,
      "tenant1",
    );

    expect((service as any).findAccountByCode).toHaveBeenCalledWith(
      "1101",
      "tenant1",
    );
    expect(entry.lines).toEqual([
      {
        account: "acct-cash",
        debit: 100,
        credit: 0,
        description: "Cobro de orden A-1",
      },
      {
        account: "acct-cash",
        debit: 0,
        credit: 100,
        description: "Cancelación de Cuentas por Cobrar por orden A-1",
      },
    ]);
  });

  it("crea asiento de pago de payable (debe CxP, haber caja/banco)", async () => {
    const payment: any = { amount: 50, date: new Date().toISOString() };
    const payable: any = { payableNumber: "P-1" };

    const entry = await service.createJournalEntryForPayablePayment(
      payment,
      payable,
      "tenant1",
    );

    expect((service as any).findAccountByCode).toHaveBeenCalledWith(
      "2101",
      "tenant1",
    );
    expect(entry.lines).toEqual([
      {
        account: "acct-cash",
        debit: 50,
        credit: 0,
        description: "Pago de Cta por Pagar P-1",
      },
      {
        account: "acct-cash",
        debit: 0,
        credit: 50,
        description: "Salida de dinero por pago de P-1",
      },
    ]);
  });
});
