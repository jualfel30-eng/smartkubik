import Link from 'next/link';
import Image from 'next/image';
import { StorefrontConfig } from '@/types';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  config: StorefrontConfig;
  domain: string;
  isDarkMode?: boolean;
}

export function Footer({ config, domain, isDarkMode = true }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const primaryColor = config.theme?.primaryColor || '#6366f1';
  const secondaryColor = config.theme?.secondaryColor || '#ec4899';

  return (
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

          {/* Quick Links */}
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
          <p>&copy; {currentYear} {config.seo?.title || config.domain}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
