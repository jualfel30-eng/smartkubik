'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StorefrontConfig, Product } from '@/types';
import { Header } from '@/templates/ModernEcommerce/components/Header';
import { Footer } from '@/templates/ModernEcommerce/components/Footer';
import { ProductCard } from '@/templates/ModernEcommerce/components/ProductCard';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { ShoppingCart, Minus, Plus, Package, Tag } from 'lucide-react';

interface ProductDetailClientProps {
  config: StorefrontConfig;
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetailClient({
  config,
  product,
  relatedProducts,
}: ProductDetailClientProps) {
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = () => {
    // Get existing cart from localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if product already in cart
    const existingIndex = cart.findIndex((item: any) => item.product._id === product._id);
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({ product, quantity });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Show feedback
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));

  return (
    <div className="min-h-screen flex flex-col">
      <Header config={config} domain={config.domain} />

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <ol className="flex items-center space-x-2 text-gray-600">
              <li>
                <Link href={`/${config.domain}`} className="hover:text-gray-900">
                  Inicio
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href={`/${config.domain}/productos`} className="hover:text-gray-900">
                  Productos
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900 font-medium">{product.name}</li>
            </ol>
          </nav>

          {/* Product Detail */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-12">
            <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
              {/* Product Image */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={getImageUrl(product.imageUrl)}
                  alt={product.name}
                  width={600}
                  height={600}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>

              {/* Product Info */}
              <div className="flex flex-col">
                {/* Category & SKU */}
                <div className="flex items-center gap-4 mb-4">
                  {product.category && (
                    <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      <Tag className="h-4 w-4 mr-1" />
                      {product.category}
                    </span>
                  )}
                  <span className="inline-flex items-center text-gray-500 text-sm">
                    <Package className="h-4 w-4 mr-1" />
                    SKU: {product.sku}
                  </span>
                </div>

                {/* Name */}
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h1>

                {/* Brand */}
                {product.brand && (
                  <p className="text-lg text-gray-600 mb-4">
                    Marca: <span className="font-medium">{product.brand}</span>
                  </p>
                )}

                {/* Price */}
                <div className="mb-6">
                  <p className="text-4xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </p>
                </div>

                {/* Description */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Descripción
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={decrementQuantity}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="text-xl font-semibold w-12 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={incrementQuantity}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!product.isActive}
                  className="w-full flex items-center justify-center px-8 py-4 bg-[var(--primary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {addedToCart ? '¡Agregado al carrito!' : 'Agregar al carrito'}
                </button>

                {!product.isActive && (
                  <p className="mt-4 text-red-600 text-center font-medium">
                    Producto no disponible
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
                Productos Relacionados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct._id}
                    product={relatedProduct}
                    domain={config.domain}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer config={config} domain={config.domain} />
    </div>
  );
}
