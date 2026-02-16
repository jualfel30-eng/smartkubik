'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StorefrontConfig, CartItem } from '@/types';
import { getTemplateComponents } from '@/lib/getTemplateComponents';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';

interface CartPageClientProps {
  config: StorefrontConfig;
}

export function CartPageClient({ config }: CartPageClientProps) {
  const { Header, Footer } = getTemplateComponents(config.templateType);
  const isPremium = config.templateType === 'premium';
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(cart);
    setLoading(false);
  }, []);

  const updateCart = (newCart: CartItem[]) => {
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const updateQuantity = (productId: string, delta: number) => {
    const newCart = cartItems.map((item) => {
      if (item.product._id === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });
    updateCart(newCart);
  };

  const removeItem = (productId: string) => {
    updateCart(cartItems.filter((item) => item.product._id !== productId));
  };

  const clearCart = () => updateCart([]);

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const goToCheckout = () => router.push(`/${config.domain}/checkout`);

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
  const imgBg = isPremium ? (isDarkMode ? 'bg-white/5' : 'bg-gray-100') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-100');
  const qtyBtnCls = isPremium
    ? (isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')
    : (isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50');
  const borderCls = isDarkMode ? (isPremium ? 'border-white/10' : 'border-gray-800') : 'border-gray-200';

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col ${pageBg}`}>
        <Header config={config} domain={config.domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
        <main className={`flex-1 flex items-center justify-center ${mainBg}`}>
          <p className={textMuted}>Cargando carrito...</p>
        </main>
        <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
      <Header config={config} domain={config.domain} cartItemsCount={cartItems.length} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      <main className={`flex-1 ${mainBg} ${isPremium ? 'pt-16' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            {isPremium && isDarkMode ? (
              <>
                <h1
                  className="text-3xl md:text-4xl font-bold mb-2"
                  style={{
                    background: `linear-gradient(135deg, #fff 0%, ${primaryColor} 50%, ${secondaryColor} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Carrito de Compras
                </h1>
                <div className="w-16 h-1 rounded-full mt-3 mb-2" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
              </>
            ) : (
              <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${textMain}`}>Carrito de Compras</h1>
            )}
            <p className={textMuted}>
              {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'} en tu carrito
            </p>
          </div>

          {cartItems.length === 0 ? (
            <div className={`${cardBg} p-12 text-center`}>
              <ShoppingBag className={`h-16 w-16 mx-auto mb-4 ${textSub}`} />
              <h2 className={`text-2xl font-semibold mb-2 ${textMain}`}>Tu carrito está vacío</h2>
              <p className={`${textMuted} mb-8`}>Agrega productos para comenzar tu compra</p>
              <Link
                href={`/${config.domain}/productos`}
                className={`inline-block px-8 py-3 text-white font-semibold ${isPremium ? 'rounded-xl hover:shadow-xl' : 'rounded-lg'} hover:opacity-90 transition-all`}
                style={isPremium ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : { backgroundColor: 'var(--primary-color)' }}
              >
                Ver productos
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map((item) => (
                  <div key={item.product._id} className={`${cardBg} p-4 md:p-6`}>
                    <div className="flex gap-4">
                      <Link href={`/${config.domain}/productos/${item.product._id}`} className="flex-shrink-0">
                        <div className={`w-24 h-24 ${isPremium ? 'rounded-xl' : 'rounded-lg'} overflow-hidden ${imgBg}`}>
                          <Image
                            src={getImageUrl(item.product.imageUrl)}
                            alt={item.product.name}
                            width={96}
                            height={96}
                            unoptimized
                            className="object-cover w-full h-full"
                          />
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link href={`/${config.domain}/productos/${item.product._id}`}>
                          <h3 className={`font-semibold mb-1 ${textMain} hover:text-[var(--primary-color)] transition`}>{item.product.name}</h3>
                        </Link>
                        {item.product.category && <p className={`text-sm mb-2 ${textSub}`}>{item.product.category}</p>}
                        <p className="text-lg font-bold" style={isPremium ? { color: primaryColor } : undefined}>
                          {isPremium ? formatPrice(item.product.price) : <span className={textMain}>{formatPrice(item.product.price)}</span>}
                        </p>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => removeItem(item.product._id)}
                          className={`p-2 rounded-lg transition ${isDarkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                          title="Eliminar"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>

                        <div className="flex items-center space-x-2">
                          <button onClick={() => updateQuantity(item.product._id, -1)} className={`p-1 border rounded ${qtyBtnCls}`}>
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className={`w-8 text-center font-semibold ${textMain}`}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product._id, 1)} className={`p-1 border rounded ${qtyBtnCls}`}>
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={clearCart}
                  className={`font-medium text-sm ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                >
                  Vaciar carrito
                </button>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className={`${cardBg} p-6 sticky top-24`}>
                  <h2 className={`text-xl font-bold mb-6 ${textMain}`}>Resumen de Compra</h2>

                  <div className="space-y-3 mb-6">
                    <div className={`flex justify-between ${textMuted}`}>
                      <span>Subtotal</span>
                      <span>{formatPrice(calculateSubtotal())}</span>
                    </div>
                    <div className={`flex justify-between ${textMuted}`}>
                      <span>Envío</span>
                      <span>A calcular</span>
                    </div>
                    <div className={`border-t ${borderCls} pt-3`}>
                      <div className={`flex justify-between text-lg font-bold ${textMain}`}>
                        <span>Total</span>
                        <span>{formatPrice(calculateSubtotal())}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={goToCheckout}
                    className={`w-full px-6 py-4 text-white font-semibold ${isPremium ? 'rounded-xl hover:shadow-xl' : 'rounded-lg'} hover:opacity-90 transition-all`}
                    style={isPremium ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : { backgroundColor: 'var(--primary-color)' }}
                  >
                    Proceder al Checkout
                  </button>

                  <Link
                    href={`/${config.domain}/productos`}
                    className={`block text-center mt-4 ${textMuted} transition`}
                  >
                    Continuar comprando
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
    </div>
  );
}
