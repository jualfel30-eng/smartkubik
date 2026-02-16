'use client';

import { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface ProductsGridProps {
  products: Product[];
  domain: string;
  onAddToCart?: (product: Product) => void;
  isDarkMode?: boolean;
}

export function ProductsGrid({ products, domain, onAddToCart, isDarkMode = true }: ProductsGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-lg`}>No hay productos disponibles</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          domain={domain}
          onAddToCart={onAddToCart}
          isDarkMode={isDarkMode}
        />
      ))}
    </div>
  );
}
