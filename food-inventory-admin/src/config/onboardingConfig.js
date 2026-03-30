/**
 * Per-vertical onboarding wizard configuration.
 * Used by OnboardingWizard.jsx to customize labels, placeholders,
 * and the recommended module set for each vertical.
 */

export const ONBOARDING_STEPS = [
  'welcome',
  'customize',
  'products',
  'sale',
  'modules',
  'cta',
];

export const STEP_LABELS = {
  welcome: 'Bienvenida',
  customize: 'Personalizar',
  products: 'Productos',
  sale: 'Primera venta',
  modules: 'Módulos',
  cta: '¡Listo!',
};

// Module descriptions reused across verticals
const MODULE_DESC = {
  inventory: 'Controla stock, lotes, alertas de vencimiento y reorden',
  orders: 'Gestiona pedidos, cotizaciones y facturación',
  customers: 'Base de datos de clientes y contactos',
  suppliers: 'Gestión de proveedores y compras',
  reports: 'Reportes de ventas, inventario y finanzas',
  accounting: 'Contabilidad, cuentas por cobrar/pagar',
  recipes: 'Fichas técnicas y costeo de recetas',
  tables: 'Gestión de mesas y áreas del local',
  kitchenDisplay: 'Pantalla de cocina para preparación',
  reservations: 'Reservaciones y gestión de mesas',
  pos: 'Punto de venta rápido y táctil',
  variants: 'Tallas, colores y variantes de productos',
  ecommerce: 'Tienda online con carrito y pagos',
  loyaltyProgram: 'Programa de puntos y lealtad',
  appointments: 'Agenda de citas y calendario',
  resources: 'Gestión de recursos y disponibilidad',
  booking: 'Reservas online para clientes',
  servicePackages: 'Paquetes y combos de servicios',
  shipments: 'Gestión de envíos y despachos',
  tracking: 'Seguimiento de paquetes en tiempo real',
  routes: 'Planificación de rutas de entrega',
  fleet: 'Gestión de vehículos y conductores',
  production: 'Órdenes de producción y seguimiento',
  bom: 'Lista de materiales (BOM)',
  workCenters: 'Centros de trabajo y maquinaria',
  qualityControl: 'Control de calidad y trazabilidad',
  marketing: 'Campañas de email, cupones y promociones',
  chat: 'Chat con clientes por WhatsApp',
  cashRegister: 'Cierre de caja y sesiones',
};

export const VERTICAL_CONFIG = {
  FOOD_SERVICE: {
    emoji: '\uD83C\uDF7D\uFE0F',
    label: 'Restaurante / Alimentación',
    productLabel: 'platillo o ingrediente',
    productPlaceholder: 'Ej: Hamburguesa Clásica',
    categoryPlaceholder: 'Ej: Platos principales',
    moduleTour: [
      'inventory', 'orders', 'recipes', 'tables',
      'kitchenDisplay', 'customers', 'cashRegister',
    ],
    moduleDescriptions: MODULE_DESC,
  },
  RETAIL: {
    emoji: '\uD83D\uDECD\uFE0F',
    label: 'Comercio / Retail',
    productLabel: 'producto',
    productPlaceholder: 'Ej: Camiseta Negra Talla M',
    categoryPlaceholder: 'Ej: Ropa',
    moduleTour: [
      'inventory', 'orders', 'pos', 'variants',
      'ecommerce', 'customers', 'cashRegister',
    ],
    moduleDescriptions: MODULE_DESC,
  },
  SERVICES: {
    emoji: '\uD83D\uDCBC',
    label: 'Servicios',
    productLabel: 'servicio',
    productPlaceholder: 'Ej: Consulta General',
    categoryPlaceholder: 'Ej: Consultas',
    moduleTour: [
      'appointments', 'resources', 'booking',
      'servicePackages', 'customers', 'orders',
    ],
    moduleDescriptions: MODULE_DESC,
  },
  LOGISTICS: {
    emoji: '\uD83D\uDE9A',
    label: 'Logística',
    productLabel: 'producto o paquete',
    productPlaceholder: 'Ej: Envío Nacional Estándar',
    categoryPlaceholder: 'Ej: Envíos',
    moduleTour: [
      'shipments', 'tracking', 'routes',
      'fleet', 'inventory', 'customers',
    ],
    moduleDescriptions: MODULE_DESC,
  },
  MANUFACTURING: {
    emoji: '\uD83C\uDFED',
    label: 'Manufactura',
    productLabel: 'producto',
    productPlaceholder: 'Ej: Pieza Metálica A-100',
    categoryPlaceholder: 'Ej: Piezas',
    moduleTour: [
      'production', 'bom', 'workCenters',
      'qualityControl', 'inventory', 'orders',
    ],
    moduleDescriptions: MODULE_DESC,
  },
  HYBRID: {
    emoji: '\uD83D\uDD00',
    label: 'Híbrido',
    productLabel: 'producto o servicio',
    productPlaceholder: 'Ej: Combo Almuerzo Ejecutivo',
    categoryPlaceholder: 'Ej: General',
    moduleTour: [
      'inventory', 'orders', 'pos',
      'customers', 'reports', 'cashRegister',
    ],
    moduleDescriptions: MODULE_DESC,
  },
};

