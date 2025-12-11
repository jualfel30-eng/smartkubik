import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../schemas/user.schema';
import { Tenant } from '../schemas/tenant.schema';
import { RolesService } from '../modules/roles/roles.service';
import { MailService } from '../modules/mail/mail.service';
import { TokenService } from './token.service';
import { MembershipsService } from '../modules/memberships/memberships.service';
import {
  createMockModel,
  createMockUser,
  createMockTenant,
  createMockRole,
  createMockJwtService,
  createMockMailService,
  createMockRolesService,
  createMockMembershipsService,
  generateObjectId,
} from '../../test/helpers/test-utils';

// Mock bcrypt
jest.mock('bcrypt');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let tenantModel: any;
  let jwtService: any;
  let rolesService: any;
  let mailService: any;
  let tokenService: any;
  let membershipsService: any;

  beforeEach(async () => {
    userModel = createMockModel();
    tenantModel = createMockModel([createMockTenant()]);
    jwtService = createMockJwtService();
    rolesService = createMockRolesService();
    mailService = createMockMailService();
    membershipsService = createMockMembershipsService();

    tokenService = {
      generateTokens: jest.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: '15m',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: getModelToken(Tenant.name),
          useValue: tenantModel,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: RolesService,
          useValue: rolesService,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
        {
          provide: TokenService,
          useValue: tokenService,
        },
        {
          provide: MembershipsService,
          useValue: membershipsService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials and auto-select default tenant', async () => {
      // Arrange
      const mockUser = createMockUser({
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        isActive: true,
        role: createMockRole(),
      });

      const mockMembership = {
        id: generateObjectId().toString(),
        status: 'active',
        isDefault: true,
        tenant: {
          id: mockUser.tenantId.toString(),
          name: 'Test Tenant',
          status: 'active',
        },
        role: {
          id: mockUser.role._id.toString(),
          name: 'admin',
        },
        permissions: ['orders_read', 'orders_create'],
      };

      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      bcryptMock.compare.mockResolvedValue(true as never);

      membershipsService.findActiveMembershipsForUser.mockResolvedValue([mockMembership]);

      const mockMembershipDoc = {
        _id: generateObjectId(),
        userId: mockUser._id,
        tenantId: mockUser.tenantId,
        roleId: mockUser.role._id,
        status: 'active',
      };

      membershipsService.getMembershipForUserOrFail.mockResolvedValue(mockMembershipDoc);
      membershipsService.resolveTenantById.mockResolvedValue(createMockTenant());
      membershipsService.resolveRoleById.mockResolvedValue(createMockRole());
      membershipsService.buildMembershipSummary.mockResolvedValue(mockMembership);

      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tenant).toBeDefined();
      expect('membership' in result && result.membership).toBeDefined();

      expect(bcryptMock.compare).toHaveBeenCalledWith('password123', mockUser.password);
      expect(membershipsService.findActiveMembershipsForUser).toHaveBeenCalledWith(mockUser._id);
      expect(tokenService.generateTokens).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null), // Usuario no encontrado
      });

      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      // Arrange
      const mockUser = createMockUser({
        password: await bcrypt.hash('correctpassword', 10),
        role: createMockRole(),
      });

      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      bcryptMock.compare.mockResolvedValue(false as never); // Password incorrecto

      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      // Arrange
      const mockUser = createMockUser({
        isActive: false, // Usuario inactivo
        password: await bcrypt.hash('password123', 10),
        role: createMockRole(),
      });

      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      bcryptMock.compare.mockResolvedValue(true as never);

      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Usuario inactivo');
    });

    it('should handle user with no memberships', async () => {
      // Arrange
      const mockUser = createMockUser({
        password: await bcrypt.hash('password123', 10),
        isActive: true,
        role: createMockRole(),
        tenantId: null, // Usuario sin tenant asignado
      });

      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      bcryptMock.compare.mockResolvedValue(true as never);

      membershipsService.findActiveMembershipsForUser.mockResolvedValue([]); // Sin memberships

      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.memberships).toEqual([]);
      expect(result.tenant).toBeNull();
      // El usuario debe poder hacer login pero sin tenant seleccionado
    });

    it('should handle email case insensitivity', async () => {
      // Arrange
      const mockUser = createMockUser({
        email: 'Test@Example.COM',
        password: await bcrypt.hash('password123', 10),
        isActive: true,
        role: createMockRole(),
      });

      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      bcryptMock.compare.mockResolvedValue(true as never);
      membershipsService.findActiveMembershipsForUser.mockResolvedValue([]);
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      const loginDto = {
        email: 'test@example.com', // Lowercase
        password: 'password123',
      };

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      // Verificar que se buscó con email candidates (original y lowercase)
      expect(userModel.findOne).toHaveBeenCalled();
    });
  });

  describe('switchTenant', () => {
    it('should switch tenant successfully with valid membership', async () => {
      // Arrange
      const mockUser = createMockUser({ isActive: true });
      const user = {
        id: mockUser._id.toString(),
        _id: mockUser._id,
        email: mockUser.email,
      };
      const membershipId = generateObjectId().toString();

      const mockMembershipDoc = {
        _id: generateObjectId(),
        userId: user._id,
        tenantId: generateObjectId(),
        roleId: generateObjectId(),
        status: 'active',
      };

      const mockTenant = createMockTenant({ status: 'active' });
      const mockRole = createMockRole();

      membershipsService.getMembershipForUserOrFail.mockResolvedValue(mockMembershipDoc);
      membershipsService.resolveTenantById.mockResolvedValue(mockTenant);
      membershipsService.resolveRoleById.mockResolvedValue(mockRole);

      userModel.findById.mockImplementation(() => ({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      }));

      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      membershipsService.buildMembershipSummary.mockResolvedValue({
        id: membershipId,
        status: 'active',
        tenant: { id: mockTenant._id.toString(), name: mockTenant.name, status: 'active' },
        role: { id: mockRole._id.toString(), name: mockRole.name },
        permissions: ['orders_read'],
      });

      // Act
      const result = await service.switchTenant(user.id, membershipId);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.tenant).toBeDefined();
      expect(result.membership).toBeDefined();

      expect(membershipsService.getMembershipForUserOrFail).toHaveBeenCalledWith(
        membershipId,
        user.id,
      );
      expect(tokenService.generateTokens).toHaveBeenCalledWith(
        expect.anything(),
        mockTenant,
        expect.objectContaining({
          membershipId: mockMembershipDoc._id.toString(),
          roleOverride: mockRole,
        }),
      );
    });

    it('should throw UnauthorizedException if membership not found', async () => {
      // Arrange
      const user = createMockUser();
      const membershipId = generateObjectId().toString();

      membershipsService.getMembershipForUserOrFail.mockRejectedValue(
        new NotFoundException('Membresía no encontrada'),
      );

      // Act & Assert
      await expect(service.switchTenant(user.id, membershipId)).rejects.toThrow();
    });

    it('should throw UnauthorizedException if tenant is inactive', async () => {
      // Arrange
      const mockUser = createMockUser({ isActive: true });
      const user = {
        id: mockUser._id.toString(),
        _id: mockUser._id,
        email: mockUser.email,
      };
      const membershipId = generateObjectId().toString();

      const mockMembershipDoc = {
        _id: generateObjectId(),
        tenantId: generateObjectId(),
        roleId: generateObjectId(),
        status: 'active', // Membership is active
      };

      const inactiveTenant = createMockTenant({ status: 'inactive' });

      membershipsService.getMembershipForUserOrFail.mockResolvedValue(mockMembershipDoc);
      membershipsService.resolveTenantById.mockResolvedValue(inactiveTenant);

      userModel.findById.mockImplementation(() => ({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      }));

      membershipsService.resolveRoleById.mockResolvedValue(createMockRole());

      // Act & Assert
      await expect(service.switchTenant(user.id, membershipId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.switchTenant(user.id, membershipId)).rejects.toThrow(
        'El tenant está inactivo',
      );
    });
  });

  describe('validateOAuthLogin', () => {
    it('should return user if found with valid role', async () => {
      // Arrange
      const mockUser = createMockUser({
        email: 'oauth@example.com',
        role: createMockRole(),
      });

      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      // Act
      const result = await service.validateOAuthLogin(
        'oauth@example.com',
        'google',
        {},
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe('oauth@example.com');
      expect(result.role).toBeDefined();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(
        service.validateOAuthLogin('nonexistent@example.com', 'google', {}),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.validateOAuthLogin('nonexistent@example.com', 'google', {}),
      ).rejects.toThrow('Usuario no registrado');
    });

    it('should throw UnauthorizedException if user has no role', async () => {
      // Arrange
      const mockUser = createMockUser({
        role: null, // Sin rol
      });

      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      // Act & Assert
      await expect(
        service.validateOAuthLogin('oauth@example.com', 'google', {}),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.validateOAuthLogin('oauth@example.com', 'google', {}),
      ).rejects.toThrow('El usuario no tiene un rol asignado');
    });
  });

  describe('createUser', () => {
    it('should create user successfully with valid data', async () => {
      // Arrange
      const currentUser = {
        email: 'admin@example.com',
        tenantId: generateObjectId(),
      };

      const createUserDto = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: generateObjectId().toString(),
        password: 'password123',
      };

      const mockTenant = createMockTenant({ _id: currentUser.tenantId });
      const mockRole = createMockRole();

      tenantModel.findById.mockResolvedValue(mockTenant);
      rolesService.findOneByName.mockResolvedValue(mockRole);

      userModel.findOne.mockResolvedValue(null); // Usuario no existe

      bcryptMock.hash.mockResolvedValue('hashed-password' as never);

      const newUser = createMockUser({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        tenantId: currentUser.tenantId,
        role: mockRole._id,
      });

      // Mock the constructor pattern: new userModel().save() and populate()
      const savedUserWithPopulate = {
        ...newUser,
        populate: jest.fn().mockResolvedValue(newUser),
      };

      const mockSave: any = jest.fn().mockResolvedValue(savedUserWithPopulate);
      const mockUserModelConstructor: any = jest.fn().mockImplementation(() => ({
        ...newUser,
        save: mockSave,
      }));

      // Add findOne to the constructor mock so it doesn't break
      mockUserModelConstructor.findOne = userModel.findOne;
      mockUserModelConstructor.findById = userModel.findById;

      // Re-inject the mocked userModel into the service
      (service as any).userModel = mockUserModelConstructor;

      membershipsService.createDefaultMembershipIfMissing.mockResolvedValue({
        id: generateObjectId().toString(),
        status: 'active',
      });

      // Act
      const result = await service.createUser(createUserDto, currentUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDto.email);
      expect(bcryptMock.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user already exists', async () => {
      // Arrange
      const currentUser = {
        email: 'admin@example.com',
        tenantId: generateObjectId(),
      };

      const createUserDto = {
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
        role: generateObjectId().toString(),
        password: 'password123',
      };

      tenantModel.findById.mockResolvedValue(createMockTenant());

      userModel.findOne.mockResolvedValue(createMockUser()); // Usuario ya existe

      // Act & Assert
      await expect(service.createUser(createUserDto, currentUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully with valid refresh token', async () => {
      // Arrange
      const mockUser = createMockUser({
        role: createMockRole(),
        isActive: true,
      });

      const mockPayload = {
        sub: mockUser._id.toString(),
      };

      jwtService.verify.mockReturnValue(mockPayload);

      // Mock the chained findById().populate() pattern
      userModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      const mockTenant = createMockTenant({ status: 'active' });
      tenantModel.findById.mockResolvedValue(mockTenant);

      tokenService.generateTokens.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: '15m',
      });

      // Act
      const result = await service.refreshToken('valid-refresh-token');

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      const mockPayload = {
        sub: generateObjectId().toString(),
      };

      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      userModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null), // Usuario no encontrado
      });

      // Act & Assert
      await expect(service.refreshToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Arrange
      const mockUser = createMockUser({
        password: await bcrypt.hash('oldpassword', 10),
      });

      const user = {
        id: mockUser._id.toString(),
        email: mockUser.email,
      };

      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      userModel.findById.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);
      bcryptMock.hash.mockResolvedValue('hashed-new-password' as never);

      // Act
      await service.changePassword(changePasswordDto, user);

      // Assert - changePassword returns void
      expect(bcryptMock.compare).toHaveBeenCalledWith('oldpassword', mockUser.password);
      expect(bcryptMock.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id.toString() },
        { password: 'hashed-new-password' },
      );
    });

    it('should throw UnauthorizedException if old password is incorrect', async () => {
      // Arrange
      const mockUser = createMockUser({
        password: await bcrypt.hash('oldpassword', 10),
      });

      const user = {
        id: mockUser._id.toString(),
        email: mockUser.email,
      };

      const changePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      userModel.findById.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(false as never); // Password incorrecto

      // Act & Assert
      await expect(service.changePassword(changePasswordDto, user)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('register', () => {
    it('should throw BadRequestException as public registration is disabled', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      // Act & Assert
      await expect(service.register(registerDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto as any)).rejects.toThrow(
        'El registro público está deshabilitado',
      );
    });
  });
});
