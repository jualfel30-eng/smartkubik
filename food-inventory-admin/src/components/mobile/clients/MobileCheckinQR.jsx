import { useState } from 'react';
import { QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.smartkubik.com/api/v1';
const APP_BASE = window.location.origin;

/**
 * Muestra el QR de check-in para el salón.
 * Los clientes escanean el QR → abren la página pública → ingresan su teléfono → check-in.
 *
 * El QR apunta a: {APP_BASE}/checkin/{tenantId}
 */
export default function MobileCheckinQR() {
  const { tenant } = useAuth();
  const [copied, setCopied] = useState(false);

  const tenantId = tenant?._id || tenant?.id || '';
  const checkinUrl = `${APP_BASE}/checkin/${tenantId}`;

  // Google Charts QR (no library needed, external service)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(checkinUrl)}&color=000000&bgcolor=ffffff&margin=10`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(checkinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <div className="rounded-[var(--mobile-radius-lg)] border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <QrCode size={18} className="text-primary" />
        <h3 className="text-sm font-semibold">Check-in por QR</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Coloca este QR en recepción. Al escanearlo, el cliente confirma su llegada y recibirás una notificación push.
      </p>

      {tenantId ? (
        <>
          <div className="flex justify-center">
            <img src={qrSrc} alt="QR Check-in" className="w-[180px] h-[180px] rounded-[var(--mobile-radius-md)] border border-border" />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={copyLink}
              className={cn('flex-1 rounded-[var(--mobile-radius-md)] border py-2.5 text-sm font-medium no-tap-highlight flex items-center justify-center gap-1.5 transition-colors',
                copied ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card border-border')}>
              {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar link</>}
            </button>
            <a href={checkinUrl} target="_blank" rel="noopener noreferrer"
              className="rounded-[var(--mobile-radius-md)] border border-border bg-card px-4 py-2.5 text-sm font-medium no-tap-highlight flex items-center gap-1.5">
              <ExternalLink size={14} /> Probar
            </a>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Cargando datos del negocio…</p>
      )}
    </div>
  );
}
