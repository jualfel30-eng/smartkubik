'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBookingByNumber, type Booking } from '@/lib/beautyApi';

interface StorefrontConfig {
  tenantId: string;
  name: string;
  primaryColor?: string;
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

  const primaryColor = config?.primaryColor || '#D946EF';

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch config
        const configRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/public/storefront-config?domain=${domain}`
        );
        if (!configRes.ok) throw new Error('Config not found');
        const configData = await configRes.json();
        setConfig(configData);

        // Fetch booking
        const bookingData = await getBookingByNumber(bookingNumber);
        setBooking(bookingData);
      } catch (err: any) {
        setError(err.message || 'Booking not found');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [domain, bookingNumber]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleAddToCalendar = () => {
    if (!booking) return;

    const startDate = new Date(`${booking.date}T${booking.startTime}`);
    const endDate = new Date(`${booking.date}T${booking.endTime}`);

    const title = `Beauty Appointment - ${config?.name}`;
    const description = `Services: ${booking.services.map((s) => s.name).join(', ')}`;
    const location = config?.contactInfo?.address || '';

    // Create .ics file content
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

    // Create download link
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${booking.bookingNumber}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = () => {
    if (!booking || !config) return;

    const message = `¡Hola! Tengo una cita en *${config.name}*

📅 Fecha: ${formatDate(booking.date)}
🕐 Hora: ${booking.startTime}
💈 Servicios: ${booking.services.map((s) => s.name).join(', ')}
💰 Total: $${booking.totalPrice.toFixed(2)}

Código de reserva: *${booking.bookingNumber}*`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'The booking you are looking for does not exist or may have been cancelled.'}
          </p>
          <button
            onClick={() => router.push(`/${domain}/beauty`)}
            className="px-6 py-3 rounded-lg text-white font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ backgroundColor: `${primaryColor}20` }}>
            <svg
              className="w-10 h-10"
              style={{ color: primaryColor }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600">
            Your appointment has been successfully booked.
          </p>
        </div>

        {/* Booking details card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          {/* Booking number */}
          <div className="text-center mb-6 pb-6 border-b">
            <p className="text-sm text-gray-600 mb-1">Booking Code</p>
            <p className="text-3xl font-bold" style={{ color: primaryColor }}>
              {booking.bookingNumber}
            </p>
          </div>

          {/* Date & Time */}
          <div className="mb-6">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date &amp; Time
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-semibold">{formatDate(booking.date)}</div>
              <div className="text-gray-600">
                {booking.startTime} - {booking.endTime} ({booking.totalDuration} minutes)
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="mb-6">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Services
            </h3>
            <div className="space-y-3">
              {booking.services.map((service, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{service.name}</div>
                      <div className="text-sm text-gray-600">
                        {service.duration} minutes
                      </div>
                    </div>
                    <div className="font-bold">${service.price.toFixed(2)}</div>
                  </div>
                  {service.addons && service.addons.length > 0 && (
                    <div className="mt-2 pl-4 border-l-2" style={{ borderColor: primaryColor }}>
                      {service.addons.map((addon, addonIndex) => (
                        <div key={addonIndex} className="text-sm text-gray-600 flex justify-between">
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
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Professional
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {booking.professionalName}
              </div>
            </div>
          )}

          {/* Client info */}
          <div className="mb-6">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Contact Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-semibold">{booking.client.name}</div>
              <div className="text-gray-600">{booking.client.phone}</div>
            </div>
          </div>

          {/* Total */}
          <div className="border-t-2 pt-4">
            <div className="flex justify-between text-2xl font-bold">
              <span>Total</span>
              <span style={{ color: primaryColor }}>${booking.totalPrice.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-600 mt-1 text-right">
              Payment status: {booking.paymentStatus === 'pending' ? 'Pay on arrival' : booking.paymentStatus}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleAddToCalendar}
            className="w-full px-6 py-3 bg-white border-2 rounded-lg font-bold hover:bg-gray-50 flex items-center justify-center gap-2"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add to Calendar
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Share via WhatsApp
          </button>

          {config?.contactInfo?.whatsapp && (
            <a
              href={`https://wa.me/${config.contactInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I have a booking with code ${booking.bookingNumber}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-6 py-3 bg-white border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Contact {config.name}
            </a>
          )}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-900 mb-2">📧 Confirmation Sent</h3>
          <p className="text-sm text-blue-800">
            We've sent a confirmation message to {booking.client.phone}. Please arrive 5-10 minutes before your appointment time.
          </p>
        </div>

        {/* Back to services */}
        <div className="text-center">
          <button
            onClick={() => router.push(`/${domain}/beauty`)}
            className="text-gray-600 hover:text-gray-900 font-semibold"
          >
            ← Back to Services
          </button>
        </div>
      </div>
    </div>
  );
}
