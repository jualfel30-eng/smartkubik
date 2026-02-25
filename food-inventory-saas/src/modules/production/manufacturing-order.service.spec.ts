import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ManufacturingOrderService } from "./manufacturing-order.service";
import { ManufacturingOrder } from "../../schemas/manufacturing-order.schema";
import { Product } from "../../schemas/product.schema";
import { WorkCenter } from "../../schemas/work-center.schema";
import { ProductionVersion } from "../../schemas/production-version.schema";
import { BillOfMaterials } from "../../schemas/bill-of-materials.schema";
import { Routing } from "../../schemas/manufacturing-routing.schema";
import { Inventory } from "../../schemas/inventory.schema";
import { InventoryService } from "../inventory/inventory.service";
import { AccountingService } from "../accounting/accounting.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("ManufacturingOrderService", () => {
  let service: ManufacturingOrderService;
  let manufacturingOrderModel: Model<ManufacturingOrder>;
  let productModel: Model<Product>;
  let billOfMaterialsModel: Model<BillOfMaterials>;
  let routingModel: Model<Routing>;
  let inventoryModel: Model<Inventory>;
  let inventoryService: InventoryService;
  let accountingService: AccountingService;

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

  const mockBOM = {
    _id: new Types.ObjectId(),
    code: "BOM-001",
    productId: mockProduct._id,
    components: [
      {
        productId: new Types.ObjectId(),
        quantity: 1,
        unit: "kg",
        scrapPercentage: 5,
      },
    ],
    tenantId: mockUser.tenantId,
  };

  const mockRouting = {
    _id: new Types.ObjectId(),
    code: "RTG-001",
    productId: mockProduct._id,
    operations: [
      {
        sequence: 10,
        name: "Preparación",
        workCenterId: new Types.ObjectId(),
        setupTime: 10,
        cycleTime: 5,
        laborRequired: 1,
      },
    ],
    tenantId: mockUser.tenantId,
  };

  const mockMO = {
    _id: new Types.ObjectId(),
    code: "MO-001",
    productId: mockProduct._id,
    bomId: mockBOM._id,
    routingId: mockRouting._id,
    quantity: 100,
    unit: "unidades",
    status: "draft",
    tenantId: mockUser.tenantId,
    operations: [],
    createdAt: new Date(),
    save: jest.fn(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManufacturingOrderService,
        {
          provide: getModelToken(ManufacturingOrder.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
            countDocuments: jest.fn(),
            exec: jest.fn(),
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
        {
          provide: getModelToken(ProductionVersion.name),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(BillOfMaterials.name),
          useValue: {
            findById: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(Routing.name),
          useValue: {
            findById: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(Inventory.name),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: "DatabaseConnection",
          useValue: {
            startSession: jest.fn().mockResolvedValue({
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              abortTransaction: jest.fn(),
              endSession: jest.fn(),
            }),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            reserveStock: jest.fn(),
            releaseReservation: jest.fn(),
            consumeStock: jest.fn(),
          },
        },
        {
          provide: AccountingService,
          useValue: {
            createJournalEntry: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ManufacturingOrderService>(ManufacturingOrderService);
    manufacturingOrderModel = module.get<Model<ManufacturingOrder>>(
      getModelToken(ManufacturingOrder.name),
    );
    productModel = module.get<Model<Product>>(getModelToken(Product.name));
    billOfMaterialsModel = module.get<Model<BillOfMaterials>>(
      getModelToken(BillOfMaterials.name),
    );
    routingModel = module.get<Model<Routing>>(getModelToken(Routing.name));
    inventoryModel = module.get<Model<Inventory>>(
      getModelToken(Inventory.name),
    );
    inventoryService = module.get<InventoryService>(InventoryService);
    accountingService = module.get<AccountingService>(AccountingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a manufacturing order successfully", async () => {
      const createDto = {
        productId: mockProduct._id.toString(),
        quantityToProduce: 100,
        unit: "unidades",
        productionVersionId: new Types.ObjectId().toString(),
        scheduledStartDate: new Date().toISOString(),
      };

      jest
        .spyOn(productModel, "findById")
        .mockResolvedValue(mockProduct as any);
      jest
        .spyOn(billOfMaterialsModel, "findOne")
        .mockResolvedValue(mockBOM as any);
      jest.spyOn(routingModel, "findOne").mockResolvedValue(mockRouting as any);
      jest
        .spyOn(manufacturingOrderModel, "countDocuments")
        .mockResolvedValue(0);
      jest
        .spyOn(manufacturingOrderModel, "create")
        .mockResolvedValue([mockMO] as any);

      const result = await service.create(createDto, mockUser);

      expect(result).toBeDefined();
      expect(productModel.findById).toHaveBeenCalledWith(createDto.productId);
    });

    it("should throw NotFoundException if product does not exist", async () => {
      const createDto = {
        productId: new Types.ObjectId().toString(),
        quantityToProduce: 100,
        unit: "unidades",
        productionVersionId: new Types.ObjectId().toString(),
        scheduledStartDate: new Date().toISOString(),
      };

      jest.spyOn(productModel, "findById").mockResolvedValue(null);

      await expect(service.create(createDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("checkMaterialsAvailability", () => {
    it("should check materials availability correctly", async () => {
      const bomId = mockBOM._id.toString();
      const quantity = 100;
      const unit = "unidades";

      const mockBOMWithComponents = {
        ...mockBOM,
        components: [
          {
            productId: { _id: new Types.ObjectId(), name: "Ingredient 1" },
            quantity: 1,
            unit: "kg",
            scrapPercentage: 5,
          },
        ],
        populate: jest.fn().mockReturnThis(),
      };

      jest.spyOn(billOfMaterialsModel, "findById").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockBOMWithComponents),
      } as any);

      jest.spyOn(inventoryModel, "findOne").mockResolvedValue({
        quantity: 200,
      } as any);

      const result = await service.checkMaterialsAvailability(
        bomId,
        quantity,
        unit,
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.allAvailable).toBeDefined();
      expect(result.components).toBeDefined();
    });
  });

  describe("confirm", () => {
    it("should confirm a manufacturing order", async () => {
      const orderId = mockMO._id.toString();
      const confirmDto = {
        reserveMaterials: true,
      };

      const mockMOToConfirm = {
        ...mockMO,
        status: "draft",
        bomId: { components: mockBOM.components },
        save: jest.fn().mockResolvedValue(mockMO),
        populate: jest.fn().mockReturnThis(),
      };

      jest.spyOn(manufacturingOrderModel, "findById").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMOToConfirm),
      } as any);

      const result = await service.confirm(orderId, confirmDto, mockUser);

      expect(result).toBeDefined();
    });

    it("should throw BadRequestException if order is not in draft status", async () => {
      const orderId = mockMO._id.toString();
      const confirmDto = {
        reserveMaterials: true,
      };

      const mockMOConfirmed = {
        ...mockMO,
        status: "confirmed",
      };

      jest.spyOn(manufacturingOrderModel, "findById").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMOConfirmed),
      } as any);

      await expect(
        service.confirm(orderId, confirmDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("calculateScheduledDates", () => {
    it("should calculate scheduled dates based on work center capacity", async () => {
      const orderId = mockMO._id.toString();
      const startDate = new Date();

      const mockMOWithOperations = {
        ...mockMO,
        operations: [
          {
            _id: new Types.ObjectId(),
            name: "Preparación",
            workCenterId: {
              _id: new Types.ObjectId(),
              name: "Centro de Trabajo 1",
              capacity: 2,
              hoursPerDay: 8,
              efficiency: 100,
            },
            estimatedDuration: 60,
            status: "pending",
          },
        ],
        populate: jest.fn().mockReturnThis(),
      };

      jest.spyOn(manufacturingOrderModel, "findById").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMOWithOperations),
      } as any);

      const result = await service.calculateScheduledDates(
        orderId,
        startDate,
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.scheduledEndDate).toBeDefined();
      expect(result.operationSchedule).toBeDefined();
      expect(result.operationSchedule.length).toBeGreaterThan(0);
    });
  });

  describe("detectResourceConflicts", () => {
    it("should detect material and capacity conflicts", async () => {
      const orderId = mockMO._id.toString();

      const mockMOWithMaterials = {
        ...mockMO,
        bomId: {
          components: [
            {
              productId: { _id: new Types.ObjectId(), name: "Material 1" },
              quantity: 100,
              unit: "kg",
            },
          ],
        },
        quantity: 100,
        operations: [],
        populate: jest.fn().mockReturnThis(),
      };

      jest.spyOn(manufacturingOrderModel, "findById").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMOWithMaterials),
      } as any);

      jest.spyOn(inventoryModel, "findOne").mockResolvedValue({
        quantity: 50, // Stock insuficiente
      } as any);

      const result = await service.detectResourceConflicts(orderId, mockUser);

      expect(result).toBeDefined();
      expect(result.hasConflicts).toBeDefined();
      expect(result.materialConflicts).toBeDefined();
    });
  });

  describe("generatePurchaseRequisitions", () => {
    it("should generate purchase requisitions for missing materials", async () => {
      const orderId = mockMO._id.toString();

      const mockMOWithMaterials = {
        ...mockMO,
        bomId: {
          components: [
            {
              productId: {
                _id: new Types.ObjectId(),
                name: "Material 1",
                sku: "MAT-001",
                unitCost: 10,
                suppliers: [
                  {
                    supplierId: "SUPP-001",
                    leadTimeDays: 7,
                    moq: 50,
                  },
                ],
              },
              quantity: 100,
              unit: "kg",
            },
          ],
        },
        quantity: 100,
        populate: jest.fn().mockReturnThis(),
      };

      jest.spyOn(manufacturingOrderModel, "findById").mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMOWithMaterials),
      } as any);

      jest.spyOn(inventoryModel, "findOne").mockResolvedValue({
        quantity: 30, // Stock menor al requerido
      } as any);

      const result = await service.generatePurchaseRequisitions(
        orderId,
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.requisitions).toBeDefined();
      expect(result.requisitions.length).toBeGreaterThan(0);
      expect(result.totalEstimatedCost).toBeGreaterThan(0);
    });
  });

  describe("getProductionEfficiencyDashboard", () => {
    it("should return production efficiency metrics", async () => {
      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      const mockOrders = [
        {
          _id: new Types.ObjectId(),
          status: "completed",
          actualStartDate: new Date("2025-01-10"),
          actualEndDate: new Date("2025-01-15"),
          scheduledEndDate: new Date("2025-01-14"),
          operations: [],
        },
      ];

      jest.spyOn(manufacturingOrderModel, "find").mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockOrders),
      } as any);

      const result = await service.getProductionEfficiencyDashboard(
        startDate,
        endDate,
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.overview).toBeDefined();
      expect(result.efficiency).toBeDefined();
      expect(result.efficiency.oee).toBeDefined();
    });
  });

  describe("getProductionCostsDashboard", () => {
    it("should return production costs analysis", async () => {
      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      const mockOrders = [
        {
          _id: new Types.ObjectId(),
          code: "MO-001",
          productId: { name: "Product 1" },
          estimatedCost: 1000,
          actualCost: 1100,
        },
      ];

      jest.spyOn(manufacturingOrderModel, "find").mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockOrders),
      } as any);

      const result = await service.getProductionCostsDashboard(
        startDate,
        endDate,
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.overview).toBeDefined();
      expect(result.overview.totalPlannedCost).toBe(1000);
      expect(result.overview.totalActualCost).toBe(1100);
      expect(result.overview.variance).toBe(100);
    });
  });
});
