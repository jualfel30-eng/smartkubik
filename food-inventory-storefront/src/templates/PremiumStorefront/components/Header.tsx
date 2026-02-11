'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { StorefrontConfig } from '@/types';
import { ShoppingCart, Menu, X, User, Sun, Moon } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  config: StorefrontConfig;
  domain: string;
  cartItemsCount?: number;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export function Header({ config, domain, cartItemsCount: initialCartCount = 0, isDarkMode = true, onToggleTheme }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(initialCartCount);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { toggleCart } = useCart();
  const { isAuthenticated, customer, logout } = useAuth();

  const primaryColor = config.theme?.primaryColor || '#6366f1';
  const secondaryColor = config.theme?.secondaryColor || '#ec4899';

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartItemsCount(cart.length);
    };
    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    window.addEventListener('storage', updateCartCount);
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const navigation = [
    { name: 'Inicio', href: `/${domain}` },
    { name: 'Productos', href: `/${domain}/productos` },
    { name: 'Contacto', href: `/${domain}#contacto` },
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${isDarkMode ? 'bg-[#0a0a1a]/80 border-b border-white/5' : 'bg-white/80 border-b border-gray-200'} backdrop-blur-xl`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={`/${domain}`} className="flex items-center gap-3">
            {config.theme?.logo ? (
              <Image src={config.theme.logo} alt={config.seo?.title || ''} width={120} height={40} className="h-10 w-auto" priority unoptimized />
            ) : (
              <span
                className="text-xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                {config.seo?.title || config.domain}
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
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
            <button
              onClick={() => onToggleTheme?.()}
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className={`p-2 rounded-lg transition ${isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          {/* Cart, User & Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* User Menu - Desktop */}
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
                      <Link href={`/${domain}/perfil`} className={`block px-4 py-2.5 text-sm ${isDarkMode ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setShowUserMenu(false)}>Mi Perfil</Link>
                      <Link href={`/${domain}/mis-ordenes`} className={`block px-4 py-2.5 text-sm ${isDarkMode ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setShowUserMenu(false)}>Mis Ordenes</Link>
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
              {cartItemsCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                  style={{ background: primaryColor }}
                >
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              type="button"
              className={`md:hidden p-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className={`md:hidden py-4 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="flex flex-col gap-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition ${isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
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
              <button
                onClick={() => { onToggleTheme?.(); setMobileMenuOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>{isDarkMode ? 'Modo claro' : 'Modo oscuro'}</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
