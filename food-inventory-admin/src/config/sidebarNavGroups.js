/**
 * Desktop sidebar section grouping.
 *
 * Maps navLink hrefs into labeled sections for the desktop sidebar.
 * Parallel structure to MOBILE_NAV_GROUPS (mobileNavGroups.js).
 * Items not matched to any group are placed in an "Otros" fallback section.
 */

export const SIDEBAR_NAV_GROUPS = [
  {
    key: 'main',
    label: null, // Dashboard — no section header
    hrefs: ['dashboard', 'subsidiaries'],
  },
  {
    key: 'operations',
    label: 'Operaciones',
    hrefs: [
      'appointments',
      'floor-view',
      'services',
      'resources',
      'orders',
      'inventory-management',
      'purchases',
      'production',
      'fulfillment',
      'driver',
      'cash-register',
      // Restaurant
      'restaurant/floor-plan',
      'restaurant/kitchen-display',
      'restaurant/recipes',
      'restaurant/reservations',
      'restaurant/menu-engineering',
      'restaurant/purchase-orders',
      'restaurant/storefront',
      // Hospitality
      'hospitality/operations',
      'hospitality/floor-plan',
    ],
  },
  {
    key: 'sales-marketing',
    label: 'Ventas y Marketing',
    hrefs: [
      'crm',
      'storefront',
      'marketing',
      'whatsapp',
      'reviews',
    ],
  },
  {
    key: 'finance-hr',
    label: 'Finanzas y Equipo',
    hrefs: [
      'accounting',
      'accounts-payable',
      'receivables?tab=pending',
      'payroll/runs',
      'commissions',
      'tips',
      'bank-accounts',
      'fixed-assets',
      'investments',
      'reports',
    ],
  },
  {
    key: 'system',
    label: 'Sistema',
    hrefs: [
      'data-import',
      'calendar',
      'assistant',
    ],
  },
];
