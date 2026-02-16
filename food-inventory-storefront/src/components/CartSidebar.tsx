'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { CartItem } from '@/types';
import { formatPrice, getImageUrl } from '@/lib/utils';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
}

export function CartSidebar({ isOpen, onClose, domain }: CartSidebarProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Load cart from localStorage
    const loadCart = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartItems(cart);
    };

    loadCart();

    // Listen for storage events (cart updates from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cart') {
        loadCart();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Custom event for same-tab updates
    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  // Sync theme with the rest of the site
  useEffect(() => {
    const stored = localStorage.getItem('storefront_theme');
    if (stored) {
      const val = stored === 'dark';
      setIsDarkMode(val);
      document.documentElement.classList.toggle('dark', val);
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const updateCart = (newCart: CartItem[]) => {
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('cartUpdated'));
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

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = item.unitPrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-96 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2">
            <ShoppingCart className={`h-5 w-5 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`} />
            <h2 className="text-lg font-semibold">
              Carrito ({cartItems.length})
            </h2>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-full transition ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
          >
            <X className={`h-5 w-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <ShoppingCart className={`h-16 w-16 mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-300'}`} />
              <p className={`font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Tu carrito está vacío</p>
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Agrega productos para comenzar tu compra
              </p>
              <Link
                href={`/${domain}/productos`}
                onClick={handleClose}
                className="inline-flex items-center gap-2 px-6 py-2 bg-[var(--primary-color)] text-white rounded-lg hover:opacity-90 transition"
              >
                Ver Productos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.product._id}
                className={`flex gap-4 p-3 rounded-lg transition ${isDarkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                {/* Product Image */}
                <div className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                  <Image
                    src={getImageUrl(
                      (item.product as any).image ||
                        (item.product as any).imageUrl ||
                        (item.product as any).images?.[0]
                    )}
                    alt={item.product.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium text-sm mb-1 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {item.product.name}
                  </h3>
                  <p className="text-sm font-semibold text-[var(--primary-color)] mb-2">
                    {formatPrice(item.unitPrice || item.product.price)}
                    {item.selectedUnit && <span className="text-xs ml-1">/{item.selectedUnit}</span>}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product._id, -1)}
                      className={`p-1 rounded transition ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-white text-gray-700'}`}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className={`h-4 w-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                    </button>
                    <span className={`text-sm font-medium min-w-[2rem] text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {item.quantity}{item.selectedUnit ? ` ${item.selectedUnit}` : ''}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product._id, 1)}
                      className={`p-1 rounded transition ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-white text-gray-700'}`}
                    >
                      <Plus className={`h-4 w-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                    </button>
                    <button
                      onClick={() => removeItem(item.product._id)}
                      className={`ml-auto p-1 rounded transition ${isDarkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Total and Checkout */}
        {cartItems.length > 0 && (
          <div className={`p-4 space-y-4 border-t ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}>
            {/* Subtotal */}
            <div className="flex items-center justify-between text-lg font-semibold">
              <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>Subtotal</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{formatPrice(calculateTotal())}</span>
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              <Link
                href={`/${domain}/checkout`}
                onClick={handleClose}
                className="block w-full py-3 bg-[var(--primary-color)] text-white text-center font-semibold rounded-lg hover:opacity-90 transition"
              >
                Proceder al Pago
              </Link>
              <Link
                href={`/${domain}/carrito`}
                onClick={handleClose}
                className={`block w-full py-3 text-center font-medium rounded-lg transition ${
                  isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-750' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                Ver Carrito Completo
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
