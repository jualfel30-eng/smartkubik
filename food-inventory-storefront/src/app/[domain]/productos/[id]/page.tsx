import { notFound } from 'next/navigation';
import { getStorefrontConfig, getProductById, getProducts } from '@/lib/api';
import { ProductDetailClient } from './ProductDetailClient';

interface ProductDetailPageProps {
  params: Promise<{
    domain: string;
    id: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  try {
    const { domain, id } = await params;

    // Fetch storefront configuration
    const config = await getStorefrontConfig(domain);

    // Extract tenantId
    const tenantId: string = typeof config.tenantId === 'string'
      ? config.tenantId
      : (config.tenantId._id as string);

    // Fetch product details
    const product = await getProductById(id, tenantId);

    if (!product) {
      notFound();
    }

    // Fetch related products (same category)
    const { data: relatedProducts } = await getProducts(tenantId, {
      category: product.category,
      limit: 4,
    });

    // Filter out current product from related
    const filteredRelated = relatedProducts.filter((p) => p._id !== product._id);

    return (
      <ProductDetailClient
        config={config}
        product={product}
        relatedProducts={filteredRelated}
      />
    );
  } catch (error) {
    notFound();
  }
}
