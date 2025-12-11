import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { Tenant } from '../../schemas/tenant.schema';
import { User } from '../../schemas/user.schema';
import { UserTenantMembership } from '../../schemas/user-tenant-membership.schema';
import { RolesService } from '../roles/roles.service';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import { SeedingService } from '../seeding/seeding.service';
import { TokenService } from '../../auth/token.service';
import { MailService } from '../mail/mail.service';
import { MembershipsService } from '../memberships/memberships.service';
import {
  createMockModel,
  createMockTenant,
  createMockUser,
  createMockRole,
  createMockMembership,
  generateObjectId,
} from '../../../test/helpers/test-utils';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

describe('OnboardingService', () => {
  let service: OnboardingService;
  let tenantModel: any;
  let userModel: any;
  let membershipModel: any;
  let rolesService: any;
  let subscriptionPlansService: any;
  let seedingService: any;
  let tokenService: any;
  let mailService: any;
  let membershipsService: any;
  let connection: any;

  beforeEach(async () => {
    tenantModel = createMockModel();
    userModel = createMockModel();
    membershipModel = createMockModel();

    rolesService = {
      findOrCreateAdminRoleForTenant: jest.fn(),
    };

    subscriptionPlansService = {
      findOneByName: jest.fn(),
    };

    seedingService = {
      seedChartOfAccounts: jest.fn().mockResolvedValue(undefined),
    };

    tokenService = {
      generateTokens: jest.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: '15m',
      }),
    };

    mailService = {
      sendTenantWelcomeEmail: jest.fn().mockResolvedValue(true),
    };

    membershipsService = {
      buildMembershipSummary: jest.fn().mockResolvedValue({
        id: generateObjectId().toString(),
        status: 'active',
        isDefault: true,
      }),
    };

    // Mock de sesión de MongoDB
    const mockSession = {
      withTransaction: jest.fn().mockImplementation(async (callback) => {
        await callback();
      }),
      endSession: jest.fn().mockResolvedValue(undefined),
    };

    connection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: getModelToken(Tenant.name),
          useValue: tenantModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: getModelToken(UserTenantMembership.name),
          useValue: membershipModel,
        },
        {
          provide: RolesService,
          useValue: rolesService,
        },
        {
          provide: SubscriptionPlansService,
          useValue: subscriptionPlansService,
        },
        {
          provide: SeedingService,
          useValue: seedingService,
        },
        {
          provide: TokenService,
          useValue: tokenService,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
        {
          provide: MembershipsService,
          useValue: membershipsService,
        },
        {
          provide: getConnectionToken(),
          useValue: connection,
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTenantAndAdmin', () => {
    it('should create tenant and admin user successfully', async () => {
      // Arrange
      const dto = {
        businessName: 'Test Restaurant',
        businessType: 'restaurant',
        email: 'admin@testrestaurant.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        subscriptionPlan: 'Premium',
        vertical: 'FOOD_SERVICE',
        numberOfUsers: 10,
      };

      const mockPlan = {
        name: 'Premium',
        limits: {
          maxUsers: 50,
          maxOrders: 10000,
          maxProducts: 5000,
          maxStorage: 1000000000,
        },
      };

      const mockRole = createMockRole({ name: 'admin' });
      const savedTenant = createMockTenant({
        name: dto.businessName,
        isConfirmed: false,
        confirmationCode: '123456',
      });
      const savedUser = createMockUser({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: mockRole,
      });
      const savedMembership = createMockMembership();

      // Mock existing user check
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      subscriptionPlansService.findOneByName.mockResolvedValue(mockPlan);
      rolesService.findOrCreateAdminRoleForTenant.mockResolvedValue(mockRole);
      bcryptMock.hash.mockResolvedValue('hashed-password' as never);

      // Mock tenant creation
      const mockTenantSave = jest.fn().mockResolvedValue(savedTenant);
      const mockTenantConstructor: any = jest.fn().mockImplementation(() => ({
        ...savedTenant,
        save: mockTenantSave,
      }));
      (service as any).tenantModel = mockTenantConstructor;

      // Mock user creation
      const userWithRole = { ...savedUser, role: mockRole };
      const mockUserSave = jest.fn().mockResolvedValue(savedUser);
      const mockUserConstructor: any = jest.fn().mockImplementation(() => ({
        ...savedUser,
        save: mockUserSave,
      }));
      mockUserConstructor.findOne = userModel.findOne;
      mockUserConstructor.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(userWithRole),
        }),
      });
      (service as any).userModel = mockUserConstructor;

      // Mock membership creation
      const mockMembershipSave = jest.fn().mockResolvedValue(savedMembership);
      const mockMembershipConstructor: any = jest.fn().mockImplementation(() => ({
        ...savedMembership,
        save: mockMembershipSave,
      }));
      (service as any).userTenantMembershipModel = mockMembershipConstructor;

      // Act
      const result = await service.createTenantAndAdmin(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(dto.email);
      expect(result.tenant).toBeDefined();
      expect(result.tenant.name).toBe(dto.businessName);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockTenantSave).toHaveBeenCalled();
      expect(mockUserSave).toHaveBeenCalled();
      expect(mockMembershipSave).toHaveBeenCalled();
      expect(seedingService.seedChartOfAccounts).toHaveBeenCalled();
      expect(mailService.sendTenantWelcomeEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      const dto = {
        businessName: 'Test Restaurant',
        businessType: 'restaurant',
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        subscriptionPlan: 'Trial',
        numberOfUsers: 5,
      };

      const existingUser = createMockUser({ email: dto.email });

      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingUser),
      });

      // Act & Assert
      await expect(service.createTenantAndAdmin(dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createTenantAndAdmin(dto)).rejects.toThrow(
        'El email ya está registrado.',
      );
    });

    it('should use Trial plan if requested plan is not found', async () => {
      // Arrange
      const dto = {
        businessName: 'Test Restaurant',
        businessType: 'restaurant',
        email: 'admin@testrestaurant.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        subscriptionPlan: 'NonExistentPlan',
        numberOfUsers: 10,
      };

      const trialPlan = {
        name: 'Trial',
        limits: {
          maxUsers: 5,
          maxOrders: 100,
          maxProducts: 50,
          maxStorage: 100000000,
        },
      };

      const mockRole = createMockRole();
      const savedTenant = createMockTenant();
      const savedUser = createMockUser();
      const savedMembership = createMockMembership();

      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // First call fails, second call returns Trial
      subscriptionPlansService.findOneByName
        .mockRejectedValueOnce(new NotFoundException('Plan not found'))
        .mockResolvedValueOnce(trialPlan);

      rolesService.findOrCreateAdminRoleForTenant.mockResolvedValue(mockRole);
      bcryptMock.hash.mockResolvedValue('hashed-password' as never);

      // Mock tenant creation
      const mockTenantSave = jest.fn().mockResolvedValue(savedTenant);
      const mockTenantConstructor: any = jest.fn().mockImplementation(() => ({
        ...savedTenant,
        save: mockTenantSave,
      }));
      (service as any).tenantModel = mockTenantConstructor;

      // Mock user creation
      const userWithRole = { ...savedUser, role: mockRole };
      const mockUserSave = jest.fn().mockResolvedValue(savedUser);
      const mockUserConstructor: any = jest.fn().mockImplementation(() => ({
        ...savedUser,
        save: mockUserSave,
      }));
      mockUserConstructor.findOne = userModel.findOne;
      mockUserConstructor.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(userWithRole),
        }),
      });
      (service as any).userModel = mockUserConstructor;

      // Mock membership creation
      const mockMembershipSave = jest.fn().mockResolvedValue(savedMembership);
      const mockMembershipConstructor: any = jest.fn().mockImplementation(() => ({
        ...savedMembership,
        save: mockMembershipSave,
      }));
      (service as any).userTenantMembershipModel = mockMembershipConstructor;

      // Act
      const result = await service.createTenantAndAdmin(dto);

      // Assert
      expect(result).toBeDefined();
      expect(subscriptionPlansService.findOneByName).toHaveBeenCalledTimes(2);
      expect(subscriptionPlansService.findOneByName).toHaveBeenNthCalledWith(
        1,
        'NonExistentPlan',
      );
      expect(subscriptionPlansService.findOneByName).toHaveBeenNthCalledWith(
        2,
        'Trial',
      );
    });
  });

  describe('confirmTenant', () => {
    it('should confirm tenant successfully with valid code', async () => {
      // Arrange
      const dto = {
        tenantId: generateObjectId().toString(),
        email: 'admin@example.com',
        confirmationCode: '123456',
      };

      const mockRole = createMockRole();
      const mockTenant = createMockTenant({
        isConfirmed: false,
        confirmationCode: '123456',
        confirmationCodeExpiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      });

      const mockUser = createMockUser({
        email: dto.email,
        tenantId: mockTenant._id,
        role: mockRole,
      });

      tenantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockTenant,
          save: jest.fn().mockResolvedValue(mockTenant),
        }),
      });

      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockUser,
            save: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      // Act
      const result = await service.confirmTenant(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Cuenta confirmada exitosamente.');
      // Type assertion for successful confirmation case
      if ('user' in result) {
        expect(result.user).toBeDefined();
        expect(result.accessToken).toBeDefined();
      }
      expect(result.tenant).toBeDefined();
    });

    it('should return success if tenant is already confirmed', async () => {
      // Arrange
      const dto = {
        tenantId: generateObjectId().toString(),
        email: 'admin@example.com',
        confirmationCode: '123456',
      };

      const mockTenant = createMockTenant({
        isConfirmed: true,
      });

      tenantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTenant),
      });

      // Act
      const result = await service.confirmTenant(dto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('La cuenta ya estaba confirmada.');
    });

    it('should throw BadRequestException if confirmation code is invalid', async () => {
      // Arrange
      const dto = {
        tenantId: generateObjectId().toString(),
        email: 'admin@example.com',
        confirmationCode: 'wrong-code',
      };

      const mockTenant = createMockTenant({
        isConfirmed: false,
        confirmationCode: '123456',
        confirmationCodeExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      tenantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTenant),
      });

      // Act & Assert
      await expect(service.confirmTenant(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.confirmTenant(dto)).rejects.toThrow(
        'Código de confirmación inválido.',
      );
    });

    it('should throw BadRequestException if confirmation code is expired', async () => {
      // Arrange
      const dto = {
        tenantId: generateObjectId().toString(),
        email: 'admin@example.com',
        confirmationCode: '123456',
      };

      const mockTenant = createMockTenant({
        isConfirmed: false,
        confirmationCode: '123456',
        confirmationCodeExpiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (expired)
      });

      tenantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTenant),
      });

      // Act & Assert
      await expect(service.confirmTenant(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.confirmTenant(dto)).rejects.toThrow(
        'El código de confirmación ha expirado. Solicita uno nuevo.',
      );
    });

    it('should throw NotFoundException if tenant not found', async () => {
      // Arrange
      const dto = {
        tenantId: generateObjectId().toString(),
        email: 'admin@example.com',
        confirmationCode: '123456',
      };

      tenantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(service.confirmTenant(dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.confirmTenant(dto)).rejects.toThrow(
        'Tenant no encontrado.',
      );
    });

    it('should throw BadRequestException if neither tenantId nor tenantCode provided', async () => {
      // Arrange
      const dto = {
        email: 'admin@example.com',
        confirmationCode: '123456',
      } as any;

      // Act & Assert
      await expect(service.confirmTenant(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.confirmTenant(dto)).rejects.toThrow(
        'Debe proporcionar el identificador del tenant (tenantId o tenantCode).',
      );
    });

    it('should throw NotFoundException if user not found for tenant', async () => {
      // Arrange
      const dto = {
        tenantId: generateObjectId().toString(),
        email: 'nonexistent@example.com',
        confirmationCode: '123456',
      };

      const mockTenant = createMockTenant({
        isConfirmed: false,
        confirmationCode: '123456',
        confirmationCodeExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      tenantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTenant),
      });

      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      // Act & Assert
      await expect(service.confirmTenant(dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.confirmTenant(dto)).rejects.toThrow(
        'Usuario no encontrado para este tenant.',
      );
    });
  });
});
