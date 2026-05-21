import ModernEcommerce from '@/templates/ModernEcommerce';
import ModernServices from '@/templates/ModernServices';
import PremiumStorefront from '@/templates/PremiumStorefront';

const TEMPLATES = {
  'modern-ecommerce': ModernEcommerce,
  'modern-services': ModernServices,
  'premium': PremiumStorefront,
  // Alias para compatibilidad con backend
  'ecommerce': ModernEcommerce,
  'services': ModernServices,
  // Education vertical handled via redirect — no direct template render
};

/**
 * Obtiene el componente del template según el nombre
 * @param templateName - Nombre del template a cargar
 * @returns Componente del template
 */
export function getTemplate(templateName: string) {
  return TEMPLATES[templateName as keyof typeof TEMPLATES] || TEMPLATES['ecommerce'];
}
