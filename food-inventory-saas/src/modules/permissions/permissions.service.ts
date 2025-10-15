import { Injectable } from '@nestjs/common';
import { ALL_PERMISSIONS } from './constants';

@Injectable()
export class PermissionsService {
  findAll() {
    return ALL_PERMISSIONS;
  }

  findByModules(modules: string[]) {
    if (!modules || modules.length === 0) {
      return [];
    }

    const lowercasedModules = modules.map(m => m.toLowerCase());
    const coreModules = ['dashboard', 'users', 'roles', 'tenant_settings', 'events', 'crm', 'products', 'payables', 'storefront', 'accounting'];

    const allRequiredModules = [...new Set([...lowercasedModules, ...coreModules])];

    return ALL_PERMISSIONS.filter(permission => {
      const moduleName = permission.split('_')[0];
      return allRequiredModules.includes(moduleName.toLowerCase());
    });
  }
}
