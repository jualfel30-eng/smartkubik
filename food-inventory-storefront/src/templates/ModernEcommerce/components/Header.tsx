'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { StorefrontConfig } from '@/types';
import { ShoppingCart, Menu, X } from 'lucide-react';

interface HeaderProps {
  config: StorefrontConfig;
  domain: string;
  cartItemsCount?: number;
}

export function Header({ config, domain, cartItemsCount = 0 }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Inicio', href: `/${domain}` },
    { name: 'Productos', href: `/${domain}/productos` },
    { name: 'Contacto', href: `/${domain}#contacto` },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
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
              <span className="text-xl font-bold text-gray-900">
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
                className="text-gray-700 hover:text-gray-900 font-medium transition"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Cart & Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            <Link
              href={`/${domain}/carrito`}
              className="relative p-2 text-gray-700 hover:text-gray-900 transition"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--primary-color)] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 text-gray-700"
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
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-gray-900 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
