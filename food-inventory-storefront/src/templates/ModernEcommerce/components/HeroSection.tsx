import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  domain: string;
  storeName: string;
}

export function HeroSection({ domain, storeName }: HeroSectionProps) {
  return (
    <section className="relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Bienvenido a{' '}
              <span className="text-primary">{storeName}</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Descubre nuestra selección de productos de alta calidad.
              Compra fácil, rápido y seguro desde la comodidad de tu hogar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/${domain}/productos`}
                className="inline-flex items-center justify-center px-8 py-4 bg-[var(--primary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition"
              >
                Ver productos
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href={`/${domain}#contacto`}
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition"
              >
                Contactar
              </a>
            </div>
          </div>

          {/* Illustration */}
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-full h-auto max-w-md"
                viewBox="0 0 400 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="200" cy="200" r="150" fill="var(--primary-color)" opacity="0.1" />
                <circle cx="200" cy="200" r="100" fill="var(--secondary-color)" opacity="0.2" />
                <path
                  d="M200 100L250 150L200 200L150 150L200 100Z"
                  fill="var(--primary-color)"
                  opacity="0.3"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-[var(--primary-color)] rounded-full opacity-5 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-[var(--secondary-color)] rounded-full opacity-5 blur-3xl"></div>
    </section>
  );
}
