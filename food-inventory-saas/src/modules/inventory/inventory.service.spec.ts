import { InventoryService } from "./inventory.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";

describe("InventoryService", () => {
  let service: InventoryService;
  let stockModel: any;
  let movementModel: any;
  let productModel: any;

  const tenantId = new Types.ObjectId().toString();

  const buildModel = () => {
    const model: any = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() }),
    }));
    model.find = jest.fn();
    model.findOne = jest.fn();
    model.findOneAndUpdate = jest.fn();
    model.updateOne = jest.fn();
    model.aggregate = jest.fn();
    model.countDocuments = jest.fn();
    model.exec = jest.fn();
    return model;
  };

  beforeEach(() => {
    stockModel = buildModel();
    movementModel = buildModel();
    productModel = buildModel();

    service = new InventoryService(
      stockModel as any,
      movementModel as any,
      productModel as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deductInventory resta stock y lanza error si insuficiente", async () => {
    stockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: "s1",
        tenantId,
        quantity: 5,
        save: jest.fn().mockResolvedValue(null),
      }),
    });

    await service.deductInventory(
      {
        productId: "p1",
        quantity: 3,
      } as any,
      tenantId,
    );

    await expect(
      service.deductInventory(
        {
          productId: "p1",
          quantity: 10,
        } as any,
        tenantId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("reverseDeduction incrementa stock y valida existencia", async () => {
    const save = jest.fn().mockResolvedValue(null);
    stockModel.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({
        _id: "s1",
        quantity: 2,
        tenantId,
        save,
      }),
    });

    const result = await service.reverseDeduction(
      { productId: "p1", quantity: 2 } as any,
      tenantId,
    );
    expect(result.quantity).toBe(4);
    expect(save).toHaveBeenCalled();
  });

  it("getAvailableStock calcula stock disponible por producto", async () => {
    stockModel.aggregate.mockResolvedValue([
      { _id: "p1", totalStock: 10 },
      { _id: "p2", totalStock: 0 },
    ]);

    const result = await service.getAvailableStock(tenantId);
    expect(result.p1).toBe(10);
    expect(result.p2).toBe(0);
  });

  it("reserveInventory marca isReserved en items", async () => {
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    movementModel.updateOne = updateOne;

    await service.reserveInventory(
      [
        { productSku: "SKU-1", quantity: 2 },
        { productSku: "SKU-2", quantity: 1 },
      ],
      tenantId,
    );

    expect(updateOne).toHaveBeenCalled();
  });

  it("releaseInventory revierte reserva", async () => {
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    movementModel.updateOne = updateOne;

    await service.releaseInventory(
      [
        { productSku: "SKU-1", quantity: 2 },
        { productSku: "SKU-2", quantity: 1 },
      ],
      tenantId,
    );

    expect(updateOne).toHaveBeenCalled();
  });
});
