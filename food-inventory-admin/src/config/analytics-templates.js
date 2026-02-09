/**
 * Pre-configured analytics templates by vertical (Phase 3)
 * These templates are loaded from the backend but can also be used
 * as a reference for default configurations.
 */

export const ANALYTICS_TEMPLATES = {
  restaurant: {
    label: '🍽️ Restaurante',
    description: 'Métricas clave para negocios de alimentos y bebidas',
    metrics: [
      'revenue_by_category',
      'expenses_operational',
      'payroll_detailed',
      'top_products',
      'margin_by_category',
    ],
  },
  retail: {
    label: '🛒 Retail',
    description: 'Análisis para tiendas y comercio minorista',
    metrics: [
      'revenue_by_category',
      'top_products',
      'inventory_value',
      'margin_by_product',
      'revenue_by_payment',
    ],
  },
  services: {
    label: '💼 Servicios',
    description: 'Métricas para negocios de servicios profesionales',
    metrics: [
      'revenue_by_category',
      'expenses_operational',
      'payroll_detailed',
      'margin_by_category',
    ],
  },
  manufacturing: {
    label: '🏭 Manufactura',
    description: 'KPIs para producción y manufactura',
    metrics: [
      'margin_by_product',
      'inventory_value',
      'expenses_operational',
      'revenue_by_category',
    ],
  },
  hospitality: {
    label: '🏨 Hospitalidad',
    description: 'Análisis para hoteles y hospedaje',
    metrics: [
      'revenue_by_channel',
      'revenue_by_payment',
      'payroll_detailed',
      'expenses_operational',
    ],
  },
};

/**
 * Get template configuration for a vertical
 */
export function getTemplateForVertical(vertical) {
  return ANALYTICS_TEMPLATES[vertical] || null;
}

/**
 * Get all available templates
 */
export function getAllTemplates() {
  return Object.entries(ANALYTICS_TEMPLATES).map(([key, value]) => ({
    id: key,
    ...value,
  }));
}
