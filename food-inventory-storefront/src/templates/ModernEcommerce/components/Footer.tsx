import Link from 'next/link';
import Image from 'next/image';
import { StorefrontConfig } from '@/types';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  config: StorefrontConfig;
  domain: string;
  isDarkMode?: boolean;
}

export function Footer({ config, domain, isDarkMode = false }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={isDarkMode ? 'bg-gray-950 text-gray-200' : 'bg-gray-900 text-gray-300'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            {config.theme.logo ? (
              <Image
                src={config.theme.logo}
                alt={config.seo.title}
                width={120}
                height={40}
                className="h-10 w-auto brightness-0 invert"
              />
            ) : (
              <h3 className="text-xl font-bold text-white">{config.seo.title}</h3>
            )}
            <p className="text-sm">
              {config.seo.description || 'Tu tienda online de confianza'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <Link href={`/${domain}`} className="hover:text-white transition">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href={`/${domain}/productos`} className="hover:text-white transition">
                  Productos
                </Link>
              </li>
              <li>
                <Link href={`/${domain}#contacto`} className="hover:text-white transition">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href={`/${domain}/carrito`} className="hover:text-white transition">
                  Carrito
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3">
              {config.contactInfo.email && (
                <li className="flex items-start">
                  <Mail className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <a
                    href={`mailto:${config.contactInfo.email}`}
                    className="hover:text-white transition break-all"
                  >
                    {config.contactInfo.email}
                  </a>
                </li>
              )}
              {config.contactInfo.phone && (
                <li className="flex items-start">
                  <Phone className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <a
                    href={`tel:${config.contactInfo.phone}`}
                    className="hover:text-white transition"
                  >
                    {config.contactInfo.phone}
                  </a>
                </li>
              )}
              {config.contactInfo.address && (
                <li className="flex items-start">
                  <MapPin className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    {typeof config.contactInfo.address === 'string'
                      ? config.contactInfo.address
                      : [
                          config.contactInfo.address.street,
                          config.contactInfo.address.city,
                          config.contactInfo.address.state,
                          config.contactInfo.address.country,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-white font-semibold mb-4">Síguenos</h4>
            <div className="flex space-x-4">
              {config.socialMedia.facebook && (
                <a
                  href={config.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-800 rounded-full hover:bg-[var(--primary-color)] transition"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {config.socialMedia.instagram && (
                <a
                  href={config.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-800 rounded-full hover:bg-[var(--primary-color)] transition"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {config.socialMedia.whatsapp && (
                <a
                  href={`https://wa.me/${config.socialMedia.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-800 rounded-full hover:bg-[var(--primary-color)] transition"
                >
                  <Phone className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800 text-center text-sm">
          <p>
            © {currentYear} {config.seo.title}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
