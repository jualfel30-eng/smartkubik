'use client';

import { useState } from 'react';
import Image from 'next/image';
import { StorefrontConfig } from '@/lib/api';

interface ModernEcommerceProps {
  config: StorefrontConfig;
}

export default function ModernEcommerce({ config }: ModernEcommerceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Obtener categorías únicas de los productos
  const categories = config.products 
    ? ['all', ...new Set(config.products.map(p => p.category))]
    : ['all'];
  
  // Filtrar productos por categoría
  const filteredProducts = selectedCategory === 'all'
    ? config.products || []
    : (config.products || []).filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {config.logo && (
                <Image 
                  src={config.logo} 
                  alt={config.name} 
                  width={48}
                  height={48}
                  className="h-12 w-auto rounded-lg"
                />
              )}
              <h1 className="text-3xl font-bold text-gray-900">
                {config.name}
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#inicio" className="text-gray-700 hover:text-blue-600 font-medium transition">
                Inicio
              </a>
              <a href="#productos" className="text-gray-700 hover:text-blue-600 font-medium transition">
                Productos
              </a>
              <a href="#contacto" className="text-gray-700 hover:text-blue-600 font-medium transition">
                Contacto
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Bienvenido a {config.name}
            </h2>
            {config.description && (
              <p className="text-xl text-gray-600 mb-8">
                {config.description}
              </p>
            )}
            <div className="flex justify-center space-x-4">
              <a
                href="#productos"
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Ver Productos
              </a>
              <a
                href="#contacto"
                className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl border border-gray-200"
              >
                Contáctanos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ¿Por qué elegirnos?
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Calidad Garantizada
              </h4>
              <p className="text-gray-600">
                Productos de la más alta calidad para tu satisfacción
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Entrega Rápida
              </h4>
              <p className="text-gray-600">
                Recibe tus productos en tiempo récord
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Atención Personalizada
              </h4>
              <p className="text-gray-600">
                Soporte dedicado para todas tus necesidades
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="productos" className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Nuestros Productos
          </h3>

          {/* Category Filters */}
          {config.products && config.products.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
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
              {filteredProducts.map(product => (
                <div 
                  key={product._id} 
                  className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1"
                >
                  {product.image && (
                    <div className="relative h-64 bg-gray-200">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-bold text-gray-900">
                        {product.name}
                      </h4>
                      <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                        {product.category}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-3xl font-bold text-blue-600">
                          ${product.price?.toFixed(2)}
                        </span>
                        {product.stock !== undefined && (
                          <p className="text-sm text-gray-500 mt-1">
                            {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
                          </p>
                        )}
                      </div>
                      <button
                        disabled={product.stock === 0}
                        className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                          product.stock === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        }`}
                      >
                        {product.stock === 0 ? 'Agotado' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No hay productos disponibles en esta categoría
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h3 className="text-4xl font-bold text-center text-gray-900 mb-12">
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
                      <a href={`tel:${config.contactInfo.phone}`} className="text-gray-600 hover:text-blue-600">
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
                      <a href={`mailto:${config.contactInfo.email}`} className="text-gray-600 hover:text-blue-600">
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
                      <p className="text-gray-600">{config.contactInfo.address}</p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">Mensaje</label>
                <textarea 
                  rows={4} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">{config.name}</h3>
            <p className="text-gray-400 mb-6">
              {config.description || 'Tu tienda de confianza'}
            </p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Facebook
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Instagram
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Twitter
              </a>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-800">
              <p className="text-gray-500 text-sm">
                © {new Date().getFullYear()} {config.name}. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
