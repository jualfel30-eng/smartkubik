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

export function ProductCard({ product, domain, onAddToCart, isDarkMode = true }: ProductCardProps) {
  const { openCart } = useCart();

  const primaryColor = 'var(--primary-color, #6366f1)';
  const secondaryColor = 'var(--secondary-color, #ec4899)';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onAddToCart) {
      onAddToCart(product);
      return;
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingIndex = cart.findIndex((item: any) => item.product._id === product._id);

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({ product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    openCart();
  };

  return (
    <Link href={`/${domain}/productos/${product._id}`}>
      <div className={`group relative rounded-2xl border overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${
        isDarkMode
          ? 'bg-white/[0.03] backdrop-blur-xl border-white/10 hover:bg-white/[0.07] hover:border-white/20 hover:shadow-white/5'
          : 'bg-white border-gray-200 shadow-sm hover:shadow-lg'
      }`}>
        {/* Image */}
        <div className={`relative h-64 overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
          <Image
            src={getImageUrl((product as any).imageUrl || (product as any).image)}
            alt={product.name}
            fill
            unoptimized
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-t from-[#0a0a1a]/60 to-transparent' : 'bg-gradient-to-t from-white/20 to-transparent'}`} />
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Category */}
          {product.category && (
            <span
              className="inline-block text-xs px-2.5 py-1 rounded-full font-medium mb-3"
              style={{ background: `${primaryColor}15`, color: primaryColor } as any}
            >
              {product.category}
            </span>
          )}

          {/* Name */}
          <h3 className={`text-base font-bold mb-2 line-clamp-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {product.name}
          </h3>

          {/* Brand */}
          {product.brand && (
            <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{product.brand}</p>
          )}

          {/* Price & Add to Cart */}
          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="text-xl font-bold" style={{ color: primaryColor } as any}>
              {formatPrice(product.price)}
            </span>
            <button
              onClick={handleAddToCart}
              className="p-2.5 rounded-xl text-white transition-all duration-300 hover:shadow-lg hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } as any}
              title="Agregar al carrito"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Badge if not active */}
        {!product.isActive && (
          <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
            No disponible
          </div>
        )}
      </div>
    </Link>
  );
}
