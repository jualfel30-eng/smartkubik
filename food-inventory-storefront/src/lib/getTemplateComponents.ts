import { Header as ModernEcommerceHeader } from '@/templates/ModernEcommerce/components/Header';
import { Footer as ModernEcommerceFooter } from '@/templates/ModernEcommerce/components/Footer';
import { Header as PremiumHeader } from '@/templates/PremiumStorefront/components/Header';
import { Footer as PremiumFooter } from '@/templates/PremiumStorefront/components/Footer';

const TEMPLATE_COMPONENTS = {
  ecommerce: { Header: ModernEcommerceHeader, Footer: ModernEcommerceFooter },
  'modern-ecommerce': { Header: ModernEcommerceHeader, Footer: ModernEcommerceFooter },
  services: { Header: ModernEcommerceHeader, Footer: ModernEcommerceFooter },
  'modern-services': { Header: ModernEcommerceHeader, Footer: ModernEcommerceFooter },
  premium: { Header: PremiumHeader, Footer: PremiumFooter },
};

/**
 * Returns the Header and Footer components for the given template type.
 * Defaults to ecommerce if templateType is unknown.
 */
export function getTemplateComponents(templateType?: string) {
  return TEMPLATE_COMPONENTS[templateType as keyof typeof TEMPLATE_COMPONENTS] || TEMPLATE_COMPONENTS.ecommerce;
}
