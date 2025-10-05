'use client';

import { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface ProductsGridProps {
  products: Product[];
  domain: string;
  onAddToCart?: (product: Product) => void;
}

export function ProductsGrid({ products, domain, onAddToCart }: ProductsGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No hay productos disponibles</p>
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
        />
      ))}
    </div>
  );
}
