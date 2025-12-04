import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MembershipsService } from './memberships.service';
import { UserTenantMembership } from '../../schemas/user-tenant-membership.schema';
import { Tenant } from '../../schemas/tenant.schema';
import { Role } from '../../schemas/role.schema';
import {
  createMockModel,
  createMockMembership,
  createMockTenant,
  createMockRole,
  generateObjectId,
} from '../../../test/helpers/test-utils';

describe('MembershipsService', () => {
  let service: MembershipsService;
  let membershipModel: any;
  let tenantModel: any;
  let roleModel: any;

  const mockUserId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const mockTenantId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockRoleId = new Types.ObjectId('507f1f77bcf86cd799439013');

  beforeEach(async () => {
    membershipModel = createMockModel();
    tenantModel = createMockModel([createMockTenant()]);
    roleModel = createMockModel([createMockRole()]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        {
          provide: getModelToken(UserTenantMembership.name),
          useValue: membershipModel,
        },
        {
          provide: getModelToken(Tenant.name),
          useValue: tenantModel,
        },
        {
          provide: getModelToken(Role.name),
          useValue: roleModel,
        },
      ],
    }).compile();

    service = module.get<MembershipsService>(MembershipsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findActiveMembershipsForUser', () => {
    it('should return active memberships for a user', async () => {
      // Arrange
      const mockMembership = createMockMembership({
        userId: mockUserId,
        tenantId: mockTenantId,
        roleId: mockRoleId,
        status: 'active',
      });

      const mockTenant = createMockTenant({ _id: mockTenantId });
      const mockRole = createMockRole({ _id: mockRoleId });

      membershipModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          {
            ...mockMembership,
            tenantId: mockTenant,
            roleId: mockRole,
          },
        ]),
      });

      // Act
      const result = await service.findActiveMembershipsForUser(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
      expect(result[0].tenant.id).toBe(mockTenantId.toString());
      expect(result[0].role.id).toBe(mockRoleId.toString());

      expect(membershipModel.find).toHaveBeenCalledWith({
        userId: mockUserId,
        status: 'active',
      });
    });

    it('should return empty array if user has no active memberships', async () => {
      // Arrange
      membershipModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.findActiveMembershipsForUser(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });

    it('should sort memberships by isDefault and createdAt', async () => {
      // Arrange
      const memberships = [
        createMockMembership({ isDefault: false, createdAt: new Date('2025-01-02') }),
        createMockMembership({ isDefault: true, createdAt: new Date('2025-01-01') }),
      ];

      membershipModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(memberships),
      });

      // Act
      await service.findActiveMembershipsForUser(mockUserId);

      // Assert
      const sortMock = membershipModel.find().sort;
      expect(sortMock).toHaveBeenCalledWith({ isDefault: -1, createdAt: 1 });
    });

    it('should handle string userId and convert to ObjectId', async () => {
      // Arrange
      const userIdString = mockUserId.toString();

      membershipModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      // Act
      await service.findActiveMembershipsForUser(userIdString);

      // Assert
      expect(membershipModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        status: 'active',
      });
    });
  });

  describe('getMembershipForUserOrFail', () => {
    it('should return membership if found', async () => {
      // Arrange
      const membershipId = generateObjectId();
      const mockMembership = createMockMembership({
        _id: membershipId,
        userId: mockUserId,
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMembership),
      });

      // Act
      const result = await service.getMembershipForUserOrFail(
        membershipId.toString(),
        mockUserId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result._id).toEqual(membershipId);
      expect(membershipModel.findOne).toHaveBeenCalledWith({
        _id: membershipId,
        userId: mockUserId,
      });
    });

    it('should throw NotFoundException if membership not found', async () => {
      // Arrange
      const membershipId = generateObjectId();

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(
        service.getMembershipForUserOrFail(membershipId.toString(), mockUserId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.getMembershipForUserOrFail(membershipId.toString(), mockUserId),
      ).rejects.toThrow('Membresía no encontrada para el usuario');
    });

    it('should validate ownership - throw if membership belongs to different user', async () => {
      // Arrange
      const membershipId = generateObjectId();
      const differentUserId = generateObjectId();

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // No encuentra porque filtra por userId
      });

      // Act & Assert
      await expect(
        service.getMembershipForUserOrFail(membershipId.toString(), differentUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setDefaultMembership', () => {
    it('should set a membership as default and unset others', async () => {
      // Arrange
      const membershipId = generateObjectId();

      membershipModel.updateMany.mockResolvedValue({ modifiedCount: 2 });
      membershipModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await service.setDefaultMembership(mockUserId, membershipId);

      // Assert
      // Primero debe poner todas las memberships en isDefault: false
      expect(membershipModel.updateMany).toHaveBeenCalledWith(
        { userId: mockUserId },
        { $set: { isDefault: false } },
      );

      // Luego debe poner la seleccionada en isDefault: true
      expect(membershipModel.updateOne).toHaveBeenCalledWith(
        { _id: membershipId, userId: mockUserId },
        { $set: { isDefault: true } },
      );
    });

    it('should handle string IDs', async () => {
      // Arrange
      const membershipIdString = generateObjectId().toString();
      const userIdString = mockUserId.toString();

      membershipModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
      membershipModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await service.setDefaultMembership(userIdString, membershipIdString);

      // Assert
      expect(membershipModel.updateMany).toHaveBeenCalled();
      expect(membershipModel.updateOne).toHaveBeenCalled();
    });
  });

  describe('resolveTenantById', () => {
    it('should return tenant if found', async () => {
      // Arrange
      const mockTenant = createMockTenant();

      tenantModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTenant),
      });

      // Act
      const result = await service.resolveTenantById(mockTenantId);

      // Assert
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result!._id).toEqual(mockTenant._id);
      expect(tenantModel.findById).toHaveBeenCalledWith(mockTenantId);
    });

    it('should return null if tenant not found', async () => {
      // Arrange
      tenantModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act
      const result = await service.resolveTenantById(generateObjectId());

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('resolveRoleById', () => {
    it('should return role with populated permissions', async () => {
      // Arrange
      const mockRole = createMockRole({
        permissions: [
          { _id: generateObjectId(), name: 'orders_read' },
          { _id: generateObjectId(), name: 'orders_create' },
        ],
      });

      roleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      // Act
      const result = await service.resolveRoleById(mockRoleId);

      // Assert
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result!._id).toEqual(mockRole._id);
      expect(result!.permissions).toHaveLength(2);

      const populateCall = roleModel.findById().populate;
      expect(populateCall).toHaveBeenCalledWith({
        path: 'permissions',
        select: 'name',
      });
    });

    it('should return null if role not found', async () => {
      // Arrange
      roleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act
      const result = await service.resolveRoleById(generateObjectId());

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createDefaultMembershipIfMissing', () => {
    it('should return existing membership if already exists', async () => {
      // Arrange
      const existingMembership = createMockMembership({
        userId: mockUserId,
        tenantId: mockTenantId,
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingMembership),
      });

      const mockTenant = createMockTenant({ _id: mockTenantId });
      const mockRole = createMockRole({ _id: mockRoleId });

      tenantModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTenant),
      });

      roleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      // Act
      const result = await service.createDefaultMembershipIfMissing(
        mockUserId,
        mockTenantId,
        mockRoleId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(membershipModel.create).not.toHaveBeenCalled();
    });

    it('should create new membership if not exists', async () => {
      // Arrange
      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // No existe
      });

      const newMembership = createMockMembership({
        userId: mockUserId,
        tenantId: mockTenantId,
        roleId: mockRoleId,
        status: 'active',
        isDefault: true,
      });

      membershipModel.create.mockResolvedValue(newMembership);

      const mockTenant = createMockTenant({ _id: mockTenantId });
      const mockRole = createMockRole({ _id: mockRoleId });

      tenantModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTenant),
      });

      roleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      // Act
      const result = await service.createDefaultMembershipIfMissing(
        mockUserId,
        mockTenantId,
        mockRoleId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(membershipModel.create).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantId: mockTenantId,
        roleId: mockRoleId,
        status: 'active',
        isDefault: true,
      });
    });
  });

  describe('buildMembershipSummary', () => {
    it('should build summary with populated tenant and role', async () => {
      // Arrange
      const mockTenant = createMockTenant({ _id: mockTenantId });
      const mockRole = createMockRole({
        _id: mockRoleId,
        permissions: [
          { name: 'orders_read' },
          { name: 'orders_create' },
        ],
      });

      const membership = createMockMembership({
        tenantId: mockTenant as any,
        roleId: mockRole as any,
        permissionsCache: ['orders_read', 'orders_create'],
      });

      // Act
      const result = await service.buildMembershipSummary(membership as any);

      // Assert
      expect(result).toBeDefined();
      expect(result.tenant.id).toBe(mockTenantId.toString());
      expect(result.tenant.name).toBe(mockTenant.name);
      expect(result.role.id).toBe(mockRoleId.toString());
      expect(result.role.name).toBe(mockRole.name);
      expect(result.permissions).toEqual(['orders_read', 'orders_create']);
    });

    it('should resolve tenant and role if not populated', async () => {
      // Arrange
      const membership = createMockMembership({
        tenantId: mockTenantId as any, // Solo ID
        roleId: mockRoleId as any, // Solo ID
        permissionsCache: [],
      });

      const mockTenant = createMockTenant({ _id: mockTenantId });
      const mockRole = createMockRole({
        _id: mockRoleId,
        permissions: [
          { name: 'inventory_read' },
          { name: 'inventory_update' },
        ],
      });

      tenantModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTenant),
      });

      roleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      // Act
      const result = await service.buildMembershipSummary(membership as any);

      // Assert
      expect(result).toBeDefined();
      expect(result.tenant.id).toBe(mockTenantId.toString());
      expect(result.role.id).toBe(mockRoleId.toString());

      // Verificar que se llamaron los resolvers
      expect(tenantModel.findById).toHaveBeenCalledWith(mockTenantId);
      expect(roleModel.findById).toHaveBeenCalledWith(mockRoleId);
    });

    it('should use permissionsCache if available', async () => {
      // Arrange
      const mockTenant = createMockTenant({ _id: mockTenantId });
      const mockRole = createMockRole({ _id: mockRoleId });

      const cachedPermissions = ['orders_read', 'orders_update', 'inventory_read'];

      const membership = createMockMembership({
        tenantId: mockTenant as any,
        roleId: mockRole as any,
        permissionsCache: cachedPermissions,
      });

      // Act
      const result = await service.buildMembershipSummary(membership as any);

      // Assert
      expect(result.permissions).toEqual(cachedPermissions);

      // No debe llamar resolveRolePermissions si hay cache
      expect(roleModel.findById).not.toHaveBeenCalled();
    });

    it('should handle missing tenant gracefully', async () => {
      // Arrange
      const mockRole = createMockRole({ _id: mockRoleId });

      const membership = createMockMembership({
        tenantId: mockTenantId as any,
        roleId: mockRole as any,
      });

      tenantModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // Tenant no encontrado
      });

      // Act
      const result = await service.buildMembershipSummary(membership as any);

      // Assert
      expect(result.tenant.id).toBe('');
      expect(result.tenant.name).toBe('');
      expect(result.tenant.status).toBe('inactive');
    });

    it('should handle missing role gracefully', async () => {
      // Arrange
      const mockTenant = createMockTenant({ _id: mockTenantId });

      const membership = createMockMembership({
        tenantId: mockTenant as any,
        roleId: mockRoleId as any,
        permissionsCache: [], // No cached permissions when role is missing
      });

      roleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null), // Rol no encontrado
      });

      // Act
      const result = await service.buildMembershipSummary(membership as any);

      // Assert
      expect(result.role.id).toBe('');
      expect(result.role.name).toBe('unknown');
      expect(result.permissions).toEqual([]);
    });
  });
});
