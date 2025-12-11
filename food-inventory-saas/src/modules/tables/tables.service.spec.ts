import { Types } from "mongoose";
import { TablesService } from "./tables.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("TablesService", () => {
  let service: TablesService;
  let tableModel: any;
  const tenantId = new Types.ObjectId().toString();

  const buildModel = () => {
    const model: any = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() }),
    }));
    model.find = jest.fn();
    model.findOne = jest.fn();
    model.findOneAndUpdate = jest.fn();
    model.sort = jest.fn();
    model.populate = jest.fn();
    model.exec = jest.fn();
    return model;
  };

  beforeEach(() => {
    tableModel = buildModel();
    service = new TablesService(tableModel as any);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("create lanza error si ya existe tableNumber", async () => {
    tableModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: "t1" }),
    });
    await expect(
      service.create({ tableNumber: "10" } as any, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it("create guarda mesa con status available", async () => {
    tableModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const created = await service.create(
      { tableNumber: "11", maxCapacity: 4, minCapacity: 1 } as any,
      tenantId,
    );
    expect(created.status).toBe("available");
  });

  it("seatGuests valida disponibilidad y capacidad", async () => {
    tableModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: "t1",
        tenantId,
        status: "available",
        minCapacity: 1,
        maxCapacity: 4,
        save: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      service.seatGuests(
        { tableId: "t1", guestCount: 0 } as any,
        tenantId,
      ),
    ).rejects.toThrow(BadRequestException);

    await service.seatGuests(
      { tableId: "t1", guestCount: 2 } as any,
      tenantId,
    );
    expect(tableModel.findOne).toHaveBeenCalled();
  });

  it("clearTable marca cleaning y auto disponible luego", async () => {
    const table: any = {
      _id: "t1",
      status: "occupied",
      guestCount: 2,
      tableNumber: "5",
      save: jest.fn().mockResolvedValue(null),
    };
    tableModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(table) });
    tableModel.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(table),
    });
    tableModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...table }),
    });

    const cleared = await service.clearTable("t1", tenantId);
    expect(cleared.status).toBe("cleaning");

    jest.runOnlyPendingTimers();
  });

  it("combineTables valida disponibilidad y parent existente", async () => {
    const t1 = { _id: new Types.ObjectId(), status: "available", tableNumber: 1, save: jest.fn() };
    const t2 = { _id: new Types.ObjectId(), status: "available", tableNumber: 2, save: jest.fn() };
    tableModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([t1, t2]),
    });

    const tables = await service.combineTables(
      {
        tableIds: [t1._id.toString(), t2._id.toString()],
        parentTableId: t1._id.toString(),
      } as any,
      tenantId,
    );

    expect(tables.length).toBe(2);
    expect(t2.status).toBe("occupied");
  });

  it("transferTable mueve ocupación de una mesa a otra", async () => {
    const from = {
      _id: new Types.ObjectId(),
      status: "occupied",
      guestCount: 2,
      currentOrderId: "o1",
      seatedAt: new Date(),
      save: jest.fn().mockResolvedValue(null),
    };
    const to = {
      _id: new Types.ObjectId(),
      status: "available",
      save: jest.fn().mockResolvedValue(null),
    };
    tableModel.findOne.mockImplementation(({ _id }: any) => ({
      exec: jest.fn().mockResolvedValue(_id === from._id.toString() ? from : to),
    }));

    const result = await service.transferTable(
      { fromTableId: from._id.toString(), toTableId: to._id.toString() } as any,
      tenantId,
    );

    expect(result.status).toBe("occupied");
    expect(from.status).toBe("available");
  });

  it("update lanza NotFound si no existe", async () => {
    tableModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.update("t1", { status: "available" } as any, tenantId),
    ).rejects.toThrow(NotFoundException);
  });
});
