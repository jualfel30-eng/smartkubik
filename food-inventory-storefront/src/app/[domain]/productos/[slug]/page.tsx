import { getStorefrontConfig } from '@/lib/api';

export const revalidate = 60; // ISR: Revalidar cada 60 segundos

interface ProductPageProps {
  params: Promise<{ domain: string; slug: string }>;
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { domain, slug } = await params;
  const config = await getStorefrontConfig(domain);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Producto: {slug}
          </h1>
          <p className="text-gray-600 mb-6">
            Tienda: {config.name}
          </p>
          <div className="border-t pt-6">
            <p className="text-gray-500">
              Esta página mostrará los detalles del producto cuando se implemente
              la integración con el backend.
            </p>
          </div>
          <div className="mt-8">
            <a
              href={`/${domain}`}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Volver a la tienda
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
