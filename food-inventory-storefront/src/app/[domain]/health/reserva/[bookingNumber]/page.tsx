'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getBookingByNumber, type Booking } from '@/lib/beautyApi';
import '@/templates/HealthStorefront/health.css';

const ACCENT = '#C9A96E';
const ACCENT_DARK = '#B8944F';

interface StorefrontConfig {
  tenantId: string;
  name: string;
  contactInfo?: {
    phone?: string;
    whatsapp?: string;
    address?: string;
  };
}

function ConfirmationCelebration() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    import('canvas-confetti')
      .then(({ default: confetti }) => {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: [ACCENT, ACCENT_DARK, '#FFD700'] });
        setTimeout(() => {
          confetti({ particleCount: 40, spread: 80, origin: { y: 0.4, x: 0.3 }, colors: [ACCENT, ACCENT_DARK] });
        }, 300);
      })
      .catch(() => {});
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(200);
  }, []);
  return null;
}

export default function HealthBookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params.domain as string;
  const bookingNumber = params.bookingNumber as string;

  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const configRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/storefront/by-domain/${domain}`,
        );
        if (!configRes.ok) throw new Error('Config not found');
        const configJson = await configRes.json();
        const configData = configJson.data || configJson;

        const tenantName =
          typeof configData.tenantId === 'object'
            ? configData.tenantId.name
            : configData.seo?.title || 'Clínica';

        setConfig({
          tenantId: typeof configData.tenantId === 'object' ? configData.tenantId._id : configData.tenantId,
          name: tenantName,
          contactInfo: {
            phone: configData.contactInfo?.phone,
            whatsapp: configData.socialMedia?.whatsapp || configData.contactInfo?.phone,
            address:
              typeof configData.contactInfo?.address === 'object'
                ? `${configData.contactInfo.address.street || ''}, ${configData.contactInfo.address.city || ''}`
                : configData.contactInfo?.address,
          },
        });

        const tenantId =
          typeof configData.tenantId === 'object' ? configData.tenantId._id : configData.tenantId;
        const bookingData = await getBookingByNumber(bookingNumber, tenantId);
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const handleAddToCalendar = () => {
    if (!booking) return;
    const dateOnly = booking.date.split('T')[0];
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
    const message = `¡Hola! Tengo una cita en *${config.name}*\n\n📅 Fecha: ${formatDate(booking.date)}\n🕐 Hora: ${booking.startTime}\n🩺 Servicios: ${booking.services.map((s) => s.name).join(', ')}\n💰 Total: $${booking.totalPrice.toFixed(2)}\n\nCódigo de reserva: *${booking.bookingNumber}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="health-root flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: ACCENT, borderRightColor: ACCENT }} />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="health-root flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">❌</div>
          <h1 className="font-display mb-2 text-2xl font-light text-[#0A0A0A]">Reserva No Encontrada</h1>
          <p className="mb-6 text-[#6B6B6B]">{error || 'La reserva que buscas no existe o fue cancelada.'}</p>
          <button onClick={() => router.push(`/${domain}/health`)} className="btn-primary px-8">
            Volver a Servicios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="health-root min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[#E5E0D8] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={() => router.push(`/${domain}/health`)} className="flex items-center gap-2 text-sm font-medium text-[#6B6B6B] transition hover:opacity-70">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <span className="font-display tracking-[0.15em] text-[#0A0A0A]">{config?.name}</span>
          <span className="w-12" />
        </div>
      </header>

      <ConfirmationCelebration />

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 text-center">
          <motion.div
            className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: `linear-gradient(135deg, ${ACCENT}20, ${ACCENT_DARK}20)` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
          >
            <motion.svg className="h-10 w-10" style={{ color: ACCENT_DARK }} fill="none" stroke="currentColor" viewBox="0 0 24 24" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </motion.svg>
          </motion.div>
          <motion.h1 className="font-display mb-2 text-3xl font-light text-[#0A0A0A]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            ¡Reserva Confirmada!
          </motion.h1>
          <motion.p className="text-[#6B6B6B]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            Tu cita ha sido reservada exitosamente.
          </motion.p>
        </div>

        <div className="mb-6 rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 border-b border-[#E5E0D8] pb-6 text-center">
            <p className="label-caps mb-2 text-[10px] text-[#A8A29A]">Código de Reserva</p>
            <p className="font-display text-4xl font-medium tracking-wider" style={{ color: ACCENT_DARK }}>
              {booking.bookingNumber}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="label-caps mb-3 text-[10px] text-[#A8A29A]">Fecha y Hora</h3>
            <div className="rounded-xl bg-[#F7F3EE] p-4">
              <div className="font-semibold text-[#0A0A0A]">{formatDate(booking.date)}</div>
              <div className="text-[#6B6B6B]">
                {booking.startTime} - {booking.endTime} ({booking.totalDuration} min)
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="label-caps mb-3 text-[10px] text-[#A8A29A]">Servicios</h3>
            <div className="space-y-3">
              {booking.services.map((service, index) => (
                <div key={index} className="rounded-xl bg-[#F7F3EE] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-[#0A0A0A]">{service.name}</div>
                      <div className="text-sm text-[#6B6B6B]">{service.duration} min</div>
                    </div>
                    <div className="font-semibold" style={{ color: ACCENT_DARK }}>${service.price.toFixed(2)}</div>
                  </div>
                  {service.addons?.length > 0 && (
                    <div className="mt-2 border-l-2 pl-3" style={{ borderColor: `${ACCENT}40` }}>
                      {service.addons.map((addon, addonIndex) => (
                        <div key={addonIndex} className="flex justify-between text-sm text-[#6B6B6B]">
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

          {booking.professionalName && (
            <div className="mb-6">
              <h3 className="label-caps mb-3 text-[10px] text-[#A8A29A]">Especialista</h3>
              <div className="rounded-xl bg-[#F7F3EE] p-4 text-[#0A0A0A]">{booking.professionalName}</div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="label-caps mb-3 text-[10px] text-[#A8A29A]">Datos de Contacto</h3>
            <div className="rounded-xl bg-[#F7F3EE] p-4">
              <div className="font-semibold text-[#0A0A0A]">{booking.client.name}</div>
              <div className="text-[#6B6B6B]">{booking.client.phone}</div>
            </div>
          </div>

          <div className="border-t-2 border-[#E5E0D8] pt-5">
            <div className="flex justify-between text-2xl font-bold">
              <span className="text-[#0A0A0A]">Total</span>
              <span style={{ color: ACCENT_DARK }}>${booking.totalPrice.toFixed(2)}</span>
            </div>
            <div className="mt-1 text-right text-sm text-[#6B6B6B]">
              {booking.paymentStatus === 'pending' ? 'Pago al llegar' : booking.paymentStatus}
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <button onClick={handleAddToCalendar} className="flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-4 text-base font-semibold text-white transition-all hover:scale-[1.01] hover:shadow-lg" style={{ backgroundColor: ACCENT }}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Agregar al Calendario
          </button>

          <button onClick={handleShareWhatsApp} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:bg-green-600 hover:shadow-lg">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Compartir por WhatsApp
          </button>

          {config?.contactInfo?.whatsapp && (
            <a
              href={`https://wa.me/${config.contactInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola! Tengo una reserva con código ${booking.bookingNumber}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#E5E0D8] px-6 py-3.5 text-sm font-semibold text-[#0A0A0A] transition-all hover:shadow-md"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Contactar a {config.name}
            </a>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-800">
          <h3 className="mb-2 font-bold text-blue-900">📧 Confirmación Enviada</h3>
          <p className="text-sm">
            Hemos enviado un mensaje de confirmación al {booking.client.phone}. Por favor llega 5-10 minutos antes de tu cita.
          </p>
        </div>

        <div className="text-center">
          <button onClick={() => router.push(`/${domain}/health`)} className="text-sm font-semibold text-[#6B6B6B] transition hover:opacity-70">
            ← Volver a Servicios
          </button>
        </div>
      </div>
    </div>
  );
}
