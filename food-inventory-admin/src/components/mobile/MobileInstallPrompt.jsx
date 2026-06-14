import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePwaInstall } from '@/hooks/use-pwa-install';

const DISMISS_KEY = 'smk_a2hs_dismissed_at';
const DISMISS_DAYS = 14;

function wasRecentlyDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  const diffDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return diffDays < DISMISS_DAYS;
}

export default function MobileInstallPrompt() {
  const { ios, isStandalone, canPromptInstall, promptInstall } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone || wasRecentlyDismissed()) return;

    // Android/Chrome: el prompt nativo ya está disponible → mostrar banner.
    if (canPromptInstall) {
      setVisible(true);
      return;
    }

    // iOS no dispara beforeinstallprompt → mostrar hint manual tras 30s.
    if (ios) {
      const t = setTimeout(() => {
        if (!isStandalone) setIosHint(true);
      }, 30_000);
      return () => clearTimeout(t);
    }
  }, [isStandalone, canPromptInstall, ios]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setIosHint(false);
  };

  const install = async () => {
    const choice = await promptInstall();
    if (choice.outcome === 'dismissed') dismiss();
    setVisible(false);
  };

  if (!visible && !iosHint) return null;

  return (
    <div
      className="md:hidden fixed inset-x-3 bottom-3 rounded-[var(--mobile-radius-lg)] border border-border bg-card shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom"
      style={{
        zIndex: 'var(--z-mobile-toast)',
        marginBottom: `calc(var(--mobile-bottomnav-h) + var(--safe-bottom))`,
      }}
      role="dialog"
      aria-label="Instalar aplicación"
    >
      <div className="shrink-0 rounded-[var(--mobile-radius-md)] bg-primary/10 p-2 text-primary">
        <Download size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">Instala SmartKubik en tu pantalla</p>
        {iosHint ? (
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            Toca <Share size={12} className="inline mx-0.5" /> y luego "Añadir a pantalla de inicio".
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            Accede más rápido y trabaja sin abrir el navegador.
          </p>
        )}
        {!iosHint && (
          <button
            type="button"
            onClick={install}
            className="mt-2 text-sm font-medium text-primary no-tap-highlight"
          >
            Instalar
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="tap-target no-tap-highlight text-muted-foreground shrink-0"
      >
        <X size={18} />
      </button>
    </div>
  );
}