/**
 * Niche-specific configs that override the vertical defaults.
 * Keyed by verticalProfile.key (not vertical).
 */
export const NICHE_CONFIG = {
  'barbershop-salon': {
    emoji: '\uD83D\uDC88',
    label: 'Barbería / Peluquería / Salón',
    productLabel: 'servicio',
    productPlaceholder: 'Ej: Corte de caballero',
    categoryPlaceholder: 'Ej: Cortes',
    moduleTour: [
      'appointments', 'booking', 'resources',
      'tips', 'servicePackages', 'customers', 'cashRegister',
    ],
    moduleDescriptions: MODULE_DESC,
  },
  'mechanic-shop': {
    emoji: '\uD83D\uDD27',
    label: 'Taller Mecánico',
    productLabel: 'servicio o repuesto',
    productPlaceholder: 'Ej: Cambio de aceite motor',
    categoryPlaceholder: 'Ej: Mantenimiento preventivo',
    moduleTour: [
      'appointments', 'orders', 'inventory',
      'customers', 'servicePackages', 'cashRegister',
    ],
    moduleDescriptions: MODULE_DESC,
  },
  'auto-parts': {
    emoji: '\uD83D\uDD29',
    label: 'Tienda de Autopartes',
    productLabel: 'repuesto o accesorio',
    productPlaceholder: 'Ej: Pastillas de freno Toyota Hilux',
    categoryPlaceholder: 'Ej: Frenos',
    moduleTour: [
      'inventory', 'orders', 'pos', 'variants',
      'ecommerce', 'customers', 'cashRegister',
    ],
    moduleDescriptions: MODULE_DESC,
  },
  'clinic-spa': {
    emoji: '\u2728',
    label: 'Clínica / Spa / Centro Estético',
    productLabel: 'servicio o tratamiento',
    productPlaceholder: 'Ej: Limpieza facial profunda',
    categoryPlaceholder: 'Ej: Tratamientos faciales',
    moduleTour: [
      'appointments', 'booking', 'resources',
      'servicePackages', 'customers', 'cashRegister',
    ],
    moduleDescriptions: MODULE_DESC,
  },
};

/**
 * Returns the onboarding config for a given vertical.
 * If a profileKey is provided and matches a niche config, it takes priority.
 */
export function getVerticalConfig(vertical, profileKey) {
  if (profileKey && NICHE_CONFIG[profileKey]) {
    return NICHE_CONFIG[profileKey];
  }
  return VERTICAL_CONFIG[vertical] || VERTICAL_CONFIG.HYBRID;
}
