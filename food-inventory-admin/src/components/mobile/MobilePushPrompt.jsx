import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { toast } from '@/lib/toast';

// Mostramos el prompt de permisos con contexto claro DESPUÉS de que el usuario
// ha usado la app un momento (se monta en TodayDashboard con delay).
// No pedimos permiso al cargar — evita los "Block" reflejos de los usuarios.

export default function MobilePushPrompt() {
  const { shouldPrompt, subscribe } = usePushNotifications();
  if (!shouldPrompt) return null;

  const handleAccept = async () => {
    const ok = await subscribe();
    if (ok) toast.success('Notificaciones activadas');
  };

  const handleDismiss = () => {
    // marcar como declinado (el hook hace el localStorage)
    localStorage.setItem('smk_push_declined_at', String(Date.now()));
    // forzar re-render quitando el prompt
    window.dispatchEvent(new Event('smk_push_dismissed'));
  };

  return (
    <div
      className="md:hidden flex items-start gap-3 rounded-[var(--mobile-radius-lg)] border border-primary/20 bg-primary/5 p-4"
      role="dialog"
      aria-label="Activar notificaciones"
    >
      <div className="shrink-0 rounded-[var(--mobile-radius-md)] bg-primary/10 p-2 text-primary mt-0.5">
        <Bell size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">¿Activar notificaciones?</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          Recibe alertas de nuevas citas, clientes que llegan y cobros pendientes.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={handleAccept}
            className="text-sm font-semibold text-primary no-tap-highlight"
          >
            Activar
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm text-muted-foreground no-tap-highlight"
          >
            Ahora no
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Cerrar"
        className="tap-target no-tap-highlight text-muted-foreground shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
