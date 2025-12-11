import { UnitTypesService } from "./unit-types.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";

describe("UnitTypesService", () => {
  let service: UnitTypesService;
  let unitTypeModel: any;
  const tenantId = new Types.ObjectId().toString();

  const buildModel = () => {
    const model: any = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() }),
    }));
    model.find = jest.fn();
    model.findOne = jest.fn();
    model.findById = jest.fn();
    model.findOneAndUpdate = jest.fn();
    model.updateMany = jest.fn();
    model.deleteOne = jest.fn();
    model.exec = jest.fn();
    return model;
  };

  beforeEach(() => {
    unitTypeModel = buildModel();
    service = new UnitTypesService(unitTypeModel as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("create valida duplicados por tenant", async () => {
    unitTypeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: "existing" }),
    });
    await expect(
      service.create({ name: "Kg", abbreviation: "kg" } as any, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it("create guarda unit type con tenant", async () => {
    unitTypeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const saved = await service.create(
      { name: "Gram", abbreviation: "g" } as any,
      tenantId,
    );
    expect(saved._id).toBeDefined();
  });

  it("findAll por tenant", async () => {
    const exec = jest.fn().mockResolvedValue([]);
    unitTypeModel.find.mockReturnValue({ exec });
    await service.findAll(tenantId);
    expect(unitTypeModel.find).toHaveBeenCalledWith({
      tenantId,
      isDeleted: false,
    });
  });

  it("update lanza NotFound", async () => {
    unitTypeModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.update("u1", { name: "New" } as any, tenantId),
    ).rejects.toThrow(NotFoundException);
  });

  it("delete marca isDeleted", async () => {
    unitTypeModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: "u1" }),
    });
    await service.delete("u1", tenantId);
    expect(unitTypeModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "u1", tenantId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true },
    );
  });
});
