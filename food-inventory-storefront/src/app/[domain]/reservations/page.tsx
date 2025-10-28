import React from 'react';
import BookingManager from '@/components/booking/BookingManager';
import { getStorefrontConfig } from '@/lib/api';

export const revalidate = 60;

interface ReservationsPageProps {
  params: Promise<{ domain: string }>;
}

export default async function ReservationsPage({ params }: ReservationsPageProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);

  const tenantId =
    typeof config.tenantId === 'string'
      ? config.tenantId
      : (config.tenantId?._id as string);

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
            Gestión de Reservas
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900">
            Revisa y gestiona tus reservas en {config?.name || 'nuestro hotel'}
          </h1>
          <p className="max-w-2xl mx-auto text-gray-600 text-base md:text-lg">
            Ingresa el correo con el que hiciste tu reserva para consultarla. Desde aquí puedes reprogramar o cancelar tu cita en minutos.
          </p>
        </header>

        <BookingManager
          tenantId={tenantId}
          domain={domain}
          primaryColor={config.theme?.primaryColor}
          whatsappLink={config.externalLinks?.whatsapp}
        />
      </div>
    </div>
  );
}
