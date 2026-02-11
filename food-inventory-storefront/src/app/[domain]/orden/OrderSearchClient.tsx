'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StorefrontConfig } from '@/types';
import { getTemplateComponents } from '@/lib/getTemplateComponents';
import { Search, Package } from 'lucide-react';

interface OrderSearchClientProps {
  config: StorefrontConfig;
}

export function OrderSearchClient({ config }: OrderSearchClientProps) {
  const { Header, Footer } = getTemplateComponents(config.templateType);
  const isPremium = config.templateType === 'premium';
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(isPremium);

  const primaryColor = config.theme?.primaryColor || '#6366f1';
  const secondaryColor = config.theme?.secondaryColor || '#ec4899';

  useEffect(() => {
    const stored = localStorage.getItem('storefront_theme');
    if (stored) {
      const val = stored === 'dark';
      setIsDarkMode(val);
      document.documentElement.classList.toggle('dark', val);
      return;
    }
    if (isPremium) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, [isPremium]);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('storefront_theme', next ? 'dark' : 'light');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber.trim()) {
      return;
    }

    setLoading(true);
    router.push(`/${config.domain}/orden/${orderNumber.trim()}`);
  };

  // Theme-aware classes
  const pageBg = isPremium
    ? (isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50')
    : (isDarkMode ? 'bg-gray-950' : 'bg-white');
  const mainBg = isPremium
    ? (isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50')
    : (isDarkMode ? 'bg-gray-950' : 'bg-gray-50');
  const cardBg = isPremium
    ? (isDarkMode ? 'bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl' : 'bg-white rounded-2xl shadow-sm border border-gray-100')
    : (isDarkMode ? 'bg-gray-900 border border-gray-800 rounded-lg' : 'bg-white rounded-lg shadow-sm');
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const textSub = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const inputCls = isPremium
    ? (isDarkMode
      ? 'border-white/10 bg-white/5 text-gray-100 placeholder-gray-500 rounded-xl focus:border-white/20 focus:ring-white/10'
      : 'border-gray-200 bg-white text-gray-900 rounded-xl')
    : (isDarkMode
      ? 'border-gray-700 bg-gray-800 text-gray-100 rounded-lg'
      : 'border-gray-300 rounded-lg');
  const helpBg = isPremium
    ? (isDarkMode ? 'bg-blue-500/10 border border-blue-400/20 rounded-2xl' : 'bg-blue-50 border border-blue-200 rounded-2xl')
    : (isDarkMode ? 'bg-blue-900/30 border border-blue-800 rounded-lg' : 'bg-blue-50 border border-blue-200 rounded-lg');

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
      <Header config={config} domain={config.domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      <main className={`flex-1 ${mainBg} ${isPremium ? 'pt-16' : ''}`}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 text-white ${isPremium ? 'rounded-2xl' : 'rounded-full'} mb-4`}
              style={isPremium ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : { backgroundColor: 'var(--primary-color)' }}
            >
              <Package className="h-8 w-8" />
            </div>
            {isPremium && isDarkMode ? (
              <>
                <h1
                  className="text-3xl md:text-4xl font-bold mb-4"
                  style={{
                    background: `linear-gradient(135deg, #fff 0%, ${primaryColor} 50%, ${secondaryColor} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Rastrea tu Pedido
                </h1>
                <div className="w-16 h-1 rounded-full mx-auto mb-4" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
              </>
            ) : (
              <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${textMain}`}>
                Rastrea tu Pedido
              </h1>
            )}
            <p className={`text-lg ${textMuted}`}>
              Ingresa tu número de orden para ver el estado de tu pedido
            </p>
          </div>

          {/* Search Form */}
          <div className={`${cardBg} p-8`}>
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label
                  htmlFor="orderNumber"
                  className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
                >
                  Número de Orden
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className={`h-5 w-5 ${textSub}`} />
                  </div>
                  <input
                    type="text"
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="ej: ORD-2024-001"
                    className={`block w-full pl-10 pr-4 py-3 border focus:outline-none focus:ring-2 text-lg ${inputCls}`}
                    required
                  />
                </div>
                <p className={`mt-2 text-sm ${textSub}`}>
                  El número de orden se encuentra en el correo de confirmación
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !orderNumber.trim()}
                className={`w-full flex items-center justify-center px-6 py-3 text-white font-semibold ${isPremium ? 'rounded-xl hover:shadow-xl' : 'rounded-lg'} hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                style={isPremium ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : { backgroundColor: 'var(--primary-color)' }}
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
          <div className={`mt-12 ${helpBg} p-6`}>
            <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>¿No encuentras tu número de orden?</h3>
            <p className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
              El número de orden fue enviado a tu correo electrónico después de realizar la compra.
              Si no lo encuentras, revisa tu carpeta de spam o contacta con nuestro equipo de soporte.
            </p>
          </div>
        </div>
      </main>

      <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
    </div>
  );
}
