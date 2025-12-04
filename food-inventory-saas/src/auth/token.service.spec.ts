import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { TokenService } from './token.service';
import { Role } from '../schemas/role.schema';
import { PermissionsService } from '../modules/permissions/permissions.service';
import {
  createMockModel,
  createMockUser,
  createMockTenant,
  createMockRole,
  createMockJwtService,
  createMockPermissionsService,
} from '../../test/helpers/test-utils';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: any;
  let roleModel: any;
  let permissionsService: any;

  beforeEach(async () => {
    jwtService = createMockJwtService();
    roleModel = createMockModel([createMockRole()]);
    permissionsService = createMockPermissionsService();

    // Configurar roleModel.findById con populate
    roleModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(createMockRole()),
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: getModelToken(Role.name),
          useValue: roleModel,
        },
        {
          provide: PermissionsService,
          useValue: permissionsService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens with valid user and tenant', async () => {
      // Arrange
      const user = createMockUser({
        role: createMockRole(),
      });
      const tenant = createMockTenant();

      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');

      // Act
      const result = await service.generateTokens(user, tenant);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.expiresIn).toBeDefined();

      // Verificar que se llamó JwtService.signAsync dos veces
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);

      // Verificar payload del access token
      const accessTokenPayload = jwtService.signAsync.mock.calls[0][0];
      expect(accessTokenPayload.sub).toBe(user._id);
      expect(accessTokenPayload.email).toBe(user.email);
      expect(accessTokenPayload.role.name).toBe('admin');
      expect(accessTokenPayload.tenantId).toBe(tenant._id);
      expect(accessTokenPayload.tenantConfirmed).toBe(true);

      // Verificar payload del refresh token
      const refreshTokenPayload = jwtService.signAsync.mock.calls[1][0];
      expect(refreshTokenPayload.sub).toBe(user._id);
    });

    it('should generate tokens without tenant (pre-tenant-selection)', async () => {
      // Arrange
      const user = createMockUser({
        role: createMockRole(),
      });

      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');

      // Act
      const result = await service.generateTokens(user, null);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');

      const accessTokenPayload = jwtService.signAsync.mock.calls[0][0];
      expect(accessTokenPayload.tenantId).toBeNull();
      expect(accessTokenPayload.tenantConfirmed).toBeNull();
    });

    it('should include permissions from populated role', async () => {
      // Arrange
      const mockRole = createMockRole({
        permissions: [
          { _id: 'perm1', name: 'orders_read' },
          { _id: 'perm2', name: 'orders_create' },
          { _id: 'perm3', name: 'inventory_read' },
        ],
      });

      const user = createMockUser({ role: mockRole });
      const tenant = createMockTenant();

      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await service.generateTokens(user, tenant);

      // Assert
      const accessTokenPayload = jwtService.signAsync.mock.calls[0][0];
      expect(accessTokenPayload.role.permissions).toEqual([
        'orders_read',
        'orders_create',
        'inventory_read',
      ]);
    });

    it('should fetch role from database if permissions are not populated', async () => {
      // Arrange
      const user = createMockUser({
        role: '507f1f77bcf86cd799439013', // Solo ID, sin populate
      });
      const tenant = createMockTenant();

      const populatedRole = createMockRole({
        permissions: [
          { name: 'orders_read' },
          { name: 'orders_create' },
        ],
      });

      roleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(populatedRole),
        }),
      });

      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await service.generateTokens(user, tenant);

      // Assert
      expect(roleModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439013');

      const accessTokenPayload = jwtService.signAsync.mock.calls[0][0];
      expect(accessTokenPayload.role.permissions).toContain('orders_read');
      expect(accessTokenPayload.role.permissions).toContain('orders_create');
    });

    it('should use default permissions for admin role if empty', async () => {
      // Arrange
      const adminRole = createMockRole({
        name: 'admin',
        permissions: [], // Sin permisos populados
      });

      roleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(adminRole),
        }),
      });

      const user = createMockUser({ role: adminRole });
      const tenant = createMockTenant();

      permissionsService.findAll.mockReturnValue([
        'orders_read',
        'orders_create',
        'orders_update',
        'orders_delete',
        'inventory_read',
        'inventory_update',
      ]);

      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await service.generateTokens(user, tenant);

      // Assert
      expect(permissionsService.findAll).toHaveBeenCalled();

      const accessTokenPayload = jwtService.signAsync.mock.calls[0][0];
      expect(accessTokenPayload.role.permissions.length).toBeGreaterThan(0);
      expect(accessTokenPayload.role.permissions).toContain('orders_read');
    });

    it('should include impersonation flags when provided', async () => {
      // Arrange
      const user = createMockUser({ role: createMockRole() });
      const tenant = createMockTenant();

      const options = {
        impersonation: true,
        impersonatorId: 'super-admin-id-123',
      };

      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await service.generateTokens(user, tenant, options);

      // Assert
      const accessTokenPayload = jwtService.signAsync.mock.calls[0][0];
      expect(accessTokenPayload.impersonated).toBe(true);
      expect(accessTokenPayload.impersonatorId).toBe('super-admin-id-123');
    });

    it('should include membershipId when provided', async () => {
      // Arrange
      const user = createMockUser({ role: createMockRole() });
      const tenant = createMockTenant();

      const options = {
        membershipId: 'membership-id-456',
      };

      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await service.generateTokens(user, tenant, options);

      // Assert
      const accessTokenPayload = jwtService.signAsync.mock.calls[0][0];
      expect(accessTokenPayload.membershipId).toBe('membership-id-456');
    });

    it('should use roleOverride if provided in options', async () => {
      // Arrange
      const user = createMockUser({ role: createMockRole({ name: 'vendedor' }) });
      const tenant = createMockTenant();

      const overrideRole = createMockRole({
        name: 'manager',
        permissions: [{ name: 'inventory_read' }, { name: 'inventory_update' }],
      });

      const options = {
        roleOverride: overrideRole,
      };

      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await service.generateTokens(user, tenant, options);

      // Assert
      const accessTokenPayload = jwtService.signAsync.mock.calls[0][0];
      expect(accessTokenPayload.role.name).toBe('manager');
      expect(accessTokenPayload.role.permissions).toContain('inventory_read');
      expect(accessTokenPayload.role.permissions).toContain('inventory_update');
    });

    it('should throw error if user role is not properly populated and not found', async () => {
      // Arrange
      const user = createMockUser({
        role: undefined, // Sin rol
      });
      const tenant = createMockTenant();

      // Act & Assert
      await expect(service.generateTokens(user, tenant)).rejects.toThrow(
        'User role is not properly populated',
      );
    });

    it('should throw error if role is not found in database', async () => {
      // Arrange
      const user = createMockUser({
        role: '507f1f77bcf86cd799439099', // ID que no existe
      });
      const tenant = createMockTenant();

      roleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null), // Rol no encontrado
        }),
      });

      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act & Assert
      await expect(service.generateTokens(user, tenant)).rejects.toThrow(
        'Role associated to user not found',
      );
    });

    it('should respect JWT_EXPIRES_IN from environment', async () => {
      // Arrange
      const user = createMockUser({ role: createMockRole() });
      const tenant = createMockTenant();

      const originalExpiresIn = process.env.JWT_EXPIRES_IN;
      process.env.JWT_EXPIRES_IN = '30m';

      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      const result = await service.generateTokens(user, tenant);

      // Assert
      expect(result.expiresIn).toBe('30m');

      const accessTokenOptions = jwtService.signAsync.mock.calls[0][1];
      expect(accessTokenOptions.expiresIn).toBe('30m');

      // Cleanup
      if (originalExpiresIn) {
        process.env.JWT_EXPIRES_IN = originalExpiresIn;
      } else {
        delete process.env.JWT_EXPIRES_IN;
      }
    });

    it('should use default expiresIn if not in environment', async () => {
      // Arrange
      const user = createMockUser({ role: createMockRole() });
      const tenant = createMockTenant();

      const originalExpiresIn = process.env.JWT_EXPIRES_IN;
      delete process.env.JWT_EXPIRES_IN;

      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      const result = await service.generateTokens(user, tenant);

      // Assert
      expect(result.expiresIn).toBe('15m');

      // Cleanup
      if (originalExpiresIn) {
        process.env.JWT_EXPIRES_IN = originalExpiresIn;
      }
    });

    it('should filter out null/undefined permissions', async () => {
      // Arrange
      const mockRole = createMockRole({
        permissions: [
          { name: 'orders_read' },
          { name: null }, // Permiso inválido
          { name: 'orders_create' },
          { name: undefined }, // Permiso inválido
          { name: '' }, // Permiso vacío
        ],
      });

      const user = createMockUser({ role: mockRole });
      const tenant = createMockTenant();

      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await service.generateTokens(user, tenant);

      // Assert
      const accessTokenPayload = jwtService.signAsync.mock.calls[0][0];
      expect(accessTokenPayload.role.permissions).toEqual([
        'orders_read',
        'orders_create',
      ]);
      expect(accessTokenPayload.role.permissions).not.toContain(null);
      expect(accessTokenPayload.role.permissions).not.toContain(undefined);
      expect(accessTokenPayload.role.permissions).not.toContain('');
    });
  });
});
