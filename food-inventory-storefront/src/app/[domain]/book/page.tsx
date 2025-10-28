import React from 'react';
import BookingWizard from '@/components/booking/BookingWizard';
import {
  getBookingServiceCategories,
  getBookingServices,
  getStorefrontConfig,
} from '@/lib/api';

export const revalidate = 60;

interface BookingPageProps {
  params: Promise<{ domain: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);

  const tenantId =
    typeof config.tenantId === 'string'
      ? config.tenantId
      : (config.tenantId?._id as string);

  const [services, categories] = await Promise.all([
    getBookingServices(tenantId).catch((error) => {
      console.error('Failed to fetch booking services', error);
      return [];
    }),
    getBookingServiceCategories(tenantId).catch((error) => {
      console.error('Failed to fetch service categories', error);
      return [];
    }),
  ]);

  const primaryColor = config.theme?.primaryColor || '#2563eb';
  const secondaryColor = config.theme?.secondaryColor || '#1d4ed8';
  const themeStyles = {
    '--booking-primary': primaryColor,
    '--booking-secondary': secondaryColor,
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-white"
      style={themeStyles}
    >
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 space-y-10">
        <header className="text-center space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400">
            Portal de Reservas
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900">
            Agenda tu próxima experiencia en {config?.name || 'nuestro hotel'}
          </h1>
          <p className="max-w-2xl mx-auto text-gray-600 text-base md:text-lg">
            Selecciona el servicio, el horario que mejor se adapte a ti y confirma tu
            reserva en pocos pasos. Recibirás un correo con todos los detalles y un código
            para gestionar cambios o cancelaciones.
          </p>
        </header>

        {services.length === 0 ? (
          <div className="max-w-3xl mx-auto bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Aún no hay servicios disponibles
            </h2>
            <p className="text-gray-500">
              Estamos configurando nuestra agenda. Vuelve pronto o contáctanos para recibir
              atención personalizada.
            </p>
          </div>
        ) : (
          <BookingWizard
            tenantId={tenantId}
            domain={domain}
            services={services}
            categories={categories}
            primaryColor={config.theme?.primaryColor}
            secondaryColor={config.theme?.secondaryColor}
            language={config.language || 'es-VE'}
            whatsappLink={config.externalLinks?.whatsapp}
            allowGuestCount
          />
        )}
      </div>
    </div>
  );
}
