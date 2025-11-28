import { getStorefrontConfig, getActiveDomains, getProducts, getCategories } from '@/lib/api';
import { getTemplate } from '@/lib/templateFactory';

// Forzar renderizado dinámico en cada request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface StorefrontPageProps {
  params: Promise<{ domain: string }>;
}

export default async function StorefrontPage({
  params,
}: StorefrontPageProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);

  // Extract tenantId as string (could be object or string from backend)
  const tenantId: string = typeof config.tenantId === 'string'
    ? config.tenantId
    : (config.tenantId._id as string);

  // Fetch featured products (first 8)
  const { data: featuredProducts } = await getProducts(tenantId, {
    limit: 8,
    page: 1,
    productType: 'simple',
  });

  // Fetch categories
  const categories = await getCategories(tenantId);

  // Get the appropriate template
  const Template = getTemplate(config.templateType || 'ecommerce');

  return (
    <Template
      config={config as any}
      featuredProducts={featuredProducts}
      categories={categories}
      domain={domain}
    />
  );
}

// Deshabilitado para permitir rendering 100% dinámico
// Con dynamic = 'force-dynamic', Next.js renderizará cada página bajo demanda
// en lugar de pre-generarlas durante el build
/*
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
*/
