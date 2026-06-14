import { useState } from 'react';
import { Download, Share, Plus, ChevronRight } from 'lucide-react';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import MobileActionSheet from './MobileActionSheet';
import haptics from '@/lib/haptics';

/**
 * Punto de entrada PERMANENTE para instalar la app, vive dentro del menú "Más".
 * A diferencia del banner (efímero, se descarta 14 días), esta tarjeta siempre
 * está disponible mientras la app no esté instalada — así un tenant que cerró el
 * banner o reinstaló su teléfono puede volver a agregar el acceso directo.
 *
 * Android/Chrome: dispara el prompt nativo.
 * iOS: abre una hoja con las instrucciones de Compartir → Añadir a inicio.
 */
export default function MobileInstallCard() {
  const { ios, isStandalone, canPromptInstall, promptInstall } = usePwaInstall();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Ya instalada, o no hay forma de instalar (p.ej. desktop sin el evento).
  if (isStandalone) return null;
  if (!canPromptInstall && !ios) return null;

  const handleClick = async () => {
    haptics.tap();
    if (canPromptInstall) {
      await promptInstall();
    } else {
      // iOS: instrucciones manuales.
      setSheetOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left no-tap-highlight mb-6"
        style={{
          background: 'linear-gradient(135deg, var(--glass-subtle), transparent)',
          borderRadius: 'var(--mobile-radius-xl)',
          boxShadow: 'var(--elevation-rest)',
          border: '1px solid color-mix(in srgb, var(--primary) 22%, transparent)',
        }}
        aria-label="Instalar la app en tu teléfono"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-primary"
          style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)' }}
        >
          <Download size={16} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-foreground leading-tight">
            Instala la app en tu teléfono
          </p>
          <p className="text-[12px] text-muted-foreground/70 leading-snug mt-0.5">
            Entra directo a tu panel sin abrir el navegador.
          </p>
        </div>
        <ChevronRight size={14} strokeWidth={1.5} className="text-muted-foreground/30 shrink-0" />
      </button>

      <MobileActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Añadir a pantalla de inicio"
      >
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
          En iPhone se agrega en dos toques desde Safari:
        </p>
        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center">
              1
            </span>
            <span className="text-[14px] text-foreground/90 leading-snug">
              Toca el botón <Share size={14} className="inline mx-0.5 -mt-0.5" /> Compartir,
              abajo en la barra de Safari.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center">
              2
            </span>
            <span className="text-[14px] text-foreground/90 leading-snug">
              Desliza y elige <Plus size={14} className="inline mx-0.5 -mt-0.5" />
              <strong className="font-semibold"> "Añadir a pantalla de inicio"</strong>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center">
              3
            </span>
            <span className="text-[14px] text-foreground/90 leading-snug">
              Confirma con <strong className="font-semibold">Añadir</strong>. Listo: el ícono
              queda en tu inicio y abre directo el panel.
            </span>
          </li>
        </ol>
      </MobileActionSheet>
    </>
  );
}
