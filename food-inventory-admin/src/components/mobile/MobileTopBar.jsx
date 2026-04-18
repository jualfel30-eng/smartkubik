import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';

// MobileTopBar — se oculta al hacer scroll hacia abajo y reaparece al subir.
// Recibe las mismas props que necesita el header mobile actual de App.jsx.
export default function MobileTopBar({ logoSrc, onAssistantOpen, onLogout, children }) {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const scrollEl = document.querySelector('[data-mobile-scroll]') || window;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = scrollEl === window ? window.scrollY : scrollEl.scrollTop;
        // Sólo ocultar si el usuario bajó más de 8px; mostrar siempre al subir
        if (y > lastY.current + 8) setHidden(true);
        else if (y < lastY.current - 4) setHidden(false);
        lastY.current = y;
        ticking.current = false;
      });
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={cn(
        'md:hidden flex items-center justify-between border-b border-border bg-card/95 backdrop-blur px-4 py-3 z-40',
        'transition-transform duration-200 ease-out',
        hidden ? '-translate-y-full' : 'translate-y-0',
      )}
      style={{ position: 'sticky', top: 0 }}
    >
      <div className="flex items-center gap-2">
        {logoSrc && <img src={logoSrc} alt="SmartKubik" className="h-[18px] w-auto" />}
      </div>
      <div className="flex items-center gap-1">
        {children}
        {onAssistantOpen && (
          <Button variant="ghost" size="icon" onClick={onAssistantOpen} title="Asistente">
            <Sparkles className="h-5 w-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <Settings className="h-5 w-5" />
        </Button>
        {onLogout && (
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
