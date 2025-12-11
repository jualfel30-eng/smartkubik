import { Types } from "mongoose";
import { ModifierGroupsService } from "./modifier-groups.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("ModifierGroupsService", () => {
  let service: ModifierGroupsService;
  let modifierGroupModel: any;
  let modifierModel: any;

  const tenantId = new Types.ObjectId().toString();

  const buildModel = () => {
    const model: any = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() }),
    }));
    model.find = jest.fn();
    model.findOne = jest.fn();
    model.findOneAndUpdate = jest.fn();
    model.updateMany = jest.fn();
    model.populate = jest.fn();
    model.sort = jest.fn();
    model.lean = jest.fn();
    model.exec = jest.fn();
    return model;
  };

  beforeEach(() => {
    modifierGroupModel = buildModel();
    modifierModel = buildModel();
    service = new ModifierGroupsService(
      modifierGroupModel as any,
      modifierModel as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("createGroup valida minSelections <= maxSelections", async () => {
    await expect(
      service.createGroup(
        {
          name: "Opciones",
          minSelections: 2,
          maxSelections: 1,
          selectionType: "multiple",
        } as any,
        tenantId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("createGroup guarda grupo con tenant", async () => {
    const dto = {
      name: "Salsas",
      selectionType: "multiple",
      minSelections: 0,
      maxSelections: 3,
    } as any;

    const saved = await service.createGroup(dto, tenantId);

    expect(modifierGroupModel).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId }),
    );
    expect(saved._id).toBeDefined();
  });

  it("findGroupById lanza NotFound si no existe", async () => {
    modifierGroupModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findGroupById("g1", tenantId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("findGroupsByProduct retorna grupos con modifiers agrupados", async () => {
    const groupId = new Types.ObjectId();
    modifierGroupModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        { _id: groupId, name: "Toppings" },
      ]),
    });

    modifierModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        { _id: new Types.ObjectId(), groupId, name: "Pepperoni" },
      ]),
    });

    const result = await service.findGroupsByProduct(
      new Types.ObjectId().toString(),
      tenantId,
    );

    expect(result[0].modifiers?.length).toBe(1);
    expect(result[0].modifiers?.[0].name).toBe("Pepperoni");
  });

  it("updateGroup valida minSelections/maxSelections y NotFound", async () => {
    await expect(
      service.updateGroup(
        "g1",
        { minSelections: 3, maxSelections: 1 } as any,
        tenantId,
      ),
    ).rejects.toThrow(BadRequestException);

    modifierGroupModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.updateGroup("g1", { name: "Nuevo" } as any, tenantId),
    ).rejects.toThrow(NotFoundException);
  });

  it("deleteGroup hace soft delete y cascada en modifiers", async () => {
    modifierGroupModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: "g1" }),
    });
    modifierModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

    await service.deleteGroup("g1", tenantId);

    expect(modifierGroupModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "g1", tenantId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true },
    );
    expect(modifierModel.updateMany).toHaveBeenCalled();
  });
});
