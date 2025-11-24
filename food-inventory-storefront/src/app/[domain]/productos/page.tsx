import { getStorefrontConfig, getProducts, getCategories } from '@/lib/api';
import { ProductsPageClient } from './ProductsPageClient';

interface ProductsPageProps {
  params: Promise<{
    domain: string;
  }>;
  searchParams: Promise<{
    page?: string;
    category?: string;
    search?: string;
  }>;
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  // Await params and searchParams (Next.js 15 requirement)
  const { domain } = await params;
  const resolvedSearchParams = await searchParams;

  // Fetch storefront configuration
  const config = await getStorefrontConfig(domain);

  // Extract tenantId as string
  const tenantId: string = typeof config.tenantId === 'string'
    ? config.tenantId
    : (config.tenantId._id as string);

  // Parse query params
  const page = parseInt(resolvedSearchParams.page || '1', 10);
  const category = resolvedSearchParams.category;
  const search = resolvedSearchParams.search;

  // Fetch products with filters
  const productsData = await getProducts(tenantId, {
    page,
    limit: 20,
    category,
    search,
    productType: 'simple',
  });

  // Fetch all categories for filter
  const categories = await getCategories(tenantId);

  return (
    <ProductsPageClient
      config={config}
      productsData={productsData}
      categories={categories}
      currentPage={page}
      currentCategory={category}
      currentSearch={search}
    />
  );
}
