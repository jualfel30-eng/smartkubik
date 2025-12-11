import { Test } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { UnitTypesService } from "../../src/modules/unit-types/unit-types.service";
import { UnitType } from "../../src/schemas/unit-type.schema";

describe("UnitTypesService (unit)", () => {
  let service: UnitTypesService;
  let unitTypeModel: any;

  const mockDoc = (data: any) => ({
    ...data,
    _id: data._id || new Types.ObjectId(),
    lean: jest.fn().mockReturnValue(data),
    save: jest.fn().mockResolvedValue(data),
  });

  beforeEach(async () => {
    unitTypeModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UnitTypesService,
        { provide: getModelToken(UnitType.name), useValue: unitTypeModel },
      ],
    }).compile();

    service = module.get(UnitTypesService);
  });

  describe("create", () => {
    const baseDto = {
      name: "Peso",
      description: "Unidades de peso",
      category: "weight",
      baseUnit: { unit: "Kilogramo", abbreviation: "kg" },
      conversions: [
        { unit: "Kilogramo", abbreviation: "kg", factor: 1, isBase: true },
        { unit: "Gramo", abbreviation: "g", factor: 0.001, isBase: false },
      ],
    };

    it("rechaza nombre duplicado por tenant", async () => {
      unitTypeModel.findOne.mockResolvedValue({ _id: "dup" });
      await expect(service.create(baseDto as any, "t1", "u1")).rejects.toThrow(
        ConflictException,
      );
    });

    it("rechaza si no hay unidad base", async () => {
      unitTypeModel.findOne.mockResolvedValue(null);
      const dto = {
        ...baseDto,
        conversions: [{ unit: "Gramo", abbreviation: "g", factor: 0.001 }],
      };
      await expect(service.create(dto as any, "t1", "u1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("crea correctamente con unidad base válida", async () => {
      unitTypeModel.findOne.mockResolvedValue(null);
      unitTypeModel.create.mockImplementation(async (data: any) => mockDoc(data));

      const result = await service.create(baseDto as any, "t1", "u1");

      expect(unitTypeModel.create).toHaveBeenCalled();
      expect(result.name).toBe("Peso");
      expect(result.tenantId.toString()).toBe("t1");
    });
  });

  describe("update/remove", () => {
    it("impide actualizar tipo system-defined", async () => {
      unitTypeModel.findById = jest
        .fn()
        .mockResolvedValue(mockDoc({ isSystemDefined: true }));
      await expect(
        service.update("id1", { description: "new" } as any, "u1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza NotFound al eliminar inexistente", async () => {
      unitTypeModel.findById = jest.fn().mockResolvedValue(null);
      await expect(service.remove("id1")).rejects.toThrow(NotFoundException);
    });

    it("actualiza tipo no system-defined", async () => {
      unitTypeModel.findById = jest
        .fn()
        .mockResolvedValue(mockDoc({ isSystemDefined: false }));
      unitTypeModel.findByIdAndUpdate = jest.fn().mockResolvedValue({
        name: "Peso",
        conversions: [{ abbreviation: "kg", factor: 1, isBase: true }],
      });

      const result = await service.update(
        "id1",
        {
          description: "new",
          conversions: [{ abbreviation: "kg", factor: 1, isBase: true }],
        } as any,
        "u1",
      );

      expect(result.name).toBe("Peso");
      expect(unitTypeModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe("convertUnits", () => {
    it("convierte entre unidades del mismo tipo", async () => {
      const unitType = {
        _id: "ut1",
        name: "Peso",
        conversions: [
          { abbreviation: "kg", factor: 1 },
          { abbreviation: "g", factor: 0.001 },
        ],
      };
      unitTypeModel.findById = jest.fn().mockResolvedValue(unitType);

      const result = await service.convertUnits({
        unitTypeId: "ut1",
        fromUnit: "kg",
        toUnit: "g",
        quantity: 2,
      });

      expect(result.converted.quantity).toBe(2000);
      expect(result.converted.unit).toBe("g");
    });

    it("falla si la unidad origen no existe", async () => {
      unitTypeModel.findById = jest.fn().mockResolvedValue({
        conversions: [{ abbreviation: "kg", factor: 1 }],
      });
      await expect(
        service.convertUnits({
          unitTypeId: "ut1",
          fromUnit: "lb",
          toUnit: "kg",
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findOne/getConversionFactor", () => {
    it("lanza BadRequest con id inválido", async () => {
      await expect(service.findOne("bad-id")).rejects.toThrow(BadRequestException);
    });

    it("obtiene factor directo entre unidades", async () => {
      const unitType = {
        _id: "ut1",
        name: "Peso",
        conversions: [
          { abbreviation: "kg", factor: 1 },
          { abbreviation: "g", factor: 0.001 },
        ],
      };
      unitTypeModel.findById = jest.fn().mockResolvedValue(unitType);

      const factor = await service.getConversionFactor("ut1", "kg", "g");
      expect(factor).toBeCloseTo(0.001);
    });
  });

  describe("findAll/getCategories", () => {
    it("filtra includeCustom y categoría", async () => {
      unitTypeModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ name: "Peso" }]),
      });

      const results = await service.findAll(
        { category: "weight", includeCustom: true, isActive: true } as any,
        "t1",
      );

      expect(unitTypeModel.find).toHaveBeenCalled();
      expect(results[0].name).toBe("Peso");
    });

    it("agrupa categorías con aggregate", async () => {
      unitTypeModel.aggregate.mockResolvedValue([
        { category: "weight", count: 2 },
      ]);
      const cats = await service.getCategories();
      expect(cats[0].category).toBe("weight");
      expect(cats[0].count).toBe(2);
    });
  });
});
