'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  domain: string;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, domain, onAddToCart }: ProductCardProps) {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  return (
    <Link href={`/${domain}/productos/${product._id}`}>
      <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-gray-100">
          <Image
            src={getImageUrl(product.imageUrl)}
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
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {product.category}
            </p>
          )}

          {/* Name */}
          <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
            {product.name}
          </h3>

          {/* Brand */}
          {product.brand && (
            <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
          )}

          {/* Price & Add to Cart */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-xl font-bold text-gray-900">
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
