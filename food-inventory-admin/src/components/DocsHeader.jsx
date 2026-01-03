import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import SmartKubikLogoDark from '@/assets/logo-smartkubik.png';
import SmartKubikLogoLight from '@/assets/logo-smartkubik-light.png';

const DocsHeader = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';
  const logoSrc = isDark ? SmartKubikLogoDark : SmartKubikLogoLight;

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logoSrc} alt="SmartKubik" className="h-8 w-auto" />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Características
            </Link>
            <Link
              to="/#benefits"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Beneficios
            </Link>
            <Link
              to="/#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Precios
            </Link>
            <Link
              to="/docs"
              className="text-sm font-medium text-foreground"
            >
              Documentación
            </Link>
            <Link
              to="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Blog
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            <Link
              to="/login"
              className="hidden md:inline-flex text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Iniciar Sesión
            </Link>

            <Link
              to="/register"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Prueba Gratis
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DocsHeader;
