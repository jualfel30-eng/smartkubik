import ModernEcommerce from '@/templates/ModernEcommerce';
// Importar otros templates cuando se creen
// import ModernServices from '@/templates/ModernServices'; // Prompt 6

const TEMPLATES = {
  'modern-ecommerce': ModernEcommerce,
  // 'modern-services': ModernServices, // Prompt 6
};

/**
 * Obtiene el componente del template según el nombre
 * @param templateName - Nombre del template a cargar
 * @returns Componente del template
 */
export function getTemplate(templateName: string) {
  return TEMPLATES[templateName as keyof typeof TEMPLATES] || TEMPLATES['modern-ecommerce'];
}
