import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { ALL_PERMISSIONS } from './constants';

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionsService],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all permissions', () => {
      // Act
      const result = service.findAll();

      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual(ALL_PERMISSIONS);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('users_read');
      expect(result).toContain('orders_create');
      expect(result).toContain('products_update');
    });

    it('should include all CRUD permissions for users', () => {
      // Act
      const result = service.findAll();

      // Assert
      expect(result).toContain('users_create');
      expect(result).toContain('users_read');
      expect(result).toContain('users_update');
      expect(result).toContain('users_delete');
    });

    it('should include core module permissions', () => {
      // Act
      const result = service.findAll();

      // Assert
      expect(result).toContain('dashboard_read');
      expect(result).toContain('roles_read');
      expect(result).toContain('tenant_settings_read');
      expect(result).toContain('accounting_read');
    });
  });

  describe('findByModules', () => {
    it('should return permissions for specified modules', () => {
      // Arrange
      const modules = ['orders', 'inventory'];

      // Act
      const result = service.findByModules(modules);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Should include specified modules
      expect(result.some(p => p.startsWith('orders_'))).toBe(true);
      expect(result.some(p => p.startsWith('inventory_'))).toBe(true);

      // Should include core modules
      expect(result.some(p => p.startsWith('users_'))).toBe(true);
      expect(result.some(p => p.startsWith('dashboard_'))).toBe(true);
      expect(result.some(p => p.startsWith('roles_'))).toBe(true);
    });

    it('should always include core modules even if not specified', () => {
      // Arrange
      const modules = ['appointments']; // Only appointments module

      // Act
      const result = service.findByModules(modules);

      // Assert
      expect(result).toBeDefined();

      // Should include specified module
      expect(result.some(p => p.startsWith('appointments_'))).toBe(true);

      // Should include core modules (dashboard, users, roles, etc.)
      expect(result.some(p => p.startsWith('dashboard_'))).toBe(true);
      expect(result.some(p => p.startsWith('users_'))).toBe(true);
      expect(result.some(p => p.startsWith('roles_'))).toBe(true);
      expect(result.some(p => p.startsWith('products_'))).toBe(true);
      expect(result.some(p => p.startsWith('accounting_'))).toBe(true);
    });

    it('should return only core modules when empty array provided', () => {
      // Arrange
      const modules: string[] = [];

      // Act
      const result = service.findByModules(modules);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle modules with different case sensitivity', () => {
      // Arrange
      const modules = ['ORDERS', 'InVeNtOrY', 'products'];

      // Act
      const result = service.findByModules(modules);

      // Assert
      expect(result).toBeDefined();
      expect(result.some(p => p.startsWith('orders_'))).toBe(true);
      expect(result.some(p => p.startsWith('inventory_'))).toBe(true);
      expect(result.some(p => p.startsWith('products_'))).toBe(true);
    });

    it('should filter out non-existent modules', () => {
      // Arrange
      const modules = ['orders', 'non_existent_module', 'inventory'];

      // Act
      const result = service.findByModules(modules);

      // Assert
      expect(result).toBeDefined();

      // Should include valid modules
      expect(result.some(p => p.startsWith('orders_'))).toBe(true);
      expect(result.some(p => p.startsWith('inventory_'))).toBe(true);

      // Should not include non-existent module
      expect(result.some(p => p.startsWith('non_existent_module_'))).toBe(false);
    });

    it('should return all module permissions when multiple modules specified', () => {
      // Arrange
      const modules = ['restaurant', 'marketing', 'chat'];

      // Act
      const result = service.findByModules(modules);

      // Assert
      expect(result).toBeDefined();

      // Should include all specified modules
      expect(result.some(p => p.startsWith('restaurant_'))).toBe(true);
      expect(result.some(p => p.startsWith('marketing_'))).toBe(true);
      expect(result.some(p => p.startsWith('chat_'))).toBe(true);

      // Should include core modules
      expect(result.some(p => p.startsWith('users_'))).toBe(true);
      expect(result.some(p => p.startsWith('dashboard_'))).toBe(true);
    });

    it('should not duplicate permissions when module is specified multiple times', () => {
      // Arrange
      const modules = ['orders', 'orders', 'inventory', 'orders'];

      // Act
      const result = service.findByModules(modules);

      // Assert
      expect(result).toBeDefined();

      // Count orders permissions (should not be duplicated)
      const ordersPermissions = result.filter(p => p.startsWith('orders_'));
      const uniqueOrdersPermissions = [...new Set(ordersPermissions)];

      expect(ordersPermissions.length).toBe(uniqueOrdersPermissions.length);
    });

    it('should handle null modules gracefully', () => {
      // Arrange
      const modules = null as any;

      // Act
      const result = service.findByModules(modules);

      // Assert
      expect(result).toEqual([]);
    });

    it('should include CRM permissions for CRM module', () => {
      // Arrange
      const modules = ['crm', 'customers'];

      // Act
      const result = service.findByModules(modules);

      // Assert
      expect(result).toBeDefined();
      // CRM is a core module, customers permissions should be included
      expect(result.some(p => p.startsWith('customers_'))).toBe(true);
      // Core modules should also be included
      expect(result.some(p => p.startsWith('users_'))).toBe(true);
    });
  });
});
