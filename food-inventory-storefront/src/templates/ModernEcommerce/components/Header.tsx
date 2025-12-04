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

export function Header({ config, domain, cartItemsCount: initialCartCount = 0, isDarkMode = false, onToggleTheme }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(initialCartCount);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { toggleCart } = useCart();
  const { isAuthenticated, customer, logout } = useAuth();

  useEffect(() => {
    // Update cart count from localStorage
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartItemsCount(cart.length);
    };

    updateCartCount();

    // Listen for cart updates
    window.addEventListener('cartUpdated', updateCartCount);
    window.addEventListener('storage', updateCartCount);

    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, []);

  // Close user menu when clicking outside
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
    <header className={`sticky top-0 z-50 shadow-sm ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={`/${domain}`} className="flex items-center">
            {config.theme.logo ? (
              <Image
                src={config.theme.logo}
                alt={config.seo.title}
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
            ) : (
              <span className="text-xl font-bold">
                {config.seo.title}
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`${isDarkMode ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'} font-medium transition`}
              >
                {item.name}
              </Link>
            ))}
            <button
              onClick={() => onToggleTheme?.()}
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'} transition`}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          {/* Cart, User & Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            {/* User Menu - Desktop */}
            <div className="hidden md:block relative">
              {isAuthenticated ? (
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center space-x-2 p-2 rounded-lg ${isDarkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'} transition`}
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm font-medium hidden lg:inline">{customer?.name || 'Mi cuenta'}</span>
                  </button>
                  {showUserMenu && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} z-50`}>
                      <div className={`py-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        <Link
                          href={`/${domain}/perfil`}
                          className={`block px-4 py-2 text-sm ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          onClick={() => setShowUserMenu(false)}
                        >
                          Mi Perfil
                        </Link>
                        <Link
                          href={`/${domain}/mis-ordenes`}
                          className={`block px-4 py-2 text-sm ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          onClick={() => setShowUserMenu(false)}
                        >
                          Mis Órdenes
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'}`}
                        >
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={`/${domain}/login`}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'} transition`}
                >
                  <User className="h-5 w-5" />
                  <span className="hidden lg:inline">Iniciar Sesión</span>
                </Link>
              )}
            </div>

            <button
              onClick={toggleCart}
              className={`relative p-2 ${isDarkMode ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition`}
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--primary-color)] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              type="button"
              className={`md:hidden p-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className={`md:hidden py-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${isDarkMode ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'} font-medium transition`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {/* User options in mobile */}
              <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                {isAuthenticated ? (
                  <>
                    <div className={`px-3 py-2 text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {customer?.name || 'Mi cuenta'}
                    </div>
                    <Link
                      href={`/${domain}/perfil`}
                      className={`flex items-center space-x-2 px-3 py-2 ${isDarkMode ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'} font-medium transition`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      <span>Mi Perfil</span>
                    </Link>
                    <Link
                      href={`/${domain}/mis-ordenes`}
                      className={`flex items-center space-x-2 px-3 py-2 ${isDarkMode ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'} font-medium transition`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      <span>Mis Órdenes</span>
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 text-left ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} font-medium transition`}
                    >
                      <X className="h-5 w-5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href={`/${domain}/login`}
                    className={`flex items-center space-x-2 px-3 py-2 ${isDarkMode ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'} font-medium transition`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    <span>Iniciar Sesión</span>
                  </Link>
                )}
              </div>

              <button
                onClick={() => {
                  onToggleTheme?.();
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span>{isDarkMode ? 'Modo claro' : 'Modo oscuro'}</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
