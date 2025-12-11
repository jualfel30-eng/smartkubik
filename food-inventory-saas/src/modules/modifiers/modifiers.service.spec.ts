import { Types } from "mongoose";
import { ModifiersService } from "./modifiers.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("ModifiersService", () => {
  let service: ModifiersService;
  let modifierModel: any;
  let modifierGroupModel: any;
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
    model.populate = jest.fn();
    model.sort = jest.fn();
    model.lean = jest.fn();
    model.exec = jest.fn();
    return model;
  };

  beforeEach(() => {
    modifierModel = buildModel();
    modifierGroupModel = buildModel();
    service = new ModifiersService(
      modifierModel as any,
      modifierGroupModel as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("create valida group existente y guarda priceAdjustment", async () => {
    modifierGroupModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: "g1", tenantId }),
    });

    const dto = {
      name: "Extra cheese",
      priceAdjustment: 2,
      groupId: "g1",
    } as any;
    const saved = await service.create(dto, tenantId);

    expect(modifierModel).toHaveBeenCalledWith(
      expect.objectContaining({ priceAdjustment: 2, groupId: "g1" }),
    );
    expect(saved._id).toBeDefined();
  });

  it("create lanza NotFound si group no existe", async () => {
    modifierGroupModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.create(
        { name: "Extra", priceAdjustment: 1, groupId: "missing" } as any,
        tenantId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("findAll retorna modifiers por tenant", async () => {
    const exec = jest.fn().mockResolvedValue([]);
    modifierModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec,
    });
    await service.findAll(tenantId);
    expect(modifierModel.find).toHaveBeenCalledWith({
      tenantId,
      isDeleted: false,
    });
  });

  it("update valida tenant y existence", async () => {
    modifierModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.update("m1", { name: "New" } as any, tenantId),
    ).rejects.toThrow(NotFoundException);
  });

  it("delete marca isDeleted y protege tenant", async () => {
    modifierModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: "m1" }),
    });
    await service.delete("m1", tenantId);
    expect(modifierModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "m1", tenantId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true },
    );
  });
});
