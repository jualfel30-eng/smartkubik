'use client';

import Link from 'next/link';
import { Product } from '@/types';
import { ProductsGrid } from './ProductsGrid';
import { ArrowRight } from 'lucide-react';

interface FeaturedProductsProps {
  products: Product[];
  domain: string;
  onAddToCart?: (product: Product) => void;
}

export function FeaturedProducts({ products, domain, onAddToCart }: FeaturedProductsProps) {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Productos Destacados
            </h2>
            <p className="text-gray-600">
              Descubre nuestra selección especial de productos
            </p>
          </div>
          <Link
            href={`/${domain}/productos`}
            className="hidden md:inline-flex items-center text-[var(--primary-color)] font-semibold hover:underline"
          >
            Ver todos
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

        {/* Products Grid */}
        <ProductsGrid
          products={products}
          domain={domain}
          onAddToCart={onAddToCart}
        />

        {/* Mobile "Ver todos" button */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href={`/${domain}/productos`}
            className="inline-flex items-center text-[var(--primary-color)] font-semibold hover:underline"
          >
            Ver todos los productos
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
