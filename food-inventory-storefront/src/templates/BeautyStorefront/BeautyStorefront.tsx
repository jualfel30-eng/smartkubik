'use client';

import { useState, useEffect } from 'react';
import BeautyHero from './components/BeautyHero';
import BeautyServices from './components/BeautyServices';
import BeautyTeam from './components/BeautyTeam';
import BeautyGallery from './components/BeautyGallery';
import BeautyReviews from './components/BeautyReviews';
import BeautyLocation from './components/BeautyLocation';
import type { GooglePlacesData } from '@/lib/beautyApi';
import SmoothScrollProvider from './components/premium/SmoothScrollProvider';
import GrainOverlay from './components/premium/GrainOverlay';
import LoadingScreen from './components/premium/LoadingScreen';
import FloatingCTA from './components/premium/FloatingCTA';

export interface ColorScheme {
  // Backgrounds
  bg: string;
  bgAlt: string;
  bgOverlay: string;

  // Cards & surfaces
  card: string;
  cardHover: string;

  // Text hierarchy
  text: string;
  textMuted: string;
  textLight: string;

  // Accents
  accent: string;
  accentMuted: string;

  // Borders
  border: string;
  borderLight: string;

  // Misc
  emptyStar: string;
  waveFill: string;
  addonBg: string;
  placeholderGradient: string;

  // Premium additions
  noise: string;
  grain: string;
  goldGradient: string;
}

export const LIGHT: ColorScheme = {
  bg: 'bg-luxury-cream-50',
  bgAlt: 'bg-white',
  bgOverlay: 'bg-black/40',

  card: 'bg-white',
  cardHover: 'hover:bg-luxury-cream-50',

  text: 'text-luxury-black-900',
  textMuted: 'text-gray-600',
  textLight: 'text-gray-500',

  accent: 'text-luxury-gold',
  accentMuted: 'text-luxury-brass',

  border: 'border-gray-200',
  borderLight: 'border-gray-100',

  emptyStar: '#D1D5DB',
  waveFill: '#F5F5F0',
  addonBg: 'bg-gray-50',
  placeholderGradient: 'from-gray-100 to-gray-200',

  noise: 'opacity-[0.015]',
  grain: 'opacity-[0.02]',
  goldGradient: 'from-luxury-gold-light via-luxury-gold to-luxury-brass',
};

export const DARK: ColorScheme = {
  bg: 'bg-luxury-black-900',
  bgAlt: 'bg-luxury-black-800',
  bgOverlay: 'bg-black/60',

  card: 'bg-luxury-black-800',
  cardHover: 'hover:bg-luxury-black-700',

  text: 'text-luxury-cream-100',
  textMuted: 'text-luxury-cream-50/70',
  textLight: 'text-luxury-cream-50/50',

  accent: 'text-luxury-gold',
  accentMuted: 'text-luxury-brass',

  border: 'border-luxury-black-700',
  borderLight: 'border-luxury-black-700/50',

  emptyStar: '#4B5563',
  waveFill: '#0A0A0A',
  addonBg: 'bg-luxury-black-700',
  placeholderGradient: 'from-luxury-black-700 to-luxury-black-800',

  noise: 'opacity-[0.03]',
  grain: 'opacity-[0.04]',
  goldGradient: 'from-luxury-gold-light via-luxury-gold to-luxury-brass',
};

interface BeautyStorefrontProps {
  config: {
    tenantId: string;
    name: string;
    description: string;
    logoUrl?: string;
    bannerUrl?: string;
    videoUrl?: string;
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
    images?: string[];
    bio?: string;
    specialties: string[];
    instagram?: string;
  }>;
  gallery: Array<{
    _id: string;
    image: string;
    beforeImage?: string;
    caption?: string;
    category?: string;
    tags: string[];
  }>;
  reviews: Array<{
    _id: string;
    clientName: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>;
  googlePlaceId?: string;
  googlePlacesData?: GooglePlacesData | null;
  domain?: string;
}

export default function BeautyStorefront({
  config,
  services,
  professionals,
  gallery,
  reviews,
  googlePlaceId,
  googlePlacesData,
  domain,
}: BeautyStorefrontProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('beauty-dark-mode');
    if (stored === 'true') setDarkMode(true);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('beauty-dark-mode', String(next));
  };

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
    <SmoothScrollProvider>
      <div className={`min-h-screen ${colors.bg} ${colors.text} transition-colors duration-300`}>
        <LoadingScreen logoUrl={config.logoUrl} primaryColor={primaryColor} />
        <GrainOverlay />

        {/* Header */}
        <header
        className={`sticky top-0 z-50 backdrop-blur-md transition-colors duration-300 ${
          darkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-white/90 border-stone-200'
        } border-b`}
      >
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-3">
            {config.logoUrl && (
              <img src={config.logoUrl} alt={config.name} className={`w-9 h-9 md:w-12 md:h-12 object-contain transition-all duration-300 ${darkMode ? 'invert' : ''}`} />
            )}
            <span className="text-lg md:text-2xl font-bold tracking-tight" style={{ color: primaryColor }}>
              {config.name}
            </span>
          </div>

