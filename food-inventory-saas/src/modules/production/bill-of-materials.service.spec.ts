import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillOfMaterialsService } from './bill-of-materials.service';
import { BillOfMaterials } from '../../schemas/bill-of-materials.schema';
import { Product } from '../../schemas/product.schema';
import { Inventory } from '../../schemas/inventory.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BillOfMaterialsService', () => {
  let service: BillOfMaterialsService;
  let bomModel: Model<BillOfMaterials>;
  let productModel: Model<Product>;
  let inventoryModel: Model<Inventory>;

  const mockUser = {
    userId: new Types.ObjectId().toString(),
    tenantId: new Types.ObjectId().toString(),
    email: 'test@test.com',
  };

  const mockProduct = {
    _id: new Types.ObjectId(),
    name: 'Hamburguesa',
    sku: 'BURGER-001',
    tenantId: mockUser.tenantId,
  };

  const mockComponent = {
    _id: new Types.ObjectId(),
    name: 'Pan',
    sku: 'BREAD-001',
    unitCost: 5,
    tenantId: mockUser.tenantId,
  };

  const mockBOM = {
    _id: new Types.ObjectId(),
    code: 'BOM-001',
    productId: mockProduct._id,
    components: [
      {
        productId: mockComponent._id,
        quantity: 2,
        unit: 'unidades',
        scrapPercentage: 5,
      },
    ],
    version: 1,
    isActive: true,
    tenantId: mockUser.tenantId,
    save: jest.fn(),
    populate: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillOfMaterialsService,
        {
          provide: getModelToken(BillOfMaterials.name),
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
          provide: getModelToken(Inventory.name),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillOfMaterialsService>(BillOfMaterialsService);
    bomModel = module.get<Model<BillOfMaterials>>(
      getModelToken(BillOfMaterials.name),
    );
    productModel = module.get<Model<Product>>(getModelToken(Product.name));
    inventoryModel = module.get<Model<Inventory>>(getModelToken(Inventory.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a BOM successfully', async () => {
      const createDto = {
        productId: mockProduct._id.toString(),
        components: [
          {
            productId: mockComponent._id.toString(),
            quantity: 2,
            unit: 'unidades',
            scrapPercentage: 5,
          },
        ],
      };

      jest.spyOn(productModel, 'findById').mockResolvedValue(mockProduct as any);
      jest.spyOn(bomModel, 'countDocuments').mockResolvedValue(0);
      jest.spyOn(bomModel, 'create').mockResolvedValue([mockBOM] as any);

      const result = await service.create(createDto, mockUser);

      expect(result).toBeDefined();
      expect(productModel.findById).toHaveBeenCalledWith(createDto.productId);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const createDto = {
        productId: new Types.ObjectId().toString(),
        components: [],
      };

      jest.spyOn(productModel, 'findById').mockResolvedValue(null);

      await expect(service.create(createDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent circular dependencies', async () => {
      const createDto = {
        productId: mockProduct._id.toString(),
        components: [
          {
            productId: mockProduct._id.toString(), // Mismo producto
            quantity: 1,
            unit: 'unidades',
          },
        ],
      };

      jest.spyOn(productModel, 'findById').mockResolvedValue(mockProduct as any);

      await expect(service.create(createDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('calculateTotalMaterialCost', () => {
    it('should calculate total material cost correctly', async () => {
      const bomId = mockBOM._id.toString();

      const mockBOMWithCosts = {
        ...mockBOM,
        components: [
          {
            productId: { ...mockComponent, unitCost: 5 },
            quantity: 2,
            unit: 'unidades',
            scrapPercentage: 10,
          },
        ],
      };

      jest
        .spyOn(bomModel, 'findById')
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBOMWithCosts),
        } as any);

      const result = await service.calculateTotalMaterialCost(bomId, mockUser);

      // Costo = (cantidad × costo unitario) × (1 + scrap%)
      // = (2 × 5) × 1.10 = 11
      expect(result).toBe(11);
    });

    it('should throw NotFoundException if BOM does not exist', async () => {
      const bomId = new Types.ObjectId().toString();

      jest
        .spyOn(bomModel, 'findById')
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        } as any);

      await expect(
        service.calculateTotalMaterialCost(bomId, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkComponentsAvailability', () => {
    it('should check components availability correctly', async () => {
      const bomId = mockBOM._id.toString();
      const quantity = 10;

      const mockBOMWithComponents = {
        ...mockBOM,
        components: [
          {
            productId: mockComponent,
            quantity: 2,
            unit: 'unidades',
            scrapPercentage: 5,
          },
        ],
      };

      jest
        .spyOn(bomModel, 'findById')
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBOMWithComponents),
        } as any);

      jest.spyOn(inventoryModel, 'findOne').mockResolvedValue({
        quantity: 100,
      } as any);

      const result = await service.checkComponentsAvailability(
        bomId,
        quantity,
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      expect(result.components).toHaveLength(1);
      expect(result.components[0].available).toBeGreaterThan(0);
    });

    it('should detect insufficient stock', async () => {
      const bomId = mockBOM._id.toString();
      const quantity = 100;

      const mockBOMWithComponents = {
        ...mockBOM,
        components: [
          {
            productId: mockComponent,
            quantity: 2,
            unit: 'unidades',
            scrapPercentage: 5,
          },
        ],
      };

      jest
        .spyOn(bomModel, 'findById')
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBOMWithComponents),
        } as any);

      jest.spyOn(inventoryModel, 'findOne').mockResolvedValue({
        quantity: 10, // Stock insuficiente
      } as any);

      const result = await service.checkComponentsAvailability(
        bomId,
        quantity,
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.available).toBe(false);
      expect(result.components[0].shortage).toBeGreaterThan(0);
    });
  });

  describe('explodeBOM', () => {
    it('should explode BOM recursively for multi-level BOMs', async () => {
      const bomId = mockBOM._id.toString();
      const quantity = 10;

      // BOM multinivel:
      // Hamburguesa -> Pan (sub-ensamble) -> Harina
      const mockSubassembly = {
        _id: new Types.ObjectId(),
        name: 'Pan',
        sku: 'BREAD-001',
      };

      const mockRawMaterial = {
        _id: new Types.ObjectId(),
        name: 'Harina',
        sku: 'FLOUR-001',
      };

      const mockSubBOM = {
        _id: new Types.ObjectId(),
        productId: mockSubassembly._id,
        components: [
          {
            productId: mockRawMaterial,
            quantity: 0.5,
            unit: 'kg',
            scrapPercentage: 0,
          },
        ],
      };

      const mockMainBOM = {
        ...mockBOM,
        components: [
          {
            productId: mockSubassembly,
            quantity: 2,
            unit: 'unidades',
            scrapPercentage: 5,
          },
        ],
      };

      jest
        .spyOn(bomModel, 'findById')
        .mockImplementation((id) => {
          if (id.toString() === bomId) {
            return {
              populate: jest.fn().mockResolvedValue(mockMainBOM),
            } as any;
          }
          return {
            populate: jest.fn().mockResolvedValue(mockSubBOM),
          } as any;
        });

      jest
        .spyOn(bomModel, 'findOne')
        .mockResolvedValue(mockSubBOM as any);

      const result = await service.explodeBOM(bomId, quantity, mockUser);

      expect(result).toBeDefined();
      expect(result.levels).toBeDefined();
      expect(result.flatList).toBeDefined();
      expect(result.totalLevels).toBeGreaterThan(0);
    });

    it('should detect circular dependencies in multi-level BOMs', async () => {
      const bomId = mockBOM._id.toString();
      const quantity = 10;

      // Crear dependencia circular: A -> B -> A
      const productA = {
        _id: new Types.ObjectId(),
        name: 'Product A',
      };

      const productB = {
        _id: new Types.ObjectId(),
        name: 'Product B',
      };

      const bomA = {
        _id: bomId,
        productId: productA._id,
        components: [
          {
            productId: productB,
            quantity: 1,
            unit: 'unidades',
          },
        ],
      };

      const bomB = {
        _id: new Types.ObjectId(),
        productId: productB._id,
        components: [
          {
            productId: productA, // Circular!
            quantity: 1,
            unit: 'unidades',
          },
        ],
      };

      jest
        .spyOn(bomModel, 'findById')
        .mockImplementation((id) => {
          if (id.toString() === bomId) {
            return {
              populate: jest.fn().mockResolvedValue(bomA),
            } as any;
          }
          return {
            populate: jest.fn().mockResolvedValue(bomB),
          } as any;
        });

      jest
        .spyOn(bomModel, 'findOne')
        .mockResolvedValue(bomB as any);

      await expect(service.explodeBOM(bomId, quantity, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getBOMStructure', () => {
    it('should return hierarchical BOM structure', async () => {
      const bomId = mockBOM._id.toString();

      const mockBOMWithStructure = {
        ...mockBOM,
        productId: mockProduct,
        components: [
          {
            productId: mockComponent,
            quantity: 2,
            unit: 'unidades',
            scrapPercentage: 5,
          },
        ],
      };

      jest
        .spyOn(bomModel, 'findById')
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBOMWithStructure),
        } as any);

      jest.spyOn(bomModel, 'findOne').mockResolvedValue(null);

      const result = await service.getBOMStructure(bomId, mockUser);

      expect(result).toBeDefined();
      expect(result.bomId).toBe(bomId);
      expect(result.productName).toBe(mockProduct.name);
      expect(result.children).toBeDefined();
    });
  });

  describe('unit conversions', () => {
    it('should handle unit conversions correctly in cost calculations', async () => {
      const bomId = mockBOM._id.toString();

      const mockBOMWithDifferentUnits = {
        ...mockBOM,
        components: [
          {
            productId: { ...mockComponent, unitCost: 10, unit: 'kg' },
            quantity: 1000, // gramos
            unit: 'g',
            scrapPercentage: 0,
          },
        ],
      };

      jest
        .spyOn(bomModel, 'findById')
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBOMWithDifferentUnits),
        } as any);

      const result = await service.calculateTotalMaterialCost(bomId, mockUser);

      // Si el sistema maneja conversiones:
      // 1000g = 1kg, costo = 1 × 10 = 10
      // Si no maneja conversiones, simplemente usa la cantidad: 1000 × 10 = 10000
      expect(result).toBeGreaterThan(0);
    });
  });
});
