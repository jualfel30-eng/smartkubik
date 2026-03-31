'use client';

import SectionReveal from './premium/SectionReveal';
import type { ColorScheme } from '../BeautyStorefront';

interface Service {
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
}

interface BeautyServicesProps {
  services: Service[];
  primaryColor: string;
  domain?: string;
  colors: ColorScheme;
}

export default function BeautyServices({
  services,
  primaryColor,
  domain,
  colors,
}: BeautyServicesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service, index) => (
        <SectionReveal key={service._id} delay={index * 0.1}>
          <div
            className={`${colors.card} rounded-xl shadow-lg overflow-hidden hover:shadow-premium-lg transition-all duration-300 transform hover:-translate-y-1 group`}
          >
            <div
              className={`h-48 bg-gradient-to-br ${colors.placeholderGradient} relative overflow-hidden filter grayscale group-hover:grayscale-0 transition-all duration-500`}
              style={{
                background: service.images?.[0]
                  ? `url(${service.images[0]}) center/cover`
                  : `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}40)`,
              }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-500" />
              <div
                className={`absolute top-4 right-4 ${colors.card} px-3 py-1 rounded-full shadow-lg`}
                style={{ color: primaryColor }}
              >
                <span className="font-bold text-lg">${service.price.amount}</span>
              </div>
            </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className={`text-xl font-bold mb-1 ${colors.text}`}>{service.name}</h3>
                <span
                  className="text-sm font-medium px-3 py-1 rounded-full"
                  style={{ background: `${primaryColor}15`, color: primaryColor }}
                >
                  {service.category}
                </span>
              </div>
            </div>

            <p className={`${colors.textMuted} text-sm mb-4 line-clamp-2`}>{service.description}</p>

            <div className={`flex items-center gap-4 text-sm ${colors.textLight} mb-4`}>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{service.duration} min</span>
              </div>
            </div>

            {service.addons && service.addons.length > 0 && (
              <div className="mb-4">
                <p className={`text-xs ${colors.textLight} mb-2`}>Complementos disponibles:</p>
                <div className="flex flex-wrap gap-1">
                  {service.addons.slice(0, 2).map((addon, i) => (
                    <span key={i} className={`text-xs ${colors.addonBg} ${colors.text} px-2 py-1 rounded`}>
                      {addon.name} (+${addon.price})
                    </span>
                  ))}
                  {service.addons.length > 2 && (
                    <span className={`text-xs ${colors.textLight}`}>+{service.addons.length - 2} más</span>
                  )}
                </div>
              </div>
            )}

            <a
              href={`/${domain}/beauty/reservar?serviceId=${service._id}`}
              className="w-full block text-center px-4 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition"
              style={{ background: primaryColor }}
            >
              Reservar
            </a>
          </div>
          </div>
        </SectionReveal>
      ))}
    </div>
  );
}
