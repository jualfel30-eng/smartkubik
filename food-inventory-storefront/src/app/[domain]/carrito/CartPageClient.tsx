'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StorefrontConfig, CartItem } from '@/types';
import { Header } from '@/templates/ModernEcommerce/components/Header';
import { Footer } from '@/templates/ModernEcommerce/components/Footer';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';

interface CartPageClientProps {
  config: StorefrontConfig;
}

export function CartPageClient({ config }: CartPageClientProps) {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load cart from localStorage
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
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    updateCart(newCart);
  };

  const removeItem = (productId: string) => {
    const newCart = cartItems.filter((item) => item.product._id !== productId);
    updateCart(newCart);
  };

  const clearCart = () => {
    updateCart([]);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const goToCheckout = () => {
    router.push(`/${config.domain}/checkout`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header config={config} domain={config.domain} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-600">Cargando carrito...</p>
        </main>
        <Footer config={config} domain={config.domain} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header config={config} domain={config.domain} cartItemsCount={cartItems.length} />

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Carrito de Compras
            </h1>
            <p className="text-gray-600">
              {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'} en tu carrito
            </p>
          </div>

          {cartItems.length === 0 ? (
            /* Empty Cart */
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Tu carrito está vacío
              </h2>
              <p className="text-gray-600 mb-8">
                Agrega productos para comenzar tu compra
              </p>
              <Link
                href={`/${config.domain}/productos`}
                className="inline-block px-8 py-3 bg-[var(--primary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition"
              >
                Ver productos
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.product._id}
                    className="bg-white rounded-lg shadow-sm p-4 md:p-6"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link
                        href={`/${config.domain}/productos/${item.product._id}`}
                        className="flex-shrink-0"
                      >
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={getImageUrl(item.product.imageUrl)}
                            alt={item.product.name}
                            width={96}
                            height={96}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/${config.domain}/productos/${item.product._id}`}
                          className="block"
                        >
                          <h3 className="font-semibold text-gray-900 mb-1 hover:text-[var(--primary-color)] transition">
                            {item.product.name}
                          </h3>
                        </Link>
                        {item.product.category && (
                          <p className="text-sm text-gray-500 mb-2">
                            {item.product.category}
                          </p>
                        )}
                        <p className="text-lg font-bold text-gray-900">
                          {formatPrice(item.product.price)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => removeItem(item.product._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.product._id, -1)}
                            className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product._id, 1)}
                            className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Clear Cart Button */}
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Vaciar carrito
                </button>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Resumen de Compra
                  </h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatPrice(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Envío</span>
                      <span>A calcular</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold text-gray-900">
                        <span>Total</span>
                        <span>{formatPrice(calculateSubtotal())}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={goToCheckout}
                    className="w-full px-6 py-4 bg-[var(--primary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition"
                  >
                    Proceder al Checkout
                  </button>

                  <Link
                    href={`/${config.domain}/productos`}
                    className="block text-center mt-4 text-gray-600 hover:text-gray-900 transition"
                  >
                    Continuar comprando
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer config={config} domain={config.domain} />
    </div>
  );
}
