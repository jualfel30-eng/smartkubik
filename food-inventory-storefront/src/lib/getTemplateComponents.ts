import { Header as ModernEcommerceHeader } from '@/templates/ModernEcommerce/components/Header';
import { Footer as ModernEcommerceFooter } from '@/templates/ModernEcommerce/components/Footer';
import { ProductCard as ModernProductCard } from '@/templates/ModernEcommerce/components/ProductCard';
import { ProductsGrid as ModernProductsGrid } from '@/templates/ModernEcommerce/components/ProductsGrid';
import { Header as PremiumHeader } from '@/templates/PremiumStorefront/components/Header';
import { Footer as PremiumFooter } from '@/templates/PremiumStorefront/components/Footer';
import { ProductCard as PremiumProductCard } from '@/templates/PremiumStorefront/components/ProductCard';
import { ProductsGrid as PremiumProductsGrid } from '@/templates/PremiumStorefront/components/ProductsGrid';

const TEMPLATE_COMPONENTS = {
  ecommerce: { Header: ModernEcommerceHeader, Footer: ModernEcommerceFooter, ProductCard: ModernProductCard, ProductsGrid: ModernProductsGrid },
  'modern-ecommerce': { Header: ModernEcommerceHeader, Footer: ModernEcommerceFooter, ProductCard: ModernProductCard, ProductsGrid: ModernProductsGrid },
  services: { Header: ModernEcommerceHeader, Footer: ModernEcommerceFooter, ProductCard: ModernProductCard, ProductsGrid: ModernProductsGrid },
  'modern-services': { Header: ModernEcommerceHeader, Footer: ModernEcommerceFooter, ProductCard: ModernProductCard, ProductsGrid: ModernProductsGrid },
  premium: { Header: PremiumHeader, Footer: PremiumFooter, ProductCard: PremiumProductCard, ProductsGrid: PremiumProductsGrid },
};

/**
 * Returns the template-specific components for the given template type.
 * Defaults to ecommerce if templateType is unknown.
 */
export function getTemplateComponents(templateType?: string) {
  return TEMPLATE_COMPONENTS[templateType as keyof typeof TEMPLATE_COMPONENTS] || TEMPLATE_COMPONENTS.ecommerce;
}
