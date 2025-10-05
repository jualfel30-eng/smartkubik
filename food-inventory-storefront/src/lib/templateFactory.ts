import ModernEcommerce from '@/templates/ModernEcommerce';
import ModernServices from '@/templates/ModernServices';

const TEMPLATES = {
  'modern-ecommerce': ModernEcommerce,
  'modern-services': ModernServices,
};

/**
 * Obtiene el componente del template según el nombre
 * @param templateName - Nombre del template a cargar
 * @returns Componente del template
 */
export function getTemplate(templateName: string) {
  return TEMPLATES[templateName as keyof typeof TEMPLATES] || TEMPLATES['modern-ecommerce'];
}
