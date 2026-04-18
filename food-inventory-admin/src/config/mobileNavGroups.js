/**
 * Mobile "Más" menu group configuration.
 *
 * Maps navLink hrefs into logical groups for the mobile navigation hub.
 * The order of hrefs within each group determines display order.
 * Items not matched to any group are silently skipped.
 */

export const MOBILE_NAV_GROUPS = [
  {
    key: 'operations',
    label: 'Operaciones',
    hrefs: [
      'floor-view',
      'services',
      'resources',
      'inventory-management',
      'purchases',
      'cash-register',
      'orders',
      'production',
      'fulfillment',
      'driver',
      'restaurant/floor-plan',
      'restaurant/kitchen-display',
      'restaurant/recipes',
      'restaurant/reservations',
      'restaurant/menu-engineering',
      'restaurant/purchase-orders',
      'restaurant/storefront',
      'hospitality/operations',
      'hospitality/floor-plan',
    ],
  },
  {
    key: 'sales-marketing',
    label: 'Ventas y Marketing',
    hrefs: [
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
      'commissions',
      'reports',
      'bank-accounts',
      'accounting',
      'accounts-payable',
      'receivables?tab=pending',
      'payroll/runs',
      'tips',
      'fixed-assets',
      'investments',
    ],
  },
  {
    key: 'system',
    label: 'Sistema',
    hrefs: [
      'subsidiaries',
      'data-import',
      'calendar',
      'assistant',
    ],
  },
];

/**
 * Routes already handled by the bottom navigation bar.
 * These are excluded from the "Más" menu to avoid duplication.
 */
export const BOTTOM_NAV_HREFS = new Set([
  'dashboard',
  'appointments',
  'crm',
  'orders/new',
]);
