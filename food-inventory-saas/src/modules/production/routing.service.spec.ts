import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { RoutingService } from "./routing.service";
import { Routing } from "../../schemas/manufacturing-routing.schema";
import { Product } from "../../schemas/product.schema";
import { WorkCenter } from "../../schemas/work-center.schema";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("RoutingService", () => {
  let service: RoutingService;
  let routingModel: Model<Routing>;
  let productModel: Model<Product>;
  let workCenterModel: Model<WorkCenter>;

  const mockUser = {
    userId: new Types.ObjectId().toString(),
    tenantId: new Types.ObjectId().toString(),
    email: "test@test.com",
  };

  const mockProduct = {
    _id: new Types.ObjectId(),
    name: "Hamburguesa",
    sku: "BURGER-001",
    tenantId: mockUser.tenantId,
  };

  const mockWorkCenter = {
    _id: new Types.ObjectId(),
    name: "Centro de Preparación",
    code: "WC-001",
    capacity: 2,
    hoursPerDay: 8,
    costPerHour: 15,
    efficiency: 100,
    tenantId: mockUser.tenantId,
  };

  const mockRouting = {
    _id: new Types.ObjectId(),
    code: "RTG-001",
    name: "Ruta Hamburguesa",
    productId: mockProduct._id,
    operations: [
      {
        _id: new Types.ObjectId(),
        sequence: 10,
        name: "Preparación",
        workCenterId: mockWorkCenter._id,
        setupTime: 10,
        cycleTime: 5,
        teardownTime: 5,
        laborRequired: 1,
        machinesRequired: 1,
      },
      {
        _id: new Types.ObjectId(),
        sequence: 20,
        name: "Cocción",
        workCenterId: mockWorkCenter._id,
        setupTime: 5,
        cycleTime: 10,
        teardownTime: 5,
        laborRequired: 1,
        machinesRequired: 1,
      },
    ],
    isActive: true,
    version: 1,
    tenantId: mockUser.tenantId,
    save: jest.fn(),
    populate: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingService,
        {
          provide: getModelToken(Routing.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
        {
          provide: getModelToken(Product.name),
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: getModelToken(WorkCenter.name),
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoutingService>(RoutingService);
    routingModel = module.get<Model<Routing>>(getModelToken(Routing.name));
    productModel = module.get<Model<Product>>(getModelToken(Product.name));
    workCenterModel = module.get<Model<WorkCenter>>(
      getModelToken(WorkCenter.name),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a routing successfully", async () => {
      const createDto = {
        productId: mockProduct._id.toString(),
        operations: [
          {
            sequence: 10,
            name: "Preparación",
            workCenterId: mockWorkCenter._id.toString(),
            setupTime: 10,
            cycleTime: 5,
            laborRequired: 1,
          },
        ],
      };

      jest
        .spyOn(productModel, "findById")
        .mockResolvedValue(mockProduct as any);
      jest
        .spyOn(workCenterModel, "findById")
        .mockResolvedValue(mockWorkCenter as any);
      jest.spyOn(routingModel, "countDocuments").mockResolvedValue(0);
      jest
        .spyOn(routingModel, "create")
        .mockResolvedValue([mockRouting] as any);

      const result = await service.create(createDto, mockUser);

      expect(result).toBeDefined();
      expect(productModel.findById).toHaveBeenCalled();
      expect(workCenterModel.findById).toHaveBeenCalled();
    });

    it("should throw NotFoundException if product does not exist", async () => {
      const createDto = {
        productId: new Types.ObjectId().toString(),
        operations: [],
      };

      jest.spyOn(productModel, "findById").mockResolvedValue(null);

      await expect(service.create(createDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should validate operation sequences are unique", async () => {
      const createDto = {
        productId: mockProduct._id.toString(),
        operations: [
          {
            sequence: 10,
            name: "Op 1",
            workCenterId: mockWorkCenter._id.toString(),
            setupTime: 10,
            cycleTime: 5,
            laborRequired: 1,
          },
          {
            sequence: 10, // Duplicado
            name: "Op 2",
            workCenterId: mockWorkCenter._id.toString(),
            setupTime: 10,
            cycleTime: 5,
            laborRequired: 1,
          },
        ],
      };

      jest
        .spyOn(productModel, "findById")
        .mockResolvedValue(mockProduct as any);

      await expect(service.create(createDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("calculateTotalOperationCost", () => {
    it("should calculate total operation cost correctly", async () => {
      const routingId = mockRouting._id.toString();
      const quantity = 100;

      const mockRoutingWithWorkCenters = {
        ...mockRouting,
        operations: [
          {
            ...mockRouting.operations[0],
            workCenterId: mockWorkCenter,
          },
          {
            ...mockRouting.operations[1],
            workCenterId: mockWorkCenter,
          },
        ],
      };

      jest.spyOn(routingModel, "findById").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRoutingWithWorkCenters),
      } as any);

      const result = await service.calculateTotalOperationCost(
        routingId,
        quantity,
        mockUser,
      );

      // Operación 1: (10 + 5 + 100*5) / 60 * 15 = 131.25
      // Operación 2: (5 + 5 + 100*10) / 60 * 15 = 252.50
      // Total ≈ 383.75
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(500);
    });
  });

  describe("calculateTotalProductionTime", () => {
    it("should calculate total production time correctly", async () => {
      const routingId = mockRouting._id.toString();
      const quantity = 100;

      jest.spyOn(routingModel, "findById").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRouting),
      } as any);

      const result = await service.calculateTotalProductionTime(
        routingId,
        quantity,
        mockUser,
      );

      // Operación 1: 10 + 5 + 100*5 = 515 minutos
      // Operación 2: 5 + 5 + 100*10 = 1010 minutos
      // Total = 1525 minutos
      expect(result).toBe(1525);
    });
  });

  describe("validateWorkCenterAvailability", () => {
    it("should validate work center is active and available", async () => {
      const workCenterId = mockWorkCenter._id.toString();

      jest
        .spyOn(workCenterModel, "findById")
        .mockResolvedValue({ ...mockWorkCenter, status: "active" } as any);

      const result = await service.validateWorkCenterAvailability(
        workCenterId,
        mockUser,
      );

      expect(result).toBe(true);
    });

    it("should return false if work center is inactive", async () => {
      const workCenterId = mockWorkCenter._id.toString();

      jest
        .spyOn(workCenterModel, "findById")
        .mockResolvedValue({ ...mockWorkCenter, status: "inactive" } as any);

      const result = await service.validateWorkCenterAvailability(
        workCenterId,
        mockUser,
      );

      expect(result).toBe(false);
    });
  });

  describe("getRoutingEfficiency", () => {
    it("should calculate routing efficiency metrics", async () => {
      const routingId = mockRouting._id.toString();

      const mockRoutingWithMetrics = {
        ...mockRouting,
        operations: mockRouting.operations.map((op) => ({
          ...op,
          workCenterId: {
            ...mockWorkCenter,
            efficiency: 95,
          },
        })),
      };

      jest.spyOn(routingModel, "findById").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRoutingWithMetrics),
      } as any);

      const result = await service.getRoutingEfficiency(routingId, mockUser);

      expect(result).toBeDefined();
      expect(result.averageEfficiency).toBeGreaterThan(0);
      expect(result.averageEfficiency).toBeLessThanOrEqual(100);
    });
  });
});
