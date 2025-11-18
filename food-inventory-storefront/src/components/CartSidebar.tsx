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
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
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
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Carrito ({cartItems.length})
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-full transition"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium mb-2">Tu carrito está vacío</p>
              <p className="text-sm text-gray-500 mb-4">
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
                className="flex gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                {/* Product Image */}
                <div className="relative w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                  {item.product.images && item.product.images.length > 0 ? (
                    <Image
                      src={getImageUrl(item.product.images[0])}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <ShoppingCart className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm mb-1 truncate">
                    {item.product.name}
                  </h3>
                  <p className="text-sm font-semibold text-[var(--primary-color)] mb-2">
                    {formatPrice(item.product.price)}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product._id, -1)}
                      className="p-1 rounded hover:bg-white transition"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4 text-gray-600" />
                    </button>
                    <span className="text-sm font-medium min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product._id, 1)}
                      className="p-1 rounded hover:bg-white transition"
                    >
                      <Plus className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product._id)}
                      className="ml-auto p-1 rounded hover:bg-red-50 transition"
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
          <div className="border-t bg-white p-4 space-y-4">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-lg font-semibold">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-gray-900">{formatPrice(calculateTotal())}</span>
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
                className="block w-full py-3 bg-gray-100 text-gray-900 text-center font-medium rounded-lg hover:bg-gray-200 transition"
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
