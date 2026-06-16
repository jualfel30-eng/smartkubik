/**
 * Sidebar whitelist per niche profile.
 *
 * Keys = verticalProfile.key values (from vertical-profiles.ts)
 * Values = Set of navLink `href` values that should be visible
 *
 * RULES:
 * 1. If tenant.verticalProfile.key is NOT in this map, all items are shown
 *    (backward compatible — food-service, retail-*, manufacturing, hospitality).
 * 2. Items in the whitelist still go through ALL existing filters
 *    (requiresModule, requiresVertical, permission, etc.).
 * 3. The whitelist ADDS an extra gate, it does NOT bypass other checks.
 * 4. Footer items (Configuración, Cerrar Sesión, Colapsar) are always shown
 *    because they are rendered by SidebarFooterContent, not by navLinks.
 */

export const SIDEBAR_PROFILE_WHITELIST = {

  // Note: whitelist only filters top-level (level=0) items. Children are
  // gated by permission/module/vertical checks on their own.
  'grocery': new Set([
    'dashboard',
    'subsidiaries',
    'orders',
    'inventory-management',
    'waste-control',
    'business-locations',
    'fulfillment',
    'driver',
    'purchases',
    'crm',
    'marketing',
    'accounting',
    'accounts-payable',
    'receivables',
    'payment-requests',
    'payroll/runs',
    'bank-accounts',
    'fixed-assets',
    'investments',
    'cash-register',
    'storefront',
    'whatsapp',
    'assistant',
  ]),

  'barbershop-salon': new Set([
    'dashboard',              // Panel de Control
    'subsidiaries',           // Mis Sedes (filtered by requiresSubsidiaries)
    'appointments',           // Agenda (unified: calendar + floor panel + command panel)
    'services',               // Servicios
    'resources',              // Estaciones (dynamicLabel)
    'crm',                    // CRM — Clientes
    'inventory-management',   // Inventario (gel, shampoo, etc.)
    'purchases',              // Compras (tintes, shampoo, cuchillas)
    'marketing',              // Campañas, cupones, programa de lealtad, promociones
    'commissions',            // Comisiones y Metas de barberos
    'payment-requests',       // Solicitudes de pago (cobro storefront/WhatsApp)
    'bank-accounts',          // Cuentas Bancarias
    'cash-register',          // Cierre de Caja
    'storefront',             // Mi Sitio Web (reservas online)
    'reviews',                // Reseñas (moderación)
    'beauty/analytics',       // Analítica (ingresos/profesional, retención, no-show, horas pico)
    'whatsapp',               // WhatsApp (gated by permission: chat_read)
    'assistant',              // Asistente IA
  ]),

  'mechanic-shop': new Set([
    'dashboard',              // Panel de Control
    'subsidiaries',           // Mis Sedes
    'orders',                 // Órdenes de Trabajo
    'appointments',           // Citas de Servicio (dynamicLabel)
    'services',               // Servicios
    'resources',              // Bahías / Equipos (dynamicLabel)
    'crm',                    // CRM — Clientes + vehículos
    'inventory-management',   // Inventario (repuestos, aceites)
    'purchases',              // Compras (repuestos a proveedores)
    'receivables?tab=pending', // Cuentas por Cobrar
    'commissions',            // Comisiones y Metas de mecánicos
    'payment-requests',       // Solicitudes de pago (cobro storefront/WhatsApp)
    'bank-accounts',          // Cuentas Bancarias
    'cash-register',          // Cierre de Caja
    'storefront',             // Mi Sitio Web (citas online)
    'whatsapp',               // WhatsApp (gated by permission)
    'assistant',              // Asistente IA
  ]),

  'clinic-spa': new Set([
    'dashboard',              // Panel de Control
    'subsidiaries',           // Mis Sedes
    'appointments',           // Consultas (unified: calendar + floor panel + command panel)
    'services',               // Servicios / Tratamientos
    'resources',              // Consultorios (dynamicLabel)
    'crm',                    // CRM — Pacientes/clientes
    'inventory-management',   // Inventario (insumos médicos)
    'purchases',              // Compras (insumos)
    'commissions',            // Comisiones y Metas de especialistas
    'payment-requests',       // Solicitudes de pago (cobro storefront/WhatsApp)
    'bank-accounts',          // Cuentas Bancarias
    'cash-register',          // Cierre de Caja
    'storefront',             // Mi Sitio Web (reservas online)
    'reviews',                // Reseñas (moderación)
    'beauty/analytics',       // Analítica (ingresos/profesional, retención, no-show, horas pico)
    'whatsapp',               // WhatsApp (gated by permission)
    'assistant',              // Asistente IA
  ]),

  'auto-parts': new Set([
    'dashboard',              // Panel de Control
    'subsidiaries',           // Mis Sedes
    'orders',                 // Órdenes (ventas)
    'inventory-management',   // Inventario (autopartes)
    'purchases',              // Compras (proveedores de repuestos)
    'fulfillment',            // Entregas (autopartes often deliver)
    'crm',                    // CRM — Clientes, talleres
    'receivables?tab=pending', // Cuentas por Cobrar
    'payment-requests',       // Solicitudes de pago (cobro storefront/WhatsApp)
    'bank-accounts',          // Cuentas Bancarias
    'cash-register',          // Cierre de Caja
    'storefront',             // Mi Sitio Web (catálogo online)
    'whatsapp',               // WhatsApp (gated by permission)
    'assistant',              // Asistente IA
  ]),
};

/**
 * Returns the whitelist Set for a profile key, or null if no restriction applies.
 */
export function getSidebarWhitelist(profileKey) {
  if (!profileKey) return null;
  return SIDEBAR_PROFILE_WHITELIST[profileKey] || null;
}
