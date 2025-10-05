import { getStorefrontConfig, getProducts, getCategories } from '@/lib/api';
import { ProductsPageClient } from './ProductsPageClient';

interface ProductsPageProps {
  params: {
    domain: string;
  };
  searchParams: {
    page?: string;
    category?: string;
    search?: string;
  };
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  // Fetch storefront configuration
  const config = await getStorefrontConfig(params.domain);

  // Parse query params
  const page = parseInt(searchParams.page || '1', 10);
  const category = searchParams.category;
  const search = searchParams.search;

  // Fetch products with filters
  const productsData = await getProducts(config.tenantId, {
    page,
    limit: 20,
    category,
    search,
  });

  // Fetch all categories for filter
  const categories = await getCategories(config.tenantId);

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
