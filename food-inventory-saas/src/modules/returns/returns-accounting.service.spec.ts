import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { ReturnsAccountingService } from "./returns-accounting.service";
import { ChartOfAccounts } from "../../schemas/chart-of-accounts.schema";
import { JournalEntry } from "../../schemas/journal-entry.schema";

describe("ReturnsAccountingService", () => {
  let service: ReturnsAccountingService;
  let savedEntry: any;
  let chartModel: any;
  let journalModel: any;

  const salesReturnsAccount = { _id: new Types.ObjectId(), code: "4102" };
  const cashAccount = { _id: new Types.ObjectId(), code: "1101" };

  beforeEach(async () => {
    savedEntry = null;

    // findOne devuelve la cuenta ya existente según el code consultado.
    chartModel = {
      findOne: jest
        .fn()
        .mockImplementation(({ code }) =>
          Promise.resolve(code === "4102" ? salesReturnsAccount : cashAccount),
        ),
    };

    // Constructor-mock: captura el doc y expone save().
    journalModel = jest.fn().mockImplementation((doc: any) => {
      savedEntry = { ...doc, _id: new Types.ObjectId() };
      return { ...savedEntry, save: jest.fn().mockResolvedValue(savedEntry) };
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsAccountingService,
        { provide: getModelToken(ChartOfAccounts.name), useValue: chartModel },
        { provide: getModelToken(JournalEntry.name), useValue: journalModel },
      ],
    }).compile();

    service = module.get<ReturnsAccountingService>(ReturnsAccountingService);
  });

  it("crea un asiento cuadrado: débito a Devoluciones en Ventas / crédito a Caja", async () => {
    await service.createRefundEntry({
      tenantId: new Types.ObjectId().toString(),
      refundAmount: 100,
      orderId: new Types.ObjectId().toString(),
      orderNumber: "ORD-1",
      customerName: "Cliente Test",
      returnNumber: "RET-2026-0001",
      transactionDate: new Date(),
    });

    expect(savedEntry).toBeTruthy();
    expect(savedEntry.isAutomatic).toBe(true);
    expect(savedEntry.metadata.createdFrom).toBe("order_return_refund");

    const debit = savedEntry.lines.find((l: any) => l.debit > 0);
    const credit = savedEntry.lines.find((l: any) => l.credit > 0);
    expect(debit.account).toBe(salesReturnsAccount._id);
    expect(debit.debit).toBe(100);
    expect(credit.account).toBe(cashAccount._id);
    expect(credit.credit).toBe(100);
    // Partida doble balanceada
    const totalDebit = savedEntry.lines.reduce(
      (s: number, l: any) => s + l.debit,
      0,
    );
    const totalCredit = savedEntry.lines.reduce(
      (s: number, l: any) => s + l.credit,
      0,
    );
    expect(totalDebit).toBe(totalCredit);
  });

  it("no crea asiento si el monto es 0 o negativo", async () => {
    const result = await service.createRefundEntry({
      tenantId: new Types.ObjectId().toString(),
      refundAmount: 0,
      orderId: new Types.ObjectId().toString(),
      transactionDate: new Date(),
    });

    expect(result).toBeNull();
    expect(journalModel).not.toHaveBeenCalled();
  });
});
