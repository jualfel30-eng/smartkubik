import { Types } from "mongoose";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BillSplitsService } from "./bill-splits.service";

describe("BillSplitsService", () => {
  let service: BillSplitsService;
  let billSplitModel: any;
  let orderModel: any;

  const tenantId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId();

  const buildModel = () => {
    const model: any = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() }),
    }));
    model.findOne = jest.fn();
    model.find = jest.fn();
    model.findById = jest.fn();
    model.findOneAndUpdate = jest.fn();
    model.updateOne = jest.fn();
    return model;
  };

  beforeEach(() => {
    billSplitModel = buildModel();
    orderModel = buildModel();
    service = new BillSplitsService(
      billSplitModel as any,
      orderModel as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("createSplit valida que la orden exista y no esté eliminada", async () => {
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.createSplit(
        { orderId: orderId.toString(), splits: [] } as any,
        tenantId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("createSplit calcula balance pendiente", async () => {
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: orderId,
        totalAmount: 100,
        tenantId,
        isDeleted: false,
      }),
    });
    billSplitModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const result = await service.createSplit(
      {
        orderId: orderId.toString(),
        splits: [
          { customerName: "Alice", amount: 60 },
          { customerName: "Bob", amount: 40 },
        ],
      } as any,
      tenantId,
    );

    expect(result.remainingBalance).toBe(0);
  });

  it("updateSplit registra pago parcial y marca paid cuando saldo 0", async () => {
    const splitId = new Types.ObjectId();
    const splitDoc: any = {
      _id: splitId,
      tenantId,
      orderId,
      splits: [
        { _id: "s1", amount: 50, paidAmount: 20, status: "partial" },
        { _id: "s2", amount: 50, paidAmount: 0, status: "pending" },
      ],
      remainingBalance: 80,
      save: jest.fn().mockResolvedValue(null),
    };
    billSplitModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(splitDoc),
    });

    const result = await service.updateSplit(
      splitId.toString(),
      { splitId: "s1", paymentAmount: 30 } as any,
      tenantId,
    );

    const updated = result.splits.find((s: any) => s._id === "s1");
    expect(updated?.paidAmount).toBe(50);
    expect(updated?.status).toBe("paid");
    expect(result.remainingBalance).toBe(50);
  });

  it("deleteSplit marca isDeleted y protege tenant", async () => {
    const splitDoc = {
      _id: new Types.ObjectId(),
      tenantId,
      isDeleted: false,
      save: jest.fn().mockResolvedValue(null),
    };
    billSplitModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(splitDoc),
    });

    await service.deleteSplit(splitDoc._id.toString(), tenantId);
    expect(splitDoc.isDeleted).toBe(true);
  });
});
