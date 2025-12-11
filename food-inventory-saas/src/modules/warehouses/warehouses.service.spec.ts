import { Test } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { WarehousesService } from "./warehouses.service";
import { Warehouse } from "../../schemas/warehouse.schema";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("WarehousesService", () => {
  let service: WarehousesService;
  let model: any;

  const buildModel = () => {
    const m: any = {
      findOne: jest.fn(),
      find: jest.fn(),
      updateMany: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    m.mockSaved = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: "w1" }),
    }));
    return m;
  };

  beforeEach(async () => {
    model = buildModel();
    const module = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: getModelToken(Warehouse.name), useValue: model },
      ],
    }).compile();
    service = module.get(WarehousesService);
  });

  afterEach(() => jest.clearAllMocks());

  it("create valida duplicado por code", async () => {
    model.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({}) });
    await expect(
      service.create({ name: "A", code: "GEN" }, "t1", "u1"),
    ).rejects.toThrow(BadRequestException);
  });

  it("create setea default y desmarca otros", async () => {
    model.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const save = jest.fn().mockResolvedValue({ _id: "w1", isDefault: true });
    model.mockSaved = jest.fn().mockImplementation((data) => ({
      ...data,
      save,
    }));
    // simulate constructor new
    (model as any).prototype = {};
    const newFn = jest.fn().mockImplementation((data) => model.mockSaved(data));
    Object.setPrototypeOf(model, newFn);

    await service.create({ name: "A", code: "GEN", isDefault: true }, "t1");
    expect(model.updateMany).toHaveBeenCalledWith(
      { tenantId: "t1", isDefault: true },
      { $set: { isDefault: false } },
    );
    expect(save).toHaveBeenCalled();
  });

  it("findAll filtra por tenant e isActive", async () => {
    const exec = jest.fn().mockResolvedValue([]);
    model.find.mockReturnValue({ sort: jest.fn().mockReturnThis(), lean: exec });
    await service.findAll("t1");
    expect(model.find).toHaveBeenCalledWith({
      tenantId: "t1",
      isDeleted: false,
      isActive: true,
    });
  });

  it("update lanza NotFound si no existe", async () => {
    model.findOne.mockResolvedValue(null);
    await expect(
      service.update("w1", { name: "New" }, "t1", "u1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("delete hace soft delete y NotFound si falta", async () => {
    model.findOneAndUpdate.mockReturnValue({
      new: true,
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(service.delete("w1", "t1")).rejects.toThrow(
      NotFoundException,
    );
  });
});
