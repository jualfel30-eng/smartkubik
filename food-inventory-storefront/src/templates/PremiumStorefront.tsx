'use client';

import { useEffect, useState, useRef, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StorefrontConfig } from '@/types';
import { ShoppingCart, Menu, X, User, Sun, Moon, Mail, Phone, MapPin, Facebook, Instagram, ArrowRight, Star, Sparkles, Zap, Shield } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { getImageUrl } from '@/lib/utils';

interface PremiumStorefrontProps {
  config: StorefrontConfig;
  featuredProducts?: any[];
  categories?: string[];
  domain?: string;
}

// ── Noise SVG filter (inline, no external deps) ──
function NoiseSVG() {
  return (
    <svg className="fixed w-0 h-0" aria-hidden="true">
      <defs>
        <filter id="premium-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
  );
}

// ── Grain overlay component ──
function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03]"
      style={{ filter: 'url(#premium-noise)', mixBlendMode: 'overlay' }}
    />
  );
}

// ── Animated gradient background for hero ──
function HeroBackground({ primaryColor, secondaryColor }: { primaryColor: string; secondaryColor: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #0f0f23 30%, #0f0f23 70%, ${secondaryColor} 100%)`,
          backgroundSize: '400% 400%',
        }}
      />
      {/* Floating orbs */}
      <div
        className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-30 animate-float-slow"
        style={{ background: primaryColor }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 w-[50vw] h-[50vw] rounded-full blur-[100px] opacity-20 animate-float-slow-reverse"
        style={{ background: secondaryColor }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] rounded-full blur-[80px] opacity-15 animate-pulse-slow"
        style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` }}
      />
    </div>
  );
}

// ── Wavy section divider ──
function WaveDivider({ flip = false, color = '#0f0f23' }: { flip?: boolean; color?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''}`}>
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px]">
        <path
          d="M0,40 C150,100 350,0 600,50 C850,100 1050,0 1200,40 L1200,120 L0,120 Z"
          fill={color}
        />
      </svg>
    </div>
  );
}

