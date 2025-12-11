import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Types } from "mongoose";
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
  let chartModel: any;
  let journalEntryModel: any;
  let orderModel: any;
  let payableModel: any;
  let billingModel: any;
  let savedJournalEntries: any[];

  const cashAccount = {
    _id: new Types.ObjectId(),
    code: "1101",
    type: "Activo",
    name: "Caja",
  };
  const accountsReceivable = {
    _id: new Types.ObjectId(),
    code: "1102",
    type: "Activo",
    name: "Cuentas por Cobrar",
  };
  const taxPayable = {
    _id: new Types.ObjectId(),
    code: "2102",
    type: "Pasivo",
    name: "Impuestos por Pagar",
  };
  const accountsPayableAcc = {
    _id: new Types.ObjectId(),
    code: "2101",
    type: "Pasivo",
    name: "Cuentas por Pagar",
  };

  const buildChartModel = () => {
    const model: any = jest.fn().mockImplementation((data) => {
      const id = data._id || new Types.ObjectId();
      return {
        ...data,
        _id: id,
        save: jest.fn().mockResolvedValue({
          ...data,
          _id: id,
        }),
      };
    });

    model.findOne = jest.fn();
    model.find = jest.fn();
    model.updateOne = jest.fn();
    return model;
  };

  const buildJournalEntryModel = () => {
    const model: any = jest.fn().mockImplementation((data) => {
      const entry = {
        ...data,
        _id: `entry-${savedJournalEntries.length + 1}`,
      };
      entry.save = jest.fn().mockImplementation(async () => {
        savedJournalEntries.push(entry);
        return entry;
      });
      return entry;
    });

    model.find = jest.fn();
    model.updateOne = jest.fn();
    return model;
  };

  const mockPopulateChain = (result: any) => ({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    savedJournalEntries = [];
    chartModel = buildChartModel();
    journalEntryModel = buildJournalEntryModel();
    orderModel = {};
    payableModel = {};
    billingModel = {};

    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: getModelToken(ChartOfAccounts.name), useValue: chartModel },
        {
          provide: getModelToken(JournalEntry.name),
          useValue: journalEntryModel,
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

    chartModel.findOne.mockImplementation(({ code }: any) => {
      const map: Record<string, any> = {
        "1101": cashAccount,
        "1102": accountsReceivable,
        "2102": taxPayable,
        "2101": accountsPayableAcc,
      };
      return { exec: jest.fn().mockResolvedValue(map[code] || null) };
    });
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

    expect(entry.lines).toEqual([
      {
        account: cashAccount._id.toString(),
        debit: 100,
        credit: 0,
        description: "Cobro de orden A-1",
      },
      {
        account: accountsReceivable._id.toString(),
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

    expect(entry.lines).toEqual([
      {
        account: accountsPayableAcc._id.toString(),
        debit: 50,
        credit: 0,
        description: "Pago de Cta por Pagar P-1",
      },
      {
        account: cashAccount._id.toString(),
        debit: 0,
        credit: 50,
        description: "Salida de dinero por pago de P-1",
      },
    ]);
  });

  it("crea asiento de cobro con IGTF y marca isAutomatic=true", async () => {
    const igtfAmount = 3;
    const order: any = { orderNumber: "A-2" };
    const payment: any = { amount: 100, confirmedAt: new Date("2024-01-02") };

    chartModel.findOne.mockImplementation(({ code }: any) => {
      if (code === "599") {
        return { exec: jest.fn().mockResolvedValue(null) };
      }
      const map: Record<string, any> = {
        "1101": cashAccount,
        "1102": accountsReceivable,
        "2102": taxPayable,
      };
      return { exec: jest.fn().mockResolvedValue(map[code] || null) };
    });

    const entry = await service.createJournalEntryForPayment(
      order,
      payment as any,
      "tenant-igtf",
      igtfAmount,
    );

    const debitTotal = entry.lines.reduce(
      (sum, line) => sum + (line.debit || 0),
      0,
    );
    const creditTotal = entry.lines.reduce(
      (sum, line) => sum + (line.credit || 0),
      0,
    );

    expect(entry.isAutomatic).toBe(true);
    expect(entry.lines).toHaveLength(4);
    expect(debitTotal).toBe(103);
    expect(creditTotal).toBe(103);
    expect(
      entry.lines.some((line) => line.description?.includes("IGTF")),
    ).toBe(true);
  });

  it("rechaza journal entries desbalanceados", async () => {
    await expect(
      service.createJournalEntry(
        {
          date: new Date().toISOString(),
          description: "Desbalanceado",
          lines: [
            { accountId: "a1", debit: 100, credit: 0, description: "" },
            { accountId: "a2", debit: 0, credit: 50, description: "" },
          ],
        },
        "tenant1",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("findOrCreateAccount usa existente y crea cuando no hay registro", async () => {
    const existing = { _id: new Types.ObjectId(), code: "4101" };
    chartModel.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(existing),
    });
    const found = await (service as any).findOrCreateAccount(
      { code: "4101", name: "Ingresos", type: "Ingreso" },
      "tenant1",
    );
    expect(found).toBe(existing);

    chartModel.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(null),
    });
    const created = await (service as any).findOrCreateAccount(
      { code: "599", name: "Gasto IGTF", type: "Gasto" },
      "tenant1",
    );
    expect(created._id).toBeDefined();
    expect(created.isSystemAccount).toBe(true);
  });

  it("genera P&L con ingresos y gastos", async () => {
    jest
      .spyOn<any, any>(service, "fixJournalEntryDates")
      .mockResolvedValue(undefined);

    const incomeId = new Types.ObjectId();
    const expenseId = new Types.ObjectId();

    chartModel.find.mockReturnValue(
      mockPopulateChain([
        { _id: incomeId, type: "Ingreso" },
        { _id: expenseId, type: "Gasto" },
      ]),
    );

    journalEntryModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          lines: [
            { account: { _id: incomeId }, debit: 0, credit: 1000 },
            { account: { _id: expenseId }, debit: 200, credit: 0 },
          ],
        },
      ]),
    });

    const result = await service.getProfitAndLoss(
      "tenant1",
      new Date("2024-01-01"),
      new Date("2024-01-31"),
    );

    expect(result.summary.totalRevenue).toBe(1000);
    expect(result.summary.totalExpenses).toBe(200);
    expect(result.summary.netProfit).toBe(800);
  });

  it("aplica filtro de fechas en P&L", async () => {
    jest
      .spyOn<any, any>(service, "fixJournalEntryDates")
      .mockResolvedValue(undefined);

    const incomeId = new Types.ObjectId();
    chartModel.find.mockReturnValue(
      mockPopulateChain([{ _id: incomeId, type: "Ingreso" }]),
    );

    const findSpy = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        { lines: [{ account: { _id: incomeId }, debit: 0, credit: 500 }] },
      ]),
    });
    journalEntryModel.find = findSpy;

    const from = new Date("2024-02-01");
    const to = new Date("2024-02-29");
    const result = await service.getProfitAndLoss("tenant1", from, to);

    expect(findSpy).toHaveBeenCalledWith({
      tenantId: "tenant1",
      date: { $gte: from, $lte: to },
    });
    expect(result.summary.netProfit).toBe(500);
  });

  it("calcula balance general con verificación de diferencia", async () => {
    jest
      .spyOn<any, any>(service, "fixJournalEntryDates")
      .mockResolvedValue(undefined);

    const asset = { _id: new Types.ObjectId(), code: "1101", type: "Activo" };
    const liability = {
      _id: new Types.ObjectId(),
      code: "2101",
      type: "Pasivo",
    };
    const equity = {
      _id: new Types.ObjectId(),
      code: "3101",
      type: "Patrimonio",
    };
    const income = {
      _id: new Types.ObjectId(),
      code: "4101",
      type: "Ingreso",
    };
    const expense = {
      _id: new Types.ObjectId(),
      code: "5101",
      type: "Gasto",
    };

    chartModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        asset,
        liability,
        equity,
        income,
        expense,
      ]),
    });

    journalEntryModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          lines: [
            { account: asset._id, debit: 200, credit: 0 },
            { account: income._id, debit: 0, credit: 200 },
          ],
        },
        {
          lines: [
            { account: liability._id, debit: 0, credit: 50 },
            { account: expense._id, debit: 0, credit: 50 },
          ],
        },
      ]),
    });

    const result = await service.getBalanceSheet(
      "tenant1",
      new Date("2024-01-31"),
    );

    expect(result.assets.total).toBe(200);
    expect(result.liabilities.total).toBe(50);
    expect(result.equity.total).toBe(150);
    expect(result.verification.difference).toBe(0);
  });

  it("genera flujo de caja separando inflows/outflows", async () => {
    jest
      .spyOn<any, any>(service, "fixJournalEntryDates")
      .mockResolvedValue(undefined);

    chartModel.findOne.mockImplementation(({ code }: any) => {
      if (code === "1101") {
        return { exec: jest.fn().mockResolvedValue(cashAccount) };
      }
      return { exec: jest.fn().mockResolvedValue(null) };
    });

    journalEntryModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          date: new Date("2024-01-05"),
          description: "Cobro",
          lines: [
            {
              account: cashAccount,
              debit: 500,
              credit: 0,
              description: "Cobro venta",
            },
          ],
        },
        {
          date: new Date("2024-01-06"),
          description: "Pago",
          lines: [
            {
              account: cashAccount,
              debit: 0,
              credit: 200,
              description: "Pago proveedor",
            },
          ],
        },
      ]),
    });

    const result = await service.getCashFlowStatement(
      "tenant1",
      new Date("2024-01-01"),
      new Date("2024-01-31"),
    );

    expect(result.cashInflows.total).toBe(500);
    expect(result.cashOutflows.total).toBe(200);
    expect(result.netCashFlow).toBe(300);
    expect(result.cashInflows.details[0].description).toContain("Cobro");
    expect(result.cashOutflows.details[0].description).toContain("Pago");
  });

  it("aplica filtro de fechas y cuenta de caja en Cash Flow", async () => {
    jest
      .spyOn<any, any>(service, "fixJournalEntryDates")
      .mockResolvedValue(undefined);

    chartModel.findOne.mockImplementation(({ code }: any) => {
      if (code === "1101") {
        return { exec: jest.fn().mockResolvedValue(cashAccount) };
      }
      return { exec: jest.fn().mockResolvedValue(null) };
    });

    const findSpy = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });
    journalEntryModel.find = findSpy;

    const from = new Date("2024-03-01");
    const to = new Date("2024-03-31");
    await service.getCashFlowStatement("tenant1", from, to);

    expect(findSpy).toHaveBeenCalledWith({
      tenantId: "tenant1",
      date: { $gte: from, $lte: to },
      "lines.account": { $in: [cashAccount._id] },
    });
  });

  it("agrega y envía lines correctos para payroll run", async () => {
    const run = {
      entries: [
        { conceptCode: "SAL", amount: 100 },
        { conceptCode: "SAL", amount: 50 },
        { conceptCode: "TAX", amount: 30 },
      ],
      periodEnd: new Date("2024-01-31"),
    } as any;
    const conceptMap = new Map([
      [
        "SAL",
        {
          debitAccountId: "acct-salary",
          creditAccountId: "acct-payable",
          name: "Salarios",
        } as any,
      ],
      [
        "TAX",
        {
          debitAccountId: "acct-tax",
          creditAccountId: "acct-payable",
          name: "Impuestos",
        } as any,
      ],
    ]);

    const createSpy = jest
      .spyOn<any, any>(service, "createJournalEntry")
      .mockResolvedValue({ _id: "entry-payroll" });

    const entryId = await service.createJournalEntryForPayrollRun({
      run,
      conceptMap,
      tenantId: "tenant1",
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          {
            accountId: "acct-salary",
            debit: 150,
            credit: 0,
            description: "Salarios",
          },
          {
            accountId: "acct-payable",
            debit: 0,
            credit: 150,
            description: "Salarios",
          },
          {
            accountId: "acct-tax",
            debit: 30,
            credit: 0,
            description: "Impuestos",
          },
          {
            accountId: "acct-payable",
            debit: 0,
            credit: 30,
            description: "Impuestos",
          },
        ],
      }),
      "tenant1",
    );
    expect(entryId).toBe("entry-payroll");
  });
});
