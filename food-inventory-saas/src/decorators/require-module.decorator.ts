import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify which module is required to access an endpoint
 * Usage: @RequireModule('tables')
 */
export const REQUIRED_MODULE_KEY = 'requiredModule';
export const RequireModule = (module: string) => SetMetadata(REQUIRED_MODULE_KEY, module);
