import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import SmartKubikLogoDark from '@/assets/logo-smartkubik.png';
import SmartKubikLogoLight from '@/assets/logo-smartkubik-light.png';

const BlogNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme } = useTheme();

  // Resolve theme
  const resolvedTheme = theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const logoSrc = resolvedTheme === 'dark' ? SmartKubikLogoDark : SmartKubikLogoLight;

  return (
    <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-sm border-b border-border z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3 animate-fadeIn">
            <img src={logoSrc} alt="Smart Kubik" className="h-7 w-auto" />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Características
            </a>
            <a href="/#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Beneficios
            </a>
            <a href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Precios
            </a>
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Blog
            </Link>
            <ThemeToggle />
            <Link
              to="/register"
              className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
            >
              Regístrate
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-md transition-colors duration-200"
            >
              Inicia sesión
            </Link>
          </div>

          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-card border-t border-border animate-fadeIn">
          <div className="px-6 py-4 space-y-3">
            <a href="/#features" className="block text-sm text-muted-foreground">
              Características
            </a>
            <a href="/#benefits" className="block text-sm text-muted-foreground">
              Beneficios
            </a>
            <a href="/#pricing" className="block text-sm text-muted-foreground">
              Precios
            </a>
            <Link to="/blog" className="block text-sm text-muted-foreground">
              Blog
            </Link>
            <div className="pt-2">
              <ThemeToggle />
            </div>
            <Link
              to="/register"
              className="block w-full bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium text-center"
            >
              Regístrate
            </Link>
            <Link
              to="/login"
              className="block w-full bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium text-center"
            >
              Inicia sesión
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default BlogNavbar;
