import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException } from "@nestjs/common";
import { Types } from "mongoose";
import { StoreCreditService } from "./store-credit.service";
import {
  StoreCreditAccount,
  StoreCreditMovement,
} from "./schemas/store-credit.schema";

describe("StoreCreditService", () => {
  let service: StoreCreditService;
  let accountModel: any;
  let movementModel: any;

  const tenantId = new Types.ObjectId().toString();
  const customerId = new Types.ObjectId().toString();

  beforeEach(async () => {
    accountModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ balance: 30 }),
      }),
      findOneAndUpdate: jest.fn(),
    };
    movementModel = {
      create: jest
        .fn()
        .mockImplementation((doc: any) =>
          Promise.resolve({ ...doc, _id: new Types.ObjectId() }),
        ),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreCreditService,
        {
          provide: getModelToken(StoreCreditAccount.name),
          useValue: accountModel,
        },
        {
          provide: getModelToken(StoreCreditMovement.name),
          useValue: movementModel,
        },
      ],
    }).compile();

    service = module.get<StoreCreditService>(StoreCreditService);
  });

  it("getBalance devuelve el saldo del cliente", async () => {
    await expect(service.getBalance(tenantId, customerId)).resolves.toBe(30);
  });

  it("credit incrementa el saldo (upsert) y escribe el movimiento con balanceAfter", async () => {
    accountModel.findOneAndUpdate.mockResolvedValue({ balance: 80 });

    const { balance, movement } = await service.credit({
      tenantId,
      customerId,
      amount: 50,
      source: "return",
      reference: "RET-2026-0001",
    });

    expect(balance).toBe(80);
    // $inc de +50 con upsert
    const [, update, opts] = accountModel.findOneAndUpdate.mock.calls[0];
    expect(update.$inc.balance).toBe(50);
    expect(opts.upsert).toBe(true);
    // Movimiento con el balanceAfter real
    expect(movementModel.create).toHaveBeenCalledTimes(1);
    expect(movement.type).toBe("credit");
    expect(movement.balanceAfter).toBe(80);
  });

  it("debit descuenta el saldo si hay suficiente", async () => {
    accountModel.findOneAndUpdate.mockResolvedValue({ balance: 10 });

    const { balance } = await service.debit({
      tenantId,
      customerId,
      amount: 20,
      source: "order_redemption",
    });

    expect(balance).toBe(10);
    const [filter, update] = accountModel.findOneAndUpdate.mock.calls[0];
    // Filtro atómico: sólo matchea si balance >= amount
    expect(filter.balance.$gte).toBe(20);
    expect(update.$inc.balance).toBe(-20);
  });

  it("debit falla si el saldo es insuficiente (filtro no matchea)", async () => {
    accountModel.findOneAndUpdate.mockResolvedValue(null);

    await expect(
      service.debit({
        tenantId,
        customerId,
        amount: 999,
        source: "order_redemption",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(movementModel.create).not.toHaveBeenCalled();
  });

  it("rechaza montos <= 0", async () => {
    await expect(
      service.credit({ tenantId, customerId, amount: 0, source: "manual" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
