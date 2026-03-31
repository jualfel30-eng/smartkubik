'use client';

import { useState } from 'react';
import BeautyHero from './components/BeautyHero';
import BeautyServices from './components/BeautyServices';
import BeautyTeam from './components/BeautyTeam';
import BeautyGallery from './components/BeautyGallery';
import BeautyReviews from './components/BeautyReviews';
import BeautyLocation from './components/BeautyLocation';

export interface ColorScheme {
  bg: string;
  bgAlt: string;
  card: string;
  text: string;
  textMuted: string;
  textLight: string;
  border: string;
  emptyStar: string;
  waveFill: string;
  addonBg: string;
  placeholderGradient: string;
}

const LIGHT: ColorScheme = {
  bg: 'bg-white',
  bgAlt: 'bg-gray-50',
  card: 'bg-white',
  text: 'text-gray-900',
  textMuted: 'text-gray-600',
  textLight: 'text-gray-500',
  border: 'border-gray-200',
  emptyStar: '#E5E7EB',
  waveFill: '#ffffff',
  addonBg: 'bg-gray-100',
  placeholderGradient: 'from-gray-100 to-gray-200',
};

const DARK: ColorScheme = {
  bg: 'bg-gray-950',
  bgAlt: 'bg-gray-900',
  card: 'bg-gray-800',
  text: 'text-gray-100',
  textMuted: 'text-gray-300',
  textLight: 'text-gray-400',
  border: 'border-gray-700',
  emptyStar: '#4B5563',
  waveFill: '#030712',
  addonBg: 'bg-gray-700',
  placeholderGradient: 'from-gray-700 to-gray-600',
};

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
  const [darkMode, setDarkMode] = useState(false);

  const primaryColor = config.primaryColor || '#D946EF';
  const secondaryColor = config.secondaryColor || '#F97316';
  const colors = darkMode ? DARK : LIGHT;

  const categories = ['all', ...new Set(services.map((s) => s.category))];

  const filteredServices =
    selectedCategory === 'all'
      ? services
      : services.filter((s) => s.category === selectedCategory);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} transition-colors duration-300`}>
      {/* Sticky Header */}
      <header className={`sticky top-0 ${darkMode ? 'bg-gray-950/95' : 'bg-white/95'} backdrop-blur-sm shadow-sm z-50 transition-colors duration-300`}>
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {config.logoUrl && (
              <img src={config.logoUrl} alt={config.name} className="w-12 h-12 object-contain" />
            )}
            <span className="text-2xl font-bold" style={{ color: primaryColor }}>
              {config.name}
            </span>
          </div>

          <div className="hidden md:flex gap-6">
            {['Servicios', 'Equipo', 'Galería', 'Reseñas'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}
                className="hover:opacity-70 transition"
                style={{ color: primaryColor }}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              aria-label={darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <a
              href={`/${domain}/beauty/reservar`}
              className="px-6 py-2 text-white rounded-full font-semibold hover:opacity-90 transition"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              Reservar Cita
            </a>
          </div>
        </nav>
      </header>

      <BeautyHero config={config} primaryColor={primaryColor} secondaryColor={secondaryColor} domain={domain} colors={colors} />

      {/* Services */}
      <section id="servicios" className={`py-16 ${colors.bgAlt} transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className={`text-4xl font-bold mb-4 ${colors.text}`}>Nuestros Servicios</h2>
            <p className={`${colors.textMuted} max-w-2xl mx-auto`}>
              Ofrecemos una amplia gama de servicios de belleza con profesionales especializados
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full font-medium transition ${
                  selectedCategory === category
                    ? 'text-white shadow-lg'
                    : `${colors.card} ${colors.textMuted} hover:opacity-80`
                }`}
                style={selectedCategory === category ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : {}}
              >
                {category === 'all' ? 'Todos' : category}
              </button>
            ))}
          </div>

          <BeautyServices services={filteredServices} primaryColor={primaryColor} domain={domain} colors={colors} />
        </div>
      </section>

      {/* Team */}
      <section id="equipo" className={`py-16 ${colors.bg} transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className={`text-4xl font-bold mb-4 ${colors.text}`}>Nuestro Equipo</h2>
            <p className={`${colors.textMuted} max-w-2xl mx-auto`}>
              Profesionales apasionados con años de experiencia
            </p>
          </div>
          <BeautyTeam professionals={professionals} primaryColor={primaryColor} colors={colors} />
        </div>
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section id="galeria" className={`py-16 ${colors.bgAlt} transition-colors duration-300`}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className={`text-4xl font-bold mb-4 ${colors.text}`}>Galería</h2>
              <p className={`${colors.textMuted} max-w-2xl mx-auto`}>Mira algunos de nuestros trabajos</p>
            </div>
            <BeautyGallery gallery={gallery} colors={colors} />
          </div>
        </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section id="resenas" className={`py-16 ${colors.bg} transition-colors duration-300`}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className={`text-4xl font-bold mb-4 ${colors.text}`}>Lo Que Dicen Nuestros Clientes</h2>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-5xl font-bold" style={{ color: primaryColor }}>{averageRating.toFixed(1)}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-6 h-6" fill={i < Math.round(averageRating) ? primaryColor : colors.emptyStar} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className={colors.textMuted}>Basado en {reviews.length} reseñas</p>
            </div>
            <BeautyReviews reviews={reviews} colors={colors} />
          </div>
        </section>
      )}

      {/* Location */}
      <section id="contacto" className={`py-16 ${colors.bgAlt} transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <BeautyLocation config={config} primaryColor={primaryColor} colors={colors} />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-2">&copy; 2026 {config.name}. Todos los derechos reservados.</p>
          <p className="text-sm text-gray-400">
            Reservas gestionadas por{' '}
            <span className="font-semibold" style={{ color: primaryColor }}>SmartKubik</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
