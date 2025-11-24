'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: Product;
  domain: string;
  onAddToCart?: (product: Product) => void;
  isDarkMode?: boolean;
}

export function ProductCard({ product, domain, onAddToCart, isDarkMode = false }: ProductCardProps) {
  const { openCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If custom handler provided, use it (for backward compatibility)
    if (onAddToCart) {
      onAddToCart(product);
      return;
    }

    // Default behavior: add to localStorage cart and open sidebar
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingIndex = cart.findIndex((item: any) => item.product._id === product._id);

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({ product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));

    // Dispatch custom event for cart updates
    window.dispatchEvent(new Event('cartUpdated'));

    // Open cart sidebar
    openCart();
  };

  return (
    <Link href={`/${domain}/productos/${product._id}`}>
      <div className={`group relative rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}>
        {/* Image */}
        <div className={`aspect-square overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <Image
            src={getImageUrl((product as any).imageUrl || (product as any).image)}
            alt={product.name}
            width={400}
            height={400}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Category */}
          {product.category && (
            <p className={`text-xs uppercase tracking-wide mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {product.category}
            </p>
          )}

          {/* Name */}
          <h3 className={`text-base font-semibold mb-2 line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {product.name}
          </h3>

          {/* Brand */}
          {product.brand && (
            <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{product.brand}</p>
          )}

          {/* Price & Add to Cart */}
          <div className="flex items-center justify-between mt-4">
            <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatPrice(product.price)}
            </p>
            <button
              onClick={handleAddToCart}
              className="p-2 bg-[var(--primary-color)] text-white rounded-lg hover:opacity-90 transition"
              title="Agregar al carrito"
            >
              <ShoppingCart className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Badge if not active */}
        {!product.isActive && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            No disponible
          </div>
        )}
      </div>
    </Link>
  );
}
