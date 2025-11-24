'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StorefrontConfig, Product } from '@/types';
import { Header } from '@/templates/ModernEcommerce/components/Header';
import { Footer } from '@/templates/ModernEcommerce/components/Footer';
import { ProductCard } from '@/templates/ModernEcommerce/components/ProductCard';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { ShoppingCart, Minus, Plus, Package, Tag, Leaf } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

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
  const { openCart } = useCart();
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('storefront_theme', next ? 'dark' : 'light');
  };

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

    // Dispatch custom event for cart updates
    window.dispatchEvent(new Event('cartUpdated'));

    // Show feedback briefly, then open cart sidebar
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      openCart();
    }, 500);
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>
      <Header config={config} domain={config.domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      <main className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <ol className={`flex items-center space-x-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>
                <Link href={`/${config.domain}`} className={`${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'}`}>
                  Inicio
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href={`/${config.domain}/productos`} className={`${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'}`}>
                  Productos
                </Link>
              </li>
              <li>/</li>
              <li className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{product.name}</li>
            </ol>
          </nav>

          {/* Product Detail */}
          <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm overflow-hidden mb-12`}>
            <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
              {/* Product Image */}
              <div className={`aspect-square rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <Image
                  src={getImageUrl((product as any).imageUrl || (product as any).image)}
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
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                      <Tag className="h-4 w-4 mr-1" />
                      {product.category}
                    </span>
                  )}
                  <span className={`inline-flex items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Package className="h-4 w-4 mr-1" />
                    SKU: {product.sku}
                  </span>
                </div>

                {/* Name */}
                <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.name}
                </h1>

                {/* Brand */}
                {product.brand && (
                  <p className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Marca: <span className="font-medium">{product.brand}</span>
                  </p>
                )}

                {/* Price */}
                <div className="mb-6">
                  <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatPrice(product.price)}
                  </p>
                </div>

                {/* Description */}
                <div className="mb-8">
                  <h2 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Descripción
                  </h2>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                    {product.description}
                  </p>
                </div>

                {/* Ingredients */}
                {product.ingredients && (
                  <div className="mb-8">
                    <h2 className={`text-lg font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Leaf className="h-5 w-5 text-green-500" />
                      Ingredientes
                    </h2>
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                      {product.ingredients}
                    </p>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Cantidad
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={decrementQuantity}
                      className={`p-2 border rounded-lg ${isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className={`text-xl font-semibold w-12 text-center ${isDarkMode ? 'text-white' : ''}`}>
                      {quantity}
                    </span>
                    <button
                      onClick={incrementQuantity}
                      className={`p-2 border rounded-lg ${isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
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
              <h2 className={`text-2xl md:text-3xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Productos Relacionados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct._id}
                    product={relatedProduct}
                    domain={config.domain}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
    </div>
  );
}
