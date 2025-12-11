import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RolesService } from './roles.service';
import { Role } from '../../schemas/role.schema';
import { Permission } from '../../schemas/permission.schema';
import { PermissionsService } from '../permissions/permissions.service';
import {
  createMockModel,
  createMockRole,
  createMockPermissionsService,
  generateObjectId,
} from '../../../test/helpers/test-utils';

describe('RolesService', () => {
  let service: RolesService;
  let roleModel: any;
  let permissionModel: any;
  let permissionsService: any;

  const mockTenantId = new Types.ObjectId('507f1f77bcf86cd799439012');

  beforeEach(async () => {
    roleModel = createMockModel();
    permissionModel = createMockModel();
    permissionsService = createMockPermissionsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getModelToken(Role.name),
          useValue: roleModel,
        },
        {
          provide: getModelToken(Permission.name),
          useValue: permissionModel,
        },
        {
          provide: PermissionsService,
          useValue: permissionsService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new role successfully', async () => {
      // Arrange
      const createRoleDto = {
        name: 'cashier',
        description: 'Cashier role',
        permissions: ['orders_read', 'orders_create'],
      };

      const mockSavedRole = {
        _id: generateObjectId(),
        ...createRoleDto,
        tenantId: mockTenantId,
        save: jest.fn().mockResolvedValue({
          _id: generateObjectId(),
          ...createRoleDto,
          tenantId: mockTenantId,
        }),
      };

      // Mock constructor pattern
      const mockRoleConstructor: any = jest.fn().mockImplementation(() => mockSavedRole);
      (service as any).roleModel = mockRoleConstructor;

      // Act
      const result = await service.create(createRoleDto, mockTenantId.toString());

      // Assert
      expect(mockRoleConstructor).toHaveBeenCalledWith({
        ...createRoleDto,
        tenantId: mockTenantId,
      });
      expect(mockSavedRole.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if role name already exists', async () => {
      // Arrange
      const createRoleDto = {
        name: 'admin',
        description: 'Admin role',
        permissions: [],
      };

      const duplicateError: any = new Error('Duplicate key');
      duplicateError.code = 11000;

      const mockSavedRole = {
        save: jest.fn().mockRejectedValue(duplicateError),
      };

      const mockRoleConstructor: any = jest.fn().mockImplementation(() => mockSavedRole);
      (service as any).roleModel = mockRoleConstructor;

      // Act & Assert
      await expect(
        service.create(createRoleDto, mockTenantId.toString())
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create(createRoleDto, mockTenantId.toString())
      ).rejects.toThrow('Ya existe un rol con este nombre.');
    });
  });

  describe('findAll', () => {
    it('should return all roles for a tenant', async () => {
      // Arrange
      const mockRoles = [
        createMockRole({ name: 'admin', tenantId: mockTenantId }),
        createMockRole({ name: 'cashier', tenantId: mockTenantId }),
      ];

      roleModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRoles),
      });

      // Act
      const result = await service.findAll(mockTenantId.toString());

      // Assert
      expect(roleModel.find).toHaveBeenCalledWith({ tenantId: mockTenantId.toString() });
      expect(result).toEqual(mockRoles);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no roles exist', async () => {
      // Arrange
      roleModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.findAll(mockTenantId.toString());

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      // Arrange
      const roleId = generateObjectId();
      const mockRole = createMockRole({ _id: roleId, tenantId: mockTenantId });

      roleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      // Act
      const result = await service.findOne(roleId.toString(), mockTenantId.toString());

      // Assert
      expect(roleModel.findOne).toHaveBeenCalledWith({
        _id: roleId,
        tenantId: mockTenantId,
      });
      expect(result).toEqual(mockRole);
    });

    it('should throw NotFoundException if role not found', async () => {
      // Arrange
      const roleId = generateObjectId();

      roleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(
        service.findOne(roleId.toString(), mockTenantId.toString())
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOne(roleId.toString(), mockTenantId.toString())
      ).rejects.toThrow(`Role with ID "${roleId.toString()}" not found`);
    });
  });

  describe('findOneByName', () => {
    it('should return a role by name', async () => {
      // Arrange
      const mockRole = createMockRole({ name: 'admin', tenantId: mockTenantId });

      roleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      // Act
      const result = await service.findOneByName('admin', mockTenantId.toString());

      // Assert
      expect(roleModel.findOne).toHaveBeenCalledWith({
        name: 'admin',
        tenantId: mockTenantId.toString(),
      });
      expect(result).toEqual(mockRole);
    });

    it('should return null if role not found (for seeder use case)', async () => {
      // Arrange
      roleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act
      const result = await service.findOneByName('nonexistent', mockTenantId.toString());

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a role successfully', async () => {
      // Arrange
      const roleId = generateObjectId();
      const updateRoleDto = {
        name: 'super-admin',
        description: 'Updated description',
      };

      const updatedRole = createMockRole({
        _id: roleId,
        ...updateRoleDto,
        tenantId: mockTenantId,
      });

      roleModel.findOneAndUpdate.mockResolvedValue(updatedRole);

      // Act
      const result = await service.update(
        roleId.toString(),
        updateRoleDto,
        mockTenantId.toString()
      );

      // Assert
      expect(roleModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: roleId, tenantId: mockTenantId },
        updateRoleDto,
        { new: true }
      );
      expect(result).toEqual(updatedRole);
      expect(result.name).toBe('super-admin');
    });

    it('should throw NotFoundException if role to update not found', async () => {
      // Arrange
      const roleId = generateObjectId();
      const updateRoleDto = { name: 'new-name' };

      roleModel.findOneAndUpdate.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(roleId.toString(), updateRoleDto, mockTenantId.toString())
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(roleId.toString(), updateRoleDto, mockTenantId.toString())
      ).rejects.toThrow(`Role with ID "${roleId.toString()}" not found`);
    });
  });

  describe('remove', () => {
    it('should delete a role successfully', async () => {
      // Arrange
      const roleId = generateObjectId();
      const mockRole = createMockRole({ _id: roleId, tenantId: mockTenantId });

      roleModel.findOne.mockResolvedValue(mockRole);
      roleModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      // Act
      const result = await service.remove(roleId.toString(), mockTenantId.toString());

      // Assert
      expect(roleModel.findOne).toHaveBeenCalledWith({
        _id: roleId.toString(),
        tenantId: mockTenantId.toString(),
      });
      expect(roleModel.deleteOne).toHaveBeenCalledWith({
        _id: roleId.toString(),
        tenantId: mockTenantId.toString(),
      });
      expect(result.deletedCount).toBe(1);
    });

    it('should throw NotFoundException if role to delete not found', async () => {
      // Arrange
      const roleId = generateObjectId();

      roleModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.remove(roleId.toString(), mockTenantId.toString())
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.remove(roleId.toString(), mockTenantId.toString())
      ).rejects.toThrow(
        `Role with ID "${roleId.toString()}" not found or you don't have permission to delete it`
      );
    });

    it('should throw NotFoundException if deleteOne returns 0 deletedCount', async () => {
      // Arrange
      const roleId = generateObjectId();
      const mockRole = createMockRole({ _id: roleId, tenantId: mockTenantId });

      roleModel.findOne.mockResolvedValue(mockRole);
      roleModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      // Act & Assert
      await expect(
        service.remove(roleId.toString(), mockTenantId.toString())
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOrCreateAdminRoleForTenant', () => {
    it('should return existing admin role if found', async () => {
      // Arrange
      const existingAdminRole = createMockRole({
        name: 'admin',
        tenantId: mockTenantId,
        isDefault: true,
      });

      roleModel.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(existingAdminRole),
      });

      // Act
      const result = await service.findOrCreateAdminRoleForTenant(
        mockTenantId,
        ['orders', 'inventory']
      );

      // Assert
      expect(roleModel.findOne).toHaveBeenCalledWith({
        name: 'admin',
        tenantId: mockTenantId,
      });
      expect(result).toEqual(existingAdminRole);
    });

    it('should create new admin role with permissions if not found', async () => {
      // Arrange
      permissionsService.findByModules.mockReturnValue([
        'orders_read',
        'orders_create',
        'inventory_read',
      ]);

      const mockPermissions = [
        { _id: generateObjectId(), name: 'orders_read' },
        { _id: generateObjectId(), name: 'orders_create' },
        { _id: generateObjectId(), name: 'inventory_read' },
      ];

      roleModel.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null), // Admin role doesn't exist
      });

      permissionModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPermissions),
      });

      const newAdminRole = {
        _id: generateObjectId(),
        name: 'admin',
        tenantId: mockTenantId,
        permissions: mockPermissions.map((p) => p._id),
        isDefault: true,
        save: jest.fn().mockResolvedValue({
          _id: generateObjectId(),
          name: 'admin',
          tenantId: mockTenantId,
          permissions: mockPermissions.map((p) => p._id),
          isDefault: true,
        }),
      };

      const mockRoleConstructor: any = jest.fn().mockImplementation(() => newAdminRole);
      (service as any).roleModel = Object.assign(mockRoleConstructor, roleModel);

      // Act
      const result = await service.findOrCreateAdminRoleForTenant(
        mockTenantId,
        ['orders', 'inventory']
      );

      // Assert
      expect(permissionsService.findByModules).toHaveBeenCalledWith(['orders', 'inventory']);
      expect(permissionModel.find).toHaveBeenCalled();
      expect(newAdminRole.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create missing permissions and admin role', async () => {
      // Arrange
      permissionsService.findByModules.mockReturnValue([
        'orders_read',
        'orders_create',
        'inventory_read',
      ]);

      // Simulate only 1 permission exists, 2 are missing
      const existingPermission = { _id: generateObjectId(), name: 'orders_read' };

      roleModel.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      permissionModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([existingPermission]),
      });

      const insertedPermissions = [
        { _id: generateObjectId(), name: 'orders_create' },
        { _id: generateObjectId(), name: 'inventory_read' },
      ];

      permissionModel.insertMany.mockResolvedValue(insertedPermissions);

      const newAdminRole = {
        _id: generateObjectId(),
        name: 'admin',
        tenantId: mockTenantId,
        permissions: [existingPermission._id, ...insertedPermissions.map((p) => p._id)],
        isDefault: true,
        save: jest.fn().mockResolvedValue({
          _id: generateObjectId(),
          name: 'admin',
          tenantId: mockTenantId,
          permissions: [existingPermission._id, ...insertedPermissions.map((p) => p._id)],
          isDefault: true,
        }),
      };

      const mockRoleConstructor: any = jest.fn().mockImplementation(() => newAdminRole);
      (service as any).roleModel = Object.assign(mockRoleConstructor, roleModel);

      // Act
      const result = await service.findOrCreateAdminRoleForTenant(
        mockTenantId,
        ['orders', 'inventory']
      );

      // Assert
      expect(permissionModel.insertMany).toHaveBeenCalled();
      const insertCall = permissionModel.insertMany.mock.calls[0][0];
      expect(insertCall).toHaveLength(2);
      expect(insertCall[0].name).toBe('orders_create');
      expect(insertCall[1].name).toBe('inventory_read');
      expect(newAdminRole.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
