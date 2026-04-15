import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Phone } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * Página pública de check-in — accesible sin autenticación.
 * URL: /checkin/:tenantId
 * El cliente ingresa su teléfono → el sistema busca su cita de hoy → confirma llegada.
 */
export default function PublicCheckinPage() {
  const { tenantId } = useParams();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, message, bookingNumber, startTime }

  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    try {
      setLoading(true);
      // Normalize phone: ensure it starts with +
      const normalized = phone.trim().startsWith('+') ? phone.trim() : `+${phone.trim()}`;
      const res = await fetch(
        `${API_BASE}/public/beauty-bookings/checkin?tenantId=${tenantId}&phone=${encodeURIComponent(normalized)}`,
      );
      const data = await res.json();
      setResult(data);
      if (data.success) trackEvent('checkin_scanned', { tenantId });
    } catch (err) {
      setResult({ success: false, message: 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo / brand */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 size={32} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Check-in</h1>
        <p className="text-sm text-muted-foreground mt-1">Confirma tu llegada al salón</p>
      </div>

      {result ? (
        /* Result screen */
        <div className="w-full max-w-sm text-center space-y-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${result.success ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
            {result.success
              ? <CheckCircle2 size={40} className="text-emerald-600" />
              : <XCircle size={40} className="text-destructive" />}
          </div>
          <p className="text-lg font-semibold">{result.message}</p>
          {result.bookingNumber && (
            <p className="text-sm text-muted-foreground">Reserva: {result.bookingNumber}</p>
          )}
          {result.startTime && (
            <p className="text-sm text-muted-foreground">Hora: {result.startTime}</p>
          )}
          {!result.success && (
            <button type="button" onClick={() => setResult(null)}
              className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold">
              Intentar de nuevo
            </button>
          )}
        </div>
      ) : (
        /* Phone form */
        <form onSubmit={handleCheckin} className="w-full max-w-sm space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Tu número de teléfono</label>
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-4">
              <Phone size={18} className="text-muted-foreground shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+584121234567"
                className="flex-1 bg-transparent py-4 text-lg outline-none"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Incluye el código de país (ej: +58 para Venezuela)
            </p>
          </div>
          <button type="submit" disabled={loading || !phone.trim()}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-4 text-base font-bold disabled:opacity-50">
            {loading ? 'Verificando…' : 'Confirmar llegada'}
          </button>
        </form>
      )}

      <p className="mt-8 text-xs text-muted-foreground text-center">
        Powered by SmartKubik
      </p>
    </div>
  );
}
