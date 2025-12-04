'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StorefrontConfig } from '@/types';
import { Header } from './ModernEcommerce/components/Header';
import { Footer } from './ModernEcommerce/components/Footer';
import { getImageUrl } from '@/lib/utils';

interface ModernEcommerceProps {
  config: StorefrontConfig;
  featuredProducts?: any[];
  categories?: string[];
  domain?: string;
}

export default function ModernEcommerce({ config, featuredProducts = [], categories: propCategories = [], domain }: ModernEcommerceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // Preferencia inicial: localStorage o media query
    const stored = localStorage.getItem('storefront_theme');
    if (stored) {
      setIsDarkMode(stored === 'dark');
      document.documentElement.classList.toggle('dark', stored === 'dark');
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

  // Usar productos pasados como prop o los del config como fallback
  const products = featuredProducts.length > 0 ? featuredProducts : ((config as any).products || []);

  // Obtener categorías únicas de los productos
  const categories = propCategories.length > 0
    ? ['all', ...propCategories]
    : (products.length > 0 ? ['all', ...new Set(products.map((p: any) => p.category))] : ['all']);

  // Filtrar productos por categoría
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((p: any) => p.category === selectedCategory);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900'}`}>
      {/* Header */}
      <Header
        config={config}
        domain={domain || config.domain}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Hero Section */}
      <section id="inicio" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className={`text-5xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Bienvenido a {config.seo?.title || config.domain}
            </h2>
            {config.seo?.description && (
              <p className={`text-xl mb-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {config.seo.description}
              </p>
            )}
            <div className="flex justify-center space-x-4">
              <a
                href={`/${config.domain}/productos`}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Ver Productos
              </a>
              <a
                href="#contacto"
                className={`px-8 py-4 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl border ${isDarkMode ? 'bg-gray-900 text-gray-100 border-gray-700 hover:bg-gray-800' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
              >
                Contáctanos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`py-16 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="container mx-auto px-4">
          <h3 className={`text-3xl font-bold text-center mb-12 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            ¿Por qué elegirnos?
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2">
                Calidad Garantizada
              </h4>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Productos de la más alta calidad para tu satisfacción
              </p>
            </div>
            <div className="text-center p-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Entrega Rápida
              </h4>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Recibe tus productos en tiempo récord
              </p>
            </div>
            <div className="text-center p-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Atención Personalizada
              </h4>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Soporte dedicado para todas tus necesidades
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="productos" className={`py-16 ${isDarkMode ? 'bg-gray-950' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
        <div className="container mx-auto px-4">
          <h3 className={`text-4xl font-bold text-center mb-12 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Nuestros Productos
          </h3>

          {/* Category Filters */}
          {products && products.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {(categories as string[]).map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-lg'
                      : `${isDarkMode ? 'bg-gray-900 text-gray-200 hover:bg-gray-800 shadow' : 'bg-white text-gray-700 hover:bg-gray-100 shadow'}`
                  }`}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </button>
              ))}
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product: any) => (
                <div 
                  key={product._id} 
                  className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1`}
                >
                  {product.image && (
                    <div className={`relative h-64 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                      <Image
                        src={getImageUrl((product as any).image || (product as any).imageUrl)}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                    <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-bold">
                        {product.name}
                      </h4>
                      <span className={`${isDarkMode ? 'bg-blue-900/40 text-blue-200' : 'bg-blue-100 text-blue-800'} text-sm px-3 py-1 rounded-full font-medium`}>
                        {product.category}
                      </span>
                    </div>
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 line-clamp-2`}>
                      {product.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-3xl font-bold text-blue-600">
                          ${product.price?.toFixed(2)}
                        </span>
                        {product.stock !== undefined && (
                          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
                          </p>
                        )}
                      </div>
                      {domain && product.stock > 0 ? (
                        <Link
                          href={`/${domain}/productos/${product._id}`}
                          className="px-6 py-3 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl inline-block"
                        >
                          Ver detalles
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="px-6 py-3 rounded-lg font-semibold transition-colors bg-gray-300 text-gray-500 cursor-not-allowed"
                        >
                          Agotado
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-lg`}>
                No hay productos disponibles en esta categoría
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className={`py-16 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white'}`}>
        <div className="container mx-auto px-4 max-w-4xl">
          <h3 className={`text-4xl font-bold text-center mb-12 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Contáctanos
          </h3>
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h4 className="text-2xl font-semibold mb-6">Información</h4>
              <div className="space-y-4">
                {config.contactInfo?.phone && (
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">📞</span>
                    <div>
                      <p className="font-medium">Teléfono</p>
                      <a href={`tel:${config.contactInfo.phone}`} className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'}`}>
                        {config.contactInfo.phone}
                      </a>
                    </div>
                  </div>
                )}
                {config.contactInfo?.email && (
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">✉️</span>
                    <div>
                      <p className="font-medium">Email</p>
                      <a href={`mailto:${config.contactInfo.email}`} className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'}`}>
                        {config.contactInfo.email}
                      </a>
                    </div>
                  </div>
                )}
                {config.contactInfo?.address && (
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">📍</span>
                    <div>
                      <p className="font-medium">Dirección</p>
                      <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                        {typeof config.contactInfo.address === 'string'
                          ? config.contactInfo.address
                          : [
                              config.contactInfo.address.street,
                              config.contactInfo.address.city,
                              config.contactInfo.address.state,
                              config.contactInfo.address.country,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Form */}
            <form className="space-y-4">
              <div>
                <label className="block font-medium mb-2">Nombre</label>
                <input 
                  type="text" 
                  className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode
                      ? 'bg-gray-800 border border-gray-700 text-gray-100'
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">Email</label>
                <input 
                  type="email" 
                  className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode
                      ? 'bg-gray-800 border border-gray-700 text-gray-100'
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">Mensaje</label>
                <textarea 
                  rows={4} 
                  className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode
                      ? 'bg-gray-800 border border-gray-700 text-gray-100'
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Enviar Mensaje
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
    </div>
  );
}
