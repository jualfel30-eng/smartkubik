import { getStorefrontConfig, getActiveDomains, getProducts, getCategories } from '@/lib/api';
import { getTemplate } from '@/lib/templateFactory';

export const revalidate = 60; // ISR: Revalidar cada 60 segundos

interface StorefrontPageProps {
  params: Promise<{ domain: string }>;
}

export default async function StorefrontPage({
  params,
}: StorefrontPageProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);
  
  // Fetch featured products (first 8)
  const { data: featuredProducts } = await getProducts(config.tenantId, {
    limit: 8,
    page: 1,
  });

  // Fetch categories
  const categories = await getCategories(config.tenantId);

  // Get the appropriate template
  const Template = getTemplate(config.templateType || 'ecommerce');

  return (
    <Template 
      config={config} 
      featuredProducts={featuredProducts}
      categories={categories}
    />
  );
}

export async function generateStaticParams() {
  try {
    // Generar paths para todos los dominios activos
    const domains = await getActiveDomains();

    return domains.map((domain: string) => ({
      domain,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    // Retornar array vacío si hay error
    return [];
  }
}