          <div className="hidden md:flex gap-8">
            {['Servicios', 'Equipo', 'Galería', 'Reseñas'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}
                className={`text-sm font-medium tracking-wide uppercase transition hover:opacity-70 ${colors.textMuted}`}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition ${
                darkMode ? 'bg-neutral-800 text-amber-400 hover:bg-neutral-700' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
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
              className="px-6 py-2.5 text-white rounded-full font-semibold text-sm tracking-wide hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              Reservar
            </a>
          </div>
        </nav>
      </header>

      <BeautyHero config={config} primaryColor={primaryColor} secondaryColor={secondaryColor} domain={domain} colors={colors} />

      {/* Services */}
      <section id="servicios" className={`py-32 ${colors.bgAlt} transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold tracking-super uppercase mb-3 font-sans" style={{ color: primaryColor }}>
              Servicios
            </p>
            <h2 className={`font-serif text-h1 font-bold tracking-tight mb-4 ${colors.text}`}>
              Nuestros Servicios
            </h2>
            <div className="w-16 h-1 mx-auto rounded-full mb-6" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }} />
            <p className={`${colors.textMuted} max-w-2xl mx-auto text-lg`}>
              Ofrecemos una amplia gama de servicios con profesionales especializados
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-10 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2.5 rounded-full font-medium text-sm tracking-wide transition-all duration-200 ${
                  selectedCategory === category
                    ? 'text-white shadow-lg'
                    : `${colors.card} ${colors.textMuted} hover:opacity-80 border ${colors.border}`
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
      <section id="equipo" className={`py-32 ${colors.bg} transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold tracking-super uppercase mb-3 font-sans" style={{ color: primaryColor }}>
              Equipo
            </p>
            <h2 className={`font-serif text-h1 font-bold tracking-tight mb-4 ${colors.text}`}>
              Nuestro Equipo
            </h2>
            <div className="w-16 h-1 mx-auto rounded-full mb-6" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }} />
            <p className={`${colors.textMuted} max-w-2xl mx-auto text-lg`}>
              Profesionales apasionados con años de experiencia
            </p>
          </div>
          <BeautyTeam professionals={professionals} primaryColor={primaryColor} colors={colors} />
        </div>
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section id="galeria" className={`py-32 ${colors.bgAlt} transition-colors duration-300`}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold tracking-super uppercase mb-3 font-sans" style={{ color: primaryColor }}>
                Portafolio
              </p>
              <h2 className={`font-serif text-h1 font-bold tracking-tight mb-4 ${colors.text}`}>
                Galería
              </h2>
              <div className="w-16 h-1 mx-auto rounded-full mb-6" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }} />
              <p className={`${colors.textMuted} max-w-2xl mx-auto text-lg`}>Mira algunos de nuestros trabajos</p>
            </div>
            <BeautyGallery gallery={gallery} colors={colors} />
          </div>
        </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section id="resenas" className={`py-32 ${colors.bg} transition-colors duration-300`}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold tracking-super uppercase mb-3 font-sans" style={{ color: primaryColor }}>
                Testimonios
              </p>
              <h2 className={`font-serif text-h1 font-bold tracking-tight mb-4 ${colors.text}`}>
                Lo Que Dicen Nuestros Clientes
              </h2>
              <div className="w-16 h-1 mx-auto rounded-full mb-6" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }} />
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-5xl font-bold" style={{ color: primaryColor }}>{averageRating.toFixed(1)}</span>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-6 h-6" fill={i < Math.round(averageRating) ? '#F59E0B' : colors.emptyStar} viewBox="0 0 20 20">
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
      <section id="contacto" className={`py-32 ${colors.bgAlt} transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold tracking-super uppercase mb-3 font-sans" style={{ color: primaryColor }}>
              Contacto
            </p>
            <h2 className={`font-serif text-h1 font-bold tracking-tight mb-4 ${colors.text}`}>
              Encuéntranos
            </h2>
            <div className="w-16 h-1 mx-auto rounded-full mb-6" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }} />
          </div>
          <BeautyLocation
            config={config}
            primaryColor={primaryColor}
            colors={colors}
            googlePlaceId={googlePlaceId}
            googlePlacesData={googlePlacesData}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-10 transition-colors duration-300 ${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-gray-900 border-gray-800'} border-t`}>
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 mb-2">&copy; {new Date().getFullYear()} {config.name}. Todos los derechos reservados.</p>
          <p className="text-sm text-gray-500">
            Powered by{' '}
            <span className="font-semibold" style={{ color: primaryColor }}>SmartKubik</span>
          </p>
        </div>
      </footer>

      <FloatingCTA domain={domain} primaryColor={primaryColor} secondaryColor={secondaryColor} />
      </div>
    </SmoothScrollProvider>
  );
}
