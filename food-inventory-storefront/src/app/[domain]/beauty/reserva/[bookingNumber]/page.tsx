'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBookingByNumber, type Booking } from '@/lib/beautyApi';
import { type ColorScheme, LIGHT, DARK } from '@/templates/BeautyStorefront/BeautyStorefront';

interface StorefrontConfig {
  tenantId: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactInfo?: {
    phone?: string;
    whatsapp?: string;
    address?: string;
  };
}

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params.domain as string;
  const bookingNumber = params.bookingNumber as string;

  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const primaryColor = config?.primaryColor || '#D946EF';
  const secondaryColor = config?.secondaryColor || '#F97316';
  const colors: ColorScheme = darkMode ? DARK : LIGHT;

  // Load dark mode preference
  useEffect(() => {
    const stored = localStorage.getItem('beauty-dark-mode');
    if (stored === 'true') setDarkMode(true);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('beauty-dark-mode', String(next));
  };

  useEffect(() => {
    async function loadData() {
      try {
        const configRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/storefront/by-domain/${domain}`
        );
        if (!configRes.ok) throw new Error('Config not found');
        const configJson = await configRes.json();
        const configData = configJson.data || configJson;

        const tenantName = typeof configData.tenantId === 'object'
          ? configData.tenantId.name
          : configData.seo?.title || 'Beauty Salon';

        setConfig({
          tenantId: typeof configData.tenantId === 'object' ? configData.tenantId._id : configData.tenantId,
          name: tenantName,
          primaryColor: configData.theme?.primaryColor,
          secondaryColor: configData.theme?.secondaryColor,
          contactInfo: {
            phone: configData.contactInfo?.phone,
            whatsapp: configData.socialMedia?.whatsapp || configData.contactInfo?.phone,
            address: typeof configData.contactInfo?.address === 'object'
              ? `${configData.contactInfo.address.street || ''}, ${configData.contactInfo.address.city || ''}`
              : configData.contactInfo?.address,
          },
        });

        const bookingData = await getBookingByNumber(bookingNumber);
        setBooking(bookingData);
      } catch (err: any) {
        setError(err.message || 'Reserva no encontrada');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [domain, bookingNumber]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleAddToCalendar = () => {
    if (!booking) return;

    // Extract YYYY-MM-DD from booking.date (which comes as ISO string from backend)
    const dateOnly = booking.date.split('T')[0]; // "2026-04-02"

    const startDate = new Date(`${dateOnly}T${booking.startTime}`);
    const endDate = new Date(`${dateOnly}T${booking.endTime}`);
    const title = `Cita - ${config?.name}`;
    const description = `Servicios: ${booking.services.map((s) => s.name).join(', ')}`;
    const location = config?.contactInfo?.address || '';

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reserva-${booking.bookingNumber}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = () => {
    if (!booking || !config) return;
    const message = `¡Hola! Tengo una cita en *${config.name}*\n\n📅 Fecha: ${formatDate(booking.date)}\n🕐 Hora: ${booking.startTime}\n💈 Servicios: ${booking.services.map((s) => s.name).join(', ')}\n💰 Total: $${booking.totalPrice.toFixed(2)}\n\nCódigo de reserva: *${booking.bookingNumber}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${colors.bg} transition-colors`}>
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-transparent" style={{ borderTopColor: primaryColor, borderRightColor: primaryColor }}></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${colors.bg}`}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className={`text-2xl font-bold mb-2 ${colors.text}`}>Reserva No Encontrada</h1>
          <p className={`mb-6 ${colors.textMuted}`}>
            {error || 'La reserva que buscas no existe o fue cancelada.'}
          </p>
          <button
            onClick={() => router.push(`/${domain}/beauty`)}
            className="px-6 py-3 rounded-xl text-white font-semibold"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            Volver a Servicios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg} transition-colors duration-300`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        darkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-white/90 border-stone-200'
      }`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => router.push(`/${domain}/beauty`)}
            className={`flex items-center gap-2 text-sm font-medium transition hover:opacity-70 ${colors.textMuted}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <span className="font-bold tracking-tight" style={{ color: primaryColor }}>{config?.name}</span>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full transition ${
              darkMode ? 'bg-neutral-800 text-amber-400 hover:bg-neutral-700' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Success badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)` }}>
            <svg className="w-10 h-10" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className={`text-3xl font-bold tracking-tight mb-2 ${colors.text}`}>¡Reserva Confirmada!</h1>
          <p className={colors.textMuted}>Tu cita ha sido reservada exitosamente.</p>
        </div>

        {/* Booking details card */}
        <div className={`${colors.card} rounded-2xl shadow-xl border ${colors.border} p-6 md:p-8 mb-6 transition-colors duration-300`}>
          {/* Booking number */}
          <div className={`text-center mb-6 pb-6 border-b ${colors.border}`}>
            <p className={`text-sm font-semibold tracking-wide uppercase mb-2 ${colors.textLight}`}>Código de Reserva</p>
            <p className="text-4xl font-bold tracking-wider" style={{ color: primaryColor }}>
              {booking.bookingNumber}
            </p>
          </div>

          {/* Date & Time */}
          <div className="mb-6">
            <h3 className={`text-sm font-semibold tracking-wide uppercase mb-3 flex items-center gap-2 ${colors.textLight}`}>
              <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Fecha y Hora
            </h3>
            <div className={`${colors.bgAlt} p-4 rounded-xl`}>
              <div className={`font-semibold ${colors.text}`}>{formatDate(booking.date)}</div>
              <div className={colors.textMuted}>
                {booking.startTime} - {booking.endTime} ({booking.totalDuration} min)
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="mb-6">
            <h3 className={`text-sm font-semibold tracking-wide uppercase mb-3 flex items-center gap-2 ${colors.textLight}`}>
              <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Servicios
            </h3>
            <div className="space-y-3">
              {booking.services.map((service, index) => (
                <div key={index} className={`${colors.bgAlt} p-4 rounded-xl`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className={`font-semibold ${colors.text}`}>{service.name}</div>
                      <div className={`text-sm ${colors.textMuted}`}>{service.duration} min</div>
                    </div>
                    <div className="font-bold" style={{ color: primaryColor }}>${service.price.toFixed(2)}</div>
                  </div>
                  {service.addons?.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2" style={{ borderColor: `${primaryColor}40` }}>
                      {service.addons.map((addon, addonIndex) => (
                        <div key={addonIndex} className={`text-sm ${colors.textMuted} flex justify-between`}>
                          <span>+ {addon.name}</span>
                          <span>+${addon.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Professional */}
          {booking.professionalName && (
            <div className="mb-6">
              <h3 className={`text-sm font-semibold tracking-wide uppercase mb-3 flex items-center gap-2 ${colors.textLight}`}>
                <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profesional
              </h3>
              <div className={`${colors.bgAlt} p-4 rounded-xl ${colors.text}`}>
                {booking.professionalName}
              </div>
            </div>
          )}

          {/* Client info */}
          <div className="mb-6">
            <h3 className={`text-sm font-semibold tracking-wide uppercase mb-3 flex items-center gap-2 ${colors.textLight}`}>
              <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Datos de Contacto
            </h3>
            <div className={`${colors.bgAlt} p-4 rounded-xl`}>
              <div className={`font-semibold ${colors.text}`}>{booking.client.name}</div>
              <div className={colors.textMuted}>{booking.client.phone}</div>
            </div>
          </div>

          {/* Total */}
          <div className={`border-t-2 pt-5 ${colors.border}`}>
            <div className="flex justify-between text-2xl font-bold">
              <span className={colors.text}>Total</span>
              <span style={{ color: primaryColor }}>${booking.totalPrice.toFixed(2)}</span>
            </div>
            <div className={`text-sm mt-1 text-right ${colors.textMuted}`}>
              {booking.paymentStatus === 'pending' ? 'Pago al llegar' : booking.paymentStatus}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleAddToCalendar}
            className={`w-full px-6 py-3.5 rounded-xl font-semibold text-sm tracking-wide border-2 flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:scale-[1.01]`}
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Agregar al Calendario
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="w-full px-6 py-3.5 bg-green-500 text-white rounded-xl font-semibold text-sm tracking-wide hover:bg-green-600 flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:scale-[1.01]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Compartir por WhatsApp
          </button>

          {config?.contactInfo?.whatsapp && (
            <a
              href={`https://wa.me/${config.contactInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola! Tengo una reserva con código ${booking.bookingNumber}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full px-6 py-3.5 rounded-xl font-semibold text-sm tracking-wide border-2 flex items-center justify-center gap-2 transition-all hover:shadow-md ${colors.border} ${colors.text}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Contactar a {config.name}
            </a>
          )}
        </div>

        {/* Info box */}
        <div className={`rounded-xl p-5 mb-6 border ${
          darkMode ? 'bg-blue-900/20 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <h3 className={`font-bold mb-2 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>📧 Confirmación Enviada</h3>
          <p className="text-sm">
            Hemos enviado un mensaje de confirmación al {booking.client.phone}. Por favor llega 5-10 minutos antes de tu cita.
          </p>
        </div>

        {/* Back link */}
        <div className="text-center">
          <button
            onClick={() => router.push(`/${domain}/beauty`)}
            className={`font-semibold text-sm transition hover:opacity-70 ${colors.textMuted}`}
          >
            ← Volver a Servicios
          </button>
        </div>
      </div>
    </div>
  );
}