// ── Glass card component ──
function GlassCard({ children, className = '', hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`
      relative rounded-2xl border border-white/10
      bg-white/[0.03] backdrop-blur-xl
      ${hover ? 'transition-all duration-500 hover:bg-white/[0.07] hover:border-white/20 hover:shadow-2xl hover:shadow-white/5 hover:-translate-y-1' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

export default function PremiumStorefront({ config, featuredProducts = [], categories: propCategories = [], domain }: PremiumStorefrontProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);
  const { toggleCart } = useCart();
  const { isAuthenticated, customer, logout } = useAuth();

  const primaryColor = config.theme?.primaryColor || '#6366f1';
  const secondaryColor = config.theme?.secondaryColor || '#ec4899';

  useEffect(() => {
    const stored = localStorage.getItem('storefront_theme');
    if (stored) {
      setIsDarkMode(stored === 'dark');
      document.documentElement.classList.toggle('dark', stored === 'dark');
      return;
    }
    // Premium defaults to dark
    setIsDarkMode(true);
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('storefront_theme', next ? 'dark' : 'light');
  };

  // Mouse tracking for hero parallax (throttled via RAF)
  useEffect(() => {
    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (showUserMenu && !(e.target as HTMLElement).closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  // Cart count
  const [cartCount, setCartCount] = useState(0);
  useEffect(() => {
    const update = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(cart.length);
    };
    update();
    window.addEventListener('cartUpdated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('cartUpdated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const products = featuredProducts.length > 0 ? featuredProducts : ((config as any).products || []);
  const categories = propCategories.length > 0
    ? ['all', ...propCategories]
    : (products.length > 0 ? ['all', ...new Set(products.map((p: any) => p.category))] : ['all']);
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((p: any) => p.category === selectedCategory);

  const navigation = [
    { name: 'Inicio', href: `/${domain}` },
    { name: 'Productos', href: `/${domain}/productos` },
    { name: 'Contacto', href: `/${domain}#contacto` },
  ];

  const themeStyle: CSSProperties = {
    '--color-primary': primaryColor,
    '--color-secondary': secondaryColor,
  } as CSSProperties;

  const bg = isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const sectionAlt = isDarkMode ? 'bg-[#0f0f23]' : 'bg-white';

  return (
    <div className={`min-h-screen ${bg} ${textMain} overflow-x-hidden`} style={themeStyle}>
      <NoiseSVG />
      <GrainOverlay />

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isDarkMode ? 'bg-[#0a0a1a]/80 border-b border-white/5' : 'bg-white/80 border-b border-gray-200'} backdrop-blur-xl`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href={`/${domain}`} className="flex items-center gap-3">
              {config.theme?.logo ? (
                <Image src={config.theme.logo} alt={config.seo?.title || ''} width={120} height={40} className="h-10 w-auto" priority unoptimized />
              ) : (
                <span className="text-xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                  {config.seo?.title || config.domain}
                </span>
              )}
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {item.name}
                </Link>
              ))}
              <button onClick={toggleTheme} className={`p-2 rounded-lg transition ${isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}>
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* User menu - desktop */}
              <div className="hidden md:block relative">
                {isAuthenticated ? (
                  <div className="relative user-menu-container">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className={`flex items-center gap-2 p-2 rounded-lg transition ${isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm hidden lg:inline">{customer?.name || 'Mi cuenta'}</span>
                    </button>
                    {showUserMenu && (
                      <div className={`absolute right-0 mt-2 w-48 rounded-xl overflow-hidden shadow-xl ${isDarkMode ? 'bg-[#1a1a2e] border border-white/10' : 'bg-white border border-gray-200'}`}>
                        <Link href={`/${domain}/perfil`} className={`block px-4 py-2.5 text-sm ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`} onClick={() => setShowUserMenu(false)}>Mi Perfil</Link>
                        <Link href={`/${domain}/mis-ordenes`} className={`block px-4 py-2.5 text-sm ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`} onClick={() => setShowUserMenu(false)}>Mis Ordenes</Link>
                        <button onClick={() => { logout(); setShowUserMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm ${isDarkMode ? 'text-red-400 hover:bg-white/5' : 'text-red-600 hover:bg-gray-50'}`}>Cerrar Sesion</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href={`/${domain}/login`} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <User className="h-4 w-4" />
                    <span className="hidden lg:inline">Iniciar Sesion</span>
                  </Link>
                )}
              </div>

              <button onClick={toggleCart} className="relative p-2">
                <ShoppingCart className={`h-5 w-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center" style={{ background: primaryColor }}>
                    {cartCount}
                  </span>
                )}
              </button>

              <button type="button" className={`md:hidden p-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile navigation */}
          {mobileMenuOpen && (
            <div className={`md:hidden py-4 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex flex-col gap-3">
                {navigation.map((item) => (
                  <Link key={item.name} href={item.href} className={`text-sm font-medium px-3 py-2 rounded-lg transition ${isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => setMobileMenuOpen(false)}>
                    {item.name}
                  </Link>
                ))}
                <div className={`pt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  {isAuthenticated ? (
                    <>
                      <Link href={`/${domain}/perfil`} className={`flex items-center gap-2 px-3 py-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>
                        <User className="h-4 w-4" /> Mi Perfil
                      </Link>
                      <Link href={`/${domain}/mis-ordenes`} className={`flex items-center gap-2 px-3 py-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>
                        <ShoppingCart className="h-4 w-4" /> Mis Ordenes
                      </Link>
                      <button onClick={() => { logout(); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                        <X className="h-4 w-4" /> Cerrar Sesion
                      </button>
                    </>
                  ) : (
                    <Link href={`/${domain}/login`} className={`flex items-center gap-2 px-3 py-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-4 w-4" /> Iniciar Sesion
                    </Link>
                  )}
                </div>
                <button onClick={() => { toggleTheme(); setMobileMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{isDarkMode ? 'Modo claro' : 'Modo oscuro'}</span>
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <HeroBackground primaryColor={primaryColor} secondaryColor={secondaryColor} />

        {/* Mouse-reactive light */}
        <div
          className="absolute w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-10 pointer-events-none transition-transform duration-1000 ease-out"
          style={{
            background: `radial-gradient(circle, ${primaryColor}, transparent)`,
            left: `${mousePos.x * 100}%`,
            top: `${mousePos.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />

        <div className="relative z-10 text-center max-w-5xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8 text-sm text-gray-300">
            <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
            <span>{config.seo?.description ? 'Bienvenido' : 'Descubre algo nuevo'}</span>
          </div>

          <h1
            className="font-black mb-6 leading-[1.1] tracking-tight"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 6rem)',
              background: `linear-gradient(135deg, #fff 0%, ${primaryColor} 50%, ${secondaryColor} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {config.seo?.title || config.domain}
          </h1>

          {config.seo?.description && (
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              {config.seo.description}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={`/${domain}/productos`}
              className="group relative px-8 py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Ver Productos <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <a
              href="#contacto"
              className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 border ${isDarkMode ? 'border-white/20 text-white hover:bg-white/5' : 'border-gray-300 text-gray-900 hover:bg-gray-100'}`}
            >
              Contactanos
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-slow">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
            <div className="w-1 h-3 rounded-full bg-white/40 animate-scroll-indicator" />
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES SECTION ═══════════════ */}
      <section className={`py-20 md:py-28 ${sectionAlt} relative`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${textMain}`}>
              ¿Por que elegirnos?
            </h2>
            <div className="w-20 h-1 mx-auto rounded-full" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: Shield, title: 'Calidad Garantizada', desc: 'Productos de la mas alta calidad para tu satisfaccion' },
              { icon: Zap, title: 'Entrega Rapida', desc: 'Recibe tus productos en tiempo record' },
              { icon: Star, title: 'Atencion Personalizada', desc: 'Soporte dedicado para todas tus necesidades' },
            ].map((feat, i) => (
              <GlassCard key={i} className={`p-8 text-center ${!isDarkMode ? 'bg-gray-50 border-gray-200' : ''}`}>
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)` }}
                >
                  <feat.icon className="h-7 w-7" style={{ color: primaryColor }} />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${textMain}`}>{feat.title}</h3>
                <p className={textMuted}>{feat.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PRODUCTS SECTION ═══════════════ */}
      <section id="productos" className={`py-20 md:py-28 ${bg} relative`}>
        {/* Decorative gradient blob */}
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full blur-[150px] opacity-5 pointer-events-none" style={{ background: primaryColor }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${textMain}`}>
              Nuestros Productos
            </h2>
            <div className="w-20 h-1 mx-auto rounded-full" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
          </div>

          {/* Category filters */}
          {products.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {(categories as string[]).map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedCategory === cat
                      ? 'text-white shadow-lg'
                      : `${isDarkMode ? 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`
                  }`}
                  style={selectedCategory === cat ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : undefined}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </button>
              ))}
            </div>
          )}

          {/* Products grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredProducts.map((product: any) => (
                <GlassCard key={product._id} className={`overflow-hidden ${!isDarkMode ? 'bg-white border-gray-200 shadow-sm' : ''}`}>
                  {product.image && (
                    <div className={`relative h-64 overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                      <Image
                        src={getImageUrl(product.image || product.imageUrl)}
                        alt={product.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* Gradient overlay on image */}
                      <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-t from-[#0a0a1a]/60 to-transparent' : 'bg-gradient-to-t from-white/20 to-transparent'}`} />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className={`text-lg font-bold ${textMain}`}>{product.name}</h3>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: `${primaryColor}15`, color: primaryColor }}
                      >
                        {product.category}
                      </span>
                    </div>
                    <p className={`${textMuted} mb-4 text-sm line-clamp-2`}>{product.description}</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                          ${product.price?.toFixed(2)}
                        </span>
                        {product.stock !== undefined && (
                          <p className={`text-xs mt-1 ${textMuted}`}>
                            {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
                          </p>
                        )}
                      </div>
                      {domain && product.stock > 0 ? (
                        <Link
                          href={`/${domain}/productos/${product._id}`}
                          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                        >
                          Ver detalles
                        </Link>
                      ) : (
                        <button disabled className={`px-5 py-2.5 rounded-xl text-sm font-semibold cursor-not-allowed ${isDarkMode ? 'bg-white/5 text-gray-500' : 'bg-gray-200 text-gray-400'}`}>
                          Agotado
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className={textMuted}>No hay productos disponibles en esta categoria</p>
            </div>
          )}

          {/* View all link */}
          {products.length > 0 && (
            <div className="text-center mt-12">
              <Link
                href={`/${domain}/productos`}
                className="group inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                style={{ color: primaryColor }}
              >
                Ver todos los productos
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ STATS SECTION ═══════════════ */}
      <section className="relative py-20 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)` }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '100+', label: 'Productos' },
              { value: '500+', label: 'Clientes' },
              { value: '24/7', label: 'Soporte' },
              { value: '99%', label: 'Satisfaccion' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div
                  className="text-3xl md:text-4xl font-black mb-2"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {stat.value}
                </div>
                <p className={`text-sm ${textMuted}`}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CONTACT SECTION ═══════════════ */}
      <section id="contacto" className={`py-20 md:py-28 ${sectionAlt} relative`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${textMain}`}>
              Contactanos
            </h2>
            <div className="w-20 h-1 mx-auto rounded-full" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact info */}
            <div>
              <h3 className={`text-2xl font-bold mb-6 ${textMain}`}>Informacion</h3>
              <div className="space-y-5">
                {config.contactInfo?.phone && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${primaryColor}15` }}>
                      <Phone className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className={`font-medium ${textMain}`}>Telefono</p>
                      <a href={`tel:${config.contactInfo.phone}`} className={`${textMuted} hover:underline`}>
                        {config.contactInfo.phone}
                      </a>
                    </div>
                  </div>
                )}
                {config.contactInfo?.email && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${primaryColor}15` }}>
                      <Mail className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className={`font-medium ${textMain}`}>Email</p>
                      <a href={`mailto:${config.contactInfo.email}`} className={`${textMuted} hover:underline`}>
                        {config.contactInfo.email}
                      </a>
                    </div>
                  </div>
                )}
                {config.contactInfo?.address && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${primaryColor}15` }}>
                      <MapPin className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className={`font-medium ${textMain}`}>Direccion</p>
                      <p className={textMuted}>
                        {typeof config.contactInfo.address === 'string'
                          ? config.contactInfo.address
                          : [config.contactInfo.address.street, config.contactInfo.address.city, config.contactInfo.address.state, config.contactInfo.address.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Social media */}
              {config.socialMedia && (config.socialMedia.facebook || config.socialMedia.instagram || config.socialMedia.whatsapp) && (
                <div className="mt-8">
                  <h4 className={`font-semibold mb-4 ${textMain}`}>Siguenos</h4>
                  <div className="flex gap-3">
                    {config.socialMedia.facebook && (
                      <a href={config.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        <Facebook className="h-5 w-5" style={{ color: primaryColor }} />
                      </a>
                    )}
                    {config.socialMedia.instagram && (
                      <a href={config.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        <Instagram className="h-5 w-5" style={{ color: primaryColor }} />
                      </a>
                    )}
                    {config.socialMedia.whatsapp && (
                      <a href={`https://wa.me/${config.socialMedia.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        <Phone className="h-5 w-5" style={{ color: primaryColor }} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contact form */}
            <GlassCard hover={false} className={`p-8 ${!isDarkMode ? 'bg-gray-50 border-gray-200' : ''}`}>
              <form className="space-y-5">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textMain}`}>Nombre</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-100 placeholder-gray-500 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]'}`}
                    placeholder="Tu nombre"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textMain}`}>Email</label>
                  <input
                    type="email"
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-100 placeholder-gray-500 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]'}`}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textMain}`}>Mensaje</label>
                  <textarea
                    rows={4}
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 resize-none ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-100 placeholder-gray-500 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]'}`}
                    placeholder="Escribe tu mensaje..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                >
                  Enviar Mensaje
                </button>
              </form>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ═══════════════ WHATSAPP FLOATING BUTTON ═══════════════ */}
      {config.whatsappIntegration?.enabled && config.whatsappIntegration?.businessPhone && (
        <a
          href={`https://wa.me/${config.whatsappIntegration.businessPhone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 transition-all hover:scale-110"
          title="WhatsApp"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      )}

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className={isDarkMode ? 'bg-[#050510] border-t border-white/5' : 'bg-gray-900 text-gray-300'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-4">
              {config.theme?.logo ? (
                <Image src={config.theme.logo} alt={config.seo?.title || ''} width={120} height={40} className="h-10 w-auto brightness-0 invert" unoptimized />
              ) : (
                <span
                  className="text-xl font-bold bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                >
                  {config.seo?.title || config.domain}
                </span>
              )}
              <p className="text-sm text-gray-400">
                {config.seo?.description || 'Tu tienda online de confianza'}
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Enlaces Rapidos</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href={`/${domain}`} className="hover:text-white transition">Inicio</Link></li>
                <li><Link href={`/${domain}/productos`} className="hover:text-white transition">Productos</Link></li>
                <li><Link href={`/${domain}#contacto`} className="hover:text-white transition">Contacto</Link></li>
                <li><Link href={`/${domain}/carrito`} className="hover:text-white transition">Carrito</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contacto</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {config.contactInfo?.email && (
                  <li className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <a href={`mailto:${config.contactInfo.email}`} className="hover:text-white transition break-all">{config.contactInfo.email}</a>
                  </li>
                )}
                {config.contactInfo?.phone && (
                  <li className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <a href={`tel:${config.contactInfo.phone}`} className="hover:text-white transition">{config.contactInfo.phone}</a>
                  </li>
                )}
                {config.contactInfo?.address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {typeof config.contactInfo.address === 'string'
                        ? config.contactInfo.address
                        : [config.contactInfo.address.street, config.contactInfo.address.city, config.contactInfo.address.state, config.contactInfo.address.country].filter(Boolean).join(', ')}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-white font-semibold mb-4">Siguenos</h4>
              <div className="flex gap-3">
                {config.socialMedia?.facebook && (
                  <a href={config.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-xl hover:bg-gray-700 transition">
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {config.socialMedia?.instagram && (
                  <a href={config.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-xl hover:bg-gray-700 transition">
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {config.socialMedia?.whatsapp && (
                  <a href={`https://wa.me/${config.socialMedia.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-xl hover:bg-gray-700 transition">
                    <Phone className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} {config.seo?.title || config.domain}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* ═══════════════ CSS ANIMATIONS ═══════════════ */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float-slow-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(0.95); }
          66% { transform: translate(20px, -30px) scale(1.05); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.25; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
        @keyframes scroll-indicator {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(8px); }
        }
        .animate-gradient-shift { animation: gradient-shift 15s ease infinite; }
        .animate-float-slow { animation: float-slow 20s ease-in-out infinite; }
        .animate-float-slow-reverse { animation: float-slow-reverse 25s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-scroll-indicator { animation: scroll-indicator 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
