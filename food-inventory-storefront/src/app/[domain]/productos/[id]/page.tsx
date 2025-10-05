import { notFound } from 'next/navigation';
import { getStorefrontConfig, getProductById, getProducts } from '@/lib/api';
import { ProductDetailClient } from './ProductDetailClient';

interface ProductDetailPageProps {
  params: {
    domain: string;
    id: string;
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  try {
    // Fetch storefront configuration
    const config = await getStorefrontConfig(params.domain);

    // Fetch product details
    const product = await getProductById(params.id, config.tenantId);

    if (!product) {
      notFound();
    }

    // Fetch related products (same category)
    const { data: relatedProducts } = await getProducts(config.tenantId, {
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
