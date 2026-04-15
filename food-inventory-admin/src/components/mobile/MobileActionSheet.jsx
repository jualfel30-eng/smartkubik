import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Bottom sheet mobile. Usa el patrón Radix Dialog subyacente sería ideal,
// pero aquí mantenemos implementación simple para evitar dependencias extra.
// Próximas iteraciones: reemplazar por <Drawer> de vaul / Radix + snap points.

export default function MobileActionSheet({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 md:hidden"
      style={{ zIndex: 'var(--z-mobile-sheet)' }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 animate-in fade-in"
      />
      <div
        className={cn(
          'absolute bottom-0 inset-x-0 bg-card rounded-t-2xl shadow-2xl',
          'animate-in slide-in-from-bottom duration-300',
          'safe-bottom',
          className,
        )}
      >
        <div className="flex justify-center pt-2 pb-1">
          <span className="block w-10 h-1 rounded-full bg-muted-foreground/40" aria-hidden />
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="tap-target no-tap-highlight text-muted-foreground"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-4 pb-4 pt-2">{children}</div>
      </div>
    </div>
  );
}
