/**
 * Configuración de módulos disponibles por vertical
 *
 * Define qué módulos están disponibles para cada tipo de negocio (vertical).
 * Estos valores se usan como defaults cuando se crea un nuevo tenant.
 */

export const VERTICAL_FEATURES = {
  FOOD_SERVICE: {
    // Core modules
    inventory: true,
    orders: true,
    customers: true,
    suppliers: true,
    reports: true,
    accounting: true,
    payroll: true,
    bankAccounts: true,
    hrCore: false,
    timeAndAttendance: false,

    // Food service specific
    restaurant: true, // This flag enables the whole restaurant section in the frontend
    tables: true,
    recipes: true,
    kitchenDisplay: true,
    menuEngineering: true,

    // Disabled for food service
    pos: false,
    variants: false,
    ecommerce: false,
    loyaltyProgram: false,
    appointments: false,
    resources: false,
    booking: false,
    servicePackages: false,
    shipments: false,
    tracking: false,
    routes: false,
    fleet: false,
    warehousing: false,
    dispatch: false,
  },

  RETAIL: {
    // Core modules
    inventory: true,
    orders: true,
    customers: true,
    suppliers: true,
    reports: true,
    accounting: true,
    payroll: true,
    bankAccounts: true,
    hrCore: false,
    timeAndAttendance: false,

    // Retail specific
    pos: true,
    variants: true,
    ecommerce: true,
    loyaltyProgram: true,

    // Disabled for retail
    tables: false,
    recipes: false,
    kitchenDisplay: false,
    menuEngineering: false,
    appointments: false,
    resources: false,
    booking: false,
    servicePackages: false,
    shipments: false,
    tracking: false,
    routes: false,
    fleet: false,
    warehousing: false,
    dispatch: false,
  },

  SERVICES: {
    // Core modules
    inventory: true,
    orders: true,
    customers: true,
    suppliers: true,
    reports: true,
    accounting: true,
    payroll: true,
    bankAccounts: true,
    hrCore: false,
    timeAndAttendance: false,

    // Services specific
    appointments: true,
    resources: true,
    booking: true,
    servicePackages: true,

    // Disabled for services
    tables: false,
    recipes: false,
    kitchenDisplay: false,
    menuEngineering: false,
    pos: false,
    variants: false,
    ecommerce: false,
    loyaltyProgram: false,
    shipments: false,
    tracking: false,
    routes: false,
    fleet: false,
    warehousing: false,
    dispatch: false,
  },

  LOGISTICS: {
    // Core modules
    inventory: true,
    orders: true,
    customers: true,
    suppliers: true,
    reports: true,
    accounting: true,
    payroll: true,
    bankAccounts: true,
    hrCore: false,
    timeAndAttendance: false,

    // Logistics specific
    shipments: true,
    tracking: true,
    routes: true,
    fleet: true,
    warehousing: true,
    dispatch: true,

    // Disabled for logistics
    tables: false,
    recipes: false,
    kitchenDisplay: false,
    menuEngineering: false,
    pos: false,
    variants: false,
    ecommerce: false,
    loyaltyProgram: false,
    appointments: false,
    resources: false,
    booking: false,
    servicePackages: false,
  },

  HYBRID: {
    // Core modules (all enabled for hybrid)
    inventory: true,
    orders: true,
    customers: true,
    suppliers: true,
    reports: true,
    accounting: true,
    payroll: true,
    bankAccounts: true,
    hrCore: true,
    timeAndAttendance: true,

    // All vertical-specific modules enabled (admin decides which to use)
    tables: true,
    recipes: true,
    kitchenDisplay: true,
    menuEngineering: true,
    pos: true,
    variants: true,
    ecommerce: true,
    loyaltyProgram: true,
    appointments: true,
    resources: true,
    booking: true,
    servicePackages: true,
    shipments: true,
    tracking: true,
    routes: true,
    fleet: true,
    warehousing: true,
    dispatch: true,
  },

  MANUFACTURING: {
    // Core modules
    inventory: true,
    orders: true,
    customers: true,
    suppliers: true,
    reports: true,
    accounting: true,
    payroll: true,
    bankAccounts: true,
    hrCore: false,
    timeAndAttendance: false,

    // Production modules (already implemented in Phases 1-8)
    production: true,
    bom: true,
    routing: true,
    workCenters: true,
    mrp: true,

    // Manufacturing specific (to be implemented)
    qualityControl: false,
    maintenance: false,
    productionScheduling: false,
    shopFloorControl: false,
    traceability: false,
    costing: false,
    plm: false,
    capacityPlanning: false,
    compliance: false,

    // Disabled for manufacturing
    tables: false,
    recipes: false,
    kitchenDisplay: false,
    menuEngineering: false,
    pos: false,
    variants: false,
    ecommerce: false,
    loyaltyProgram: false,
    appointments: false,
    resources: false,
    booking: false,
    servicePackages: false,
    shipments: false,
    tracking: false,
    routes: false,
    fleet: false,
    warehousing: false,
    dispatch: false,
  },
};

/**
 * Obtiene los módulos habilitados por defecto para un vertical
 */
export function getDefaultModulesForVertical(vertical: string) {
  return VERTICAL_FEATURES[vertical] || VERTICAL_FEATURES.FOOD_SERVICE;
}

/**
 * Verifica si un módulo está disponible para un vertical
 */
export function isModuleAvailableForVertical(
  vertical: string,
  module: string,
): boolean {
  const features =
    VERTICAL_FEATURES[vertical] || VERTICAL_FEATURES.FOOD_SERVICE;
  return features[module] ?? false;
}

/**
 * Combina los módulos por defecto del vertical con los módulos configurados explícitamente
 * Permite que los valores `false` guardados sobrescriban los defaults habilitados.
 */
export function getEffectiveModulesForTenant(
  vertical: string,
  enabledModules?: Record<string, boolean>,
): Record<string, boolean> {
  const defaults = getDefaultModulesForVertical(vertical);
  return {
    ...defaults,
    ...(enabledModules || {}),
  };
}
