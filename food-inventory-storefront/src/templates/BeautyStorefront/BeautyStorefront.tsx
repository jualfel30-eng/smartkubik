'use client';

import { useState } from 'react';
import BeautyHero from './components/BeautyHero';
import BeautyServices from './components/BeautyServices';
import BeautyTeam from './components/BeautyTeam';
import BeautyGallery from './components/BeautyGallery';
import BeautyReviews from './components/BeautyReviews';
import BeautyLocation from './components/BeautyLocation';

interface BeautyStorefrontProps {
  config: {
    tenantId: string;
    name: string;
    description: string;
    logoUrl?: string;
    bannerUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    contactInfo: {
      email: string;
      phone: string;
      whatsapp?: string;
      address: string;
      city?: string;
      country?: string;
      socialMedia?: {
        instagram?: string;
        facebook?: string;
      };
    };
    beautyConfig?: {
      enabled: boolean;
      businessHours: Array<{
        day: number;
        dayName: string;
        isOpen: boolean;
        open: string;
        close: string;
      }>;
      paymentMethods: Array<{
        name: string;
        isActive: boolean;
        details?: string;
      }>;
    };
  };
  services: Array<{
    _id: string;
    name: string;
    category: string;
    description: string;
    duration: number;
    price: { amount: number; currency: string };
    images?: string[];
    addons?: Array<{
      name: string;
      price: number;
      duration?: number;
    }>;
  }>;
  professionals: Array<{
    _id: string;
    name: string;
    role: string;
    avatar?: string;
    bio?: string;
    specialties: string[];
    instagram?: string;
  }>;
  gallery: Array<{
    _id: string;
    title: string;
    category: string;
    imageUrl: string;
    description?: string;
  }>;
  reviews: Array<{
    _id: string;
    clientName: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>;
  domain?: string;
}

export default function BeautyStorefront({
  config,
  services,
  professionals,
  gallery,
  reviews,
  domain,
}: BeautyStorefrontProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const primaryColor = config.primaryColor || '#D946EF';
  const secondaryColor = config.secondaryColor || '#F97316';

  // Get unique categories
  const categories = ['all', ...new Set(services.map((s) => s.category))];

  // Filter services by category
  const filteredServices =
    selectedCategory === 'all'
      ? services
      : services.filter((s) => s.category === selectedCategory);

  // Calculate average rating
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {config.logoUrl && (
              <img
                src={config.logoUrl}
                alt={config.name}
                className="w-12 h-12 object-contain"
              />
            )}
            <span
              className="text-2xl font-bold"
              style={{ color: primaryColor }}
            >
              {config.name}
            </span>
          </div>

          <div className="hidden md:flex gap-6">
            <a
              href="#servicios"
              className="hover:opacity-70 transition"
              style={{ color: primaryColor }}
            >
              Servicios
            </a>
            <a
              href="#equipo"
              className="hover:opacity-70 transition"
              style={{ color: primaryColor }}
            >
              Equipo
            </a>
            <a
              href="#galeria"
              className="hover:opacity-70 transition"
              style={{ color: primaryColor }}
            >
              Galería
            </a>
            <a
              href="#resenas"
              className="hover:opacity-70 transition"
              style={{ color: primaryColor }}
            >
              Reseñas
            </a>
          </div>

          <a
            href={`/${domain}/beauty/reservar`}
            className="px-6 py-2 text-white rounded-full font-semibold hover:opacity-90 transition"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            }}
          >
            Reservar Cita
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <BeautyHero
        config={config}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        domain={domain}
      />

      {/* Services Section */}
      <section id="servicios" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Nuestros Servicios</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Ofrecemos una amplia gama de servicios de belleza con profesionales
              especializados
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full font-medium transition ${
                  selectedCategory === category
                    ? 'text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
                style={
                  selectedCategory === category
                    ? {
                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                      }
                    : {}
                }
              >
                {category === 'all' ? 'Todos' : category}
              </button>
            ))}
          </div>

          <BeautyServices
            services={filteredServices}
            primaryColor={primaryColor}
            domain={domain}
          />
        </div>
      </section>

      {/* Team Section */}
      <section id="equipo" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Nuestro Equipo</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Profesionales apasionados con años de experiencia
            </p>
          </div>
          <BeautyTeam professionals={professionals} primaryColor={primaryColor} />
        </div>
      </section>

      {/* Gallery Section */}
      {gallery.length > 0 && (
        <section id="galeria" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Galería</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Mira algunos de nuestros trabajos
              </p>
            </div>
            <BeautyGallery gallery={gallery} />
          </div>
        </section>
      )}

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <section id="resenas" className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Lo Que Dicen Nuestros Clientes</h2>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-5xl font-bold" style={{ color: primaryColor }}>
                  {averageRating.toFixed(1)}
                </span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-6 h-6"
                      fill={i < Math.round(averageRating) ? primaryColor : '#E5E7EB'}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600">Basado en {reviews.length} reseñas</p>
            </div>
            <BeautyReviews reviews={reviews} />
          </div>
        </section>
      )}

      {/* Location & Contact */}
      <section id="contacto" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <BeautyLocation config={config} primaryColor={primaryColor} />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-2">© 2026 {config.name}. Todos los derechos reservados.</p>
          <p className="text-sm text-gray-400">
            Reservas gestionadas por{' '}
            <span className="font-semibold" style={{ color: primaryColor }}>
              SmartKubik
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
