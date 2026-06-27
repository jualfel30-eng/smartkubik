'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getBookingByNumber, submitReview, type Booking } from '@/lib/beautyApi';

// Formulario de reseña COMPARTIDO por toda la vertical de servicios (beauty,
// health, futuros). Accesible vía el link que el sistema envía por WhatsApp tras
// una cita completada + pagada. Estilo neutro, no acoplado a una vertical.

interface MiniConfig {
  tenantId: string;
  name: string;
}

export default function ReviewPage() {
  const params = useParams();
  const domain = params.domain as string;
  const bookingNumber = params.bookingNumber as string;

  const [config, setConfig] = useState<MiniConfig | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/storefront/by-domain/${domain}`,
        );
        if (!res.ok) throw new Error('Config no encontrada');
        const json = await res.json();
        const cfg = json.data || json;
        const tenantId =
          typeof cfg.tenantId === 'object' ? cfg.tenantId._id : cfg.tenantId;
        const name = cfg.tenantId?.name || cfg.name || cfg.seo?.title || 'el negocio';
        setConfig({ tenantId, name });
        const b = await getBookingByNumber(bookingNumber, tenantId);
        setBooking(b);
      } catch (err: any) {
        setError(err.message || 'No se pudo cargar la reserva');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [domain, bookingNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !booking || rating === 0) return;
    setStatus('sending');
    try {
      await submitReview({
        tenantId: config.tenantId,
        clientName: booking.client.name,
        clientPhone: booking.client.phone,
        rating,
        comment: comment || undefined,
        bookingId: booking._id,
        serviceId: booking.services?.[0]?.service,
      });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E5E0D8] border-t-[#C9A96E]" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-6 text-center">
        <div>
          <p className="text-lg font-light text-[#6B6B6B]">{error || 'Reserva no encontrada.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-6 py-16">
      <div className="w-full max-w-md">
        <div className="border border-[#E5E0D8] bg-white p-8 md:p-10">
          {status === 'sent' ? (
            <div className="text-center">
              <div className="mb-4 text-5xl">🙏</div>
              <h1 className="mb-2 text-2xl font-light text-[#0A0A0A]">¡Gracias por tu reseña!</h1>
              <p className="text-[15px] font-light leading-relaxed text-[#6B6B6B]">
                Tu opinión nos ayuda a mejorar y a que más personas confíen en {config?.name}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="text-center">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-[#C9A96E]">
                {config?.name}
              </p>
              <h1 className="text-2xl font-light text-[#0A0A0A]">¿Cómo fue tu experiencia?</h1>
              <p className="mt-2 text-sm font-light text-[#6B6B6B]">
                Hola {booking.client.name}, déjanos tu reseña honesta.
              </p>

              {/* Estrellas */}
              <div className="mt-8 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    aria-label={`${s} estrellas`}
                    className="transition-transform hover:scale-110"
                  >
                    <svg className="h-9 w-9" fill={(hover || rating) >= s ? '#C9A96E' : '#E5E0D8'} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Cuéntanos sobre tu experiencia (opcional)..."
                className="mt-8 w-full resize-none border border-[#E5E0D8] bg-white p-4 text-sm font-light text-[#0A0A0A] outline-none transition-colors placeholder:text-[#A8A29A] focus:border-[#C9A96E]"
              />

              <button
                type="submit"
                disabled={rating === 0 || status === 'sending'}
                className="mt-6 w-full bg-[#0A0A0A] py-3.5 text-[13px] font-medium uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#C9A96E] disabled:opacity-40"
              >
                {status === 'sending' ? 'Enviando...' : 'Enviar Reseña'}
              </button>
              {status === 'error' && (
                <p className="mt-3 text-sm font-light text-red-600">Error al enviar. Intenta de nuevo.</p>
              )}
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-xs font-light text-[#A8A29A]">
          Powered by <span className="text-[#C9A96E]">SmartKubik</span>
        </p>
      </div>
    </div>
  );
}
