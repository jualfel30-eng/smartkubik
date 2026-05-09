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
 * Routes already handled by the bottom navigation bar — excluded from "Más" menu.
 * Three sets, one per vertical track. Each track's bottom nav exposes different
 * primary routes; the others should appear in the "Más" menu.
 */
export const BOTTOM_NAV_HREFS_BEAUTY = new Set([
  'dashboard',
  'appointments',
  'crm',
]);

export const BOTTOM_NAV_HREFS_COMMERCE = new Set([
  'dashboard',
  'orders/history',
  'inventory-management',
]);

export const BOTTOM_NAV_HREFS_DEFAULT = new Set([
  'dashboard',
  'orders/new',
  'crm',
]);

/**
 * Returns the right exclusion set for the active vertical track.
 * Pass the flags from `useMobileVertical()`.
 */
export function getBottomNavHrefs({ isBeauty = false, isCommerce = false } = {}) {
  if (isBeauty) return BOTTOM_NAV_HREFS_BEAUTY;
  if (isCommerce) return BOTTOM_NAV_HREFS_COMMERCE;
  return BOTTOM_NAV_HREFS_DEFAULT;
}

/**
 * Backwards-compatible alias — same as the old hard-coded set, used by callers
 * that haven't been updated to take vertical flags into account yet.
 * Equivalent to BOTTOM_NAV_HREFS_DEFAULT plus 'appointments' to cover legacy beauty nav.
 */
export const BOTTOM_NAV_HREFS = new Set([
  'dashboard',
  'appointments',
  'crm',
  'orders/new',
]);
