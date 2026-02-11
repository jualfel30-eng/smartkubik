'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StorefrontConfig } from '@/types';
import { getTemplateComponents } from '@/lib/getTemplateComponents';
import { Search, Package } from 'lucide-react';

interface OrderSearchClientProps {
  config: StorefrontConfig;
}

export function OrderSearchClient({ config }: OrderSearchClientProps) {
  const { Header, Footer } = getTemplateComponents(config.templateType);
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber.trim()) {
      return;
    }

    setLoading(true);
    // Navigate to the tracking page
    router.push(`/${config.domain}/orden/${orderNumber.trim()}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header config={config} domain={config.domain} />

      <main className="flex-1 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--primary-color)] text-white rounded-full mb-4">
              <Package className="h-8 w-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Rastrea tu Pedido
            </h1>
            <p className="text-lg text-gray-600">
              Ingresa tu número de orden para ver el estado de tu pedido
            </p>
          </div>

          {/* Search Form */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label
                  htmlFor="orderNumber"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Número de Orden
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="ej: ORD-2024-001"
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent text-lg"
                    required
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  El número de orden se encuentra en el correo de confirmación
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !orderNumber.trim()}
                className="w-full flex items-center justify-center px-6 py-3 bg-[var(--primary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Rastrear Pedido
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Help Section */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">¿No encuentras tu número de orden?</h3>
            <p className="text-sm text-blue-700">
              El número de orden fue enviado a tu correo electrónico después de realizar la compra.
              Si no lo encuentras, revisa tu carpeta de spam o contacta con nuestro equipo de soporte.
            </p>
          </div>
        </div>
      </main>

      <Footer config={config} domain={config.domain} />
    </div>
  );
}
