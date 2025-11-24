'use client';

import { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface ProductsGridProps {
  products: Product[];
  domain: string;
  onAddToCart?: (product: Product) => void;
  isDarkMode?: boolean;
}

export function ProductsGrid({ products, domain, onAddToCart, isDarkMode = false }: ProductsGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-lg`}>No hay productos disponibles</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
