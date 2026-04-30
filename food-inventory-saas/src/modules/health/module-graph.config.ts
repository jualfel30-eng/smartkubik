/**
 * Static dependency graph of SmartKubik modules.
 *
 * Sources (verified during codebase exploration 2026-04-30):
 * - food-inventory-saas/src/app.module.ts (registered modules)
 * - module files (forwardRef imports = direct module dependencies)
 * - wiki connections docs (cross-module flows)
 *
 * Maintained manually: when you add a new module or change forwardRef
 * relationships, update this file.
 */

export interface FrontendNode {
  id: string;
  name: string;
  /** modules this frontend talks to via the API */
  usesModules: string[];
}

export interface ModuleNode {
  id: string;
  name: string;
  /** MongoDB collection names this module owns / queries primarily */
  collections: string[];
  /** other module ids this module depends on (forwardRef in NestJS) */
  dependsOn: string[];
}

/**
 * Frontend → backend module dependencies.
 * Granularity: each frontend talks to a curated set of backend modules.
 */
export const FRONTENDS: FrontendNode[] = [
  {
    id: 'frontend-admin',
    name: 'Admin',
    usesModules: [
      'module-auth-users-roles',
      'module-products',
      'module-inventory',
      'module-purchases',
      'module-orders',
      'module-customers-crm',
      'module-accounting',
      'module-billing',
      'module-payments',
      'module-bank-accounts',
      'module-payables',
      'module-payroll',
      'module-transfers',
      'module-beauty',
      'module-restaurant',
      'module-marketing',
      'module-production',
    ],
  },
  {
    id: 'frontend-storefront',
    name: 'Storefront',
    usesModules: [
      'module-products',
      'module-orders',
      'module-customers-crm',
      'module-payments',
      'module-beauty',
      'module-restaurant',
    ],
  },
  {
    id: 'frontend-blog',
    name: 'Blog',
    usesModules: [], // standalone Next.js content site
  },
];

/**
 * Backend modules. The `collections` arrays must match the collection ids
 * used in system-map.service.ts (see collectionChecks list there).
 */
export const MODULES: ModuleNode[] = [
  {
    id: 'module-auth-users-roles',
    name: 'Auth & Users',
    collections: ['users', 'roles', 'permissions', 'usertenantmemberships', 'tenants'],
    dependsOn: [],
  },
  {
    id: 'module-products',
    name: 'Products',
    collections: ['products'],
    dependsOn: ['module-inventory', 'module-purchases', 'module-customers-crm'],
  },
  {
    id: 'module-inventory',
    name: 'Inventory',
    collections: ['inventories', 'inventorymovements', 'inventoryalertrules'],
    dependsOn: ['module-products'],
  },
  {
    id: 'module-purchases',
    name: 'Purchases',
    collections: ['purchaseorders', 'suppliers'],
    dependsOn: [
      'module-products',
      'module-inventory',
      'module-customers-crm',
      'module-accounting',
      'module-payables',
    ],
  },
  {
    id: 'module-orders',
    name: 'Orders & POS',
    collections: ['orders', 'cashregistersessions', 'cashregisterclosings'],
    dependsOn: [
      'module-products',
      'module-inventory',
      'module-customers-crm',
      'module-payments',
    ],
  },
  {
    id: 'module-customers-crm',
    name: 'Customers & CRM',
    collections: ['customers'],
    dependsOn: [],
  },
  {
    id: 'module-transfers',
    name: 'Transfers',
    collections: ['transferorders', 'warehouses'],
    dependsOn: ['module-inventory', 'module-products'],
  },
  {
    id: 'module-accounting',
    name: 'Accounting',
    collections: [
      'chartofaccounts',
      'journalentries',
      'ivapurchasebooks',
      'ivasalesbooks',
      'ivadeclarations',
    ],
    dependsOn: [],
  },
  {
    id: 'module-billing',
    name: 'Billing',
    collections: ['billingdocuments'],
    dependsOn: ['module-accounting', 'module-customers-crm', 'module-products'],
  },
  {
    id: 'module-payments',
    name: 'Payments',
    collections: ['payments'],
    dependsOn: ['module-accounting', 'module-bank-accounts'],
  },
  {
    id: 'module-bank-accounts',
    name: 'Bank Accounts',
    collections: ['bankaccounts'],
    dependsOn: ['module-accounting'],
  },
  {
    id: 'module-payables',
    name: 'Payables',
    collections: ['payables'],
    dependsOn: ['module-accounting', 'module-customers-crm'],
  },
  {
    id: 'module-payroll',
    name: 'Payroll & HR',
    collections: ['employeeprofiles', 'payrollruns'],
    dependsOn: ['module-accounting'],
  },
  {
    id: 'module-beauty',
    name: 'Beauty & Services',
    collections: ['appointments', 'services'],
    dependsOn: ['module-customers-crm'],
  },
  {
    id: 'module-restaurant',
    name: 'Restaurant',
    collections: ['tables', 'kitchenorders', 'reservations'],
    dependsOn: ['module-orders', 'module-products'],
  },
  {
    id: 'module-marketing',
    name: 'Marketing',
    collections: ['marketingcampaigns', 'promotions', 'coupons'],
    dependsOn: ['module-customers-crm', 'module-products'],
  },
  {
    id: 'module-production',
    name: 'Production',
    collections: [], // production module exists but has no checked collections in system-map yet
    dependsOn: ['module-products', 'module-inventory'],
  },
  {
    id: 'module-storefront-config',
    name: 'Storefront Config',
    collections: ['storefrontconfigs'],
    dependsOn: [],
  },
];
