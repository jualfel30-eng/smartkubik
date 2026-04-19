import { useState, useRef } from 'react';
import { Plus, CalendarPlus, UserPlus, Receipt, ShoppingCart, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MobileActionSheet from './MobileActionSheet.jsx';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { SPRING, STAGGER, scaleIn } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useFabContext } from '@/contexts/FabContext';

const ACTIONS_BY_VERTICAL = {
  beauty: [
    { id: 'new-appointment', label: 'Nueva cita', icon: CalendarPlus, to: '/appointments?new=1', gradient: ['#c084fc', '#a855f7'] },
    { id: 'walk-in', label: 'Walk-in', icon: UserPlus, to: '/appointments?walkin=1', gradient: ['#4ade80', '#22c55e'] },
    { id: 'charge', label: 'Cobrar', icon: Receipt, to: '/appointments?charge=1', gradient: ['#fb923c', '#f97316'] },
    { id: 'next-apt', label: 'Siguiente', icon: Clock, to: '/appointments?next=1', gradient: ['#38bdf8', '#0ea5e9'] },
  ],
  default: [
    { id: 'new-sale', label: 'Nueva venta', icon: ShoppingCart, to: '/orders/new', gradient: ['#c084fc', '#a855f7'] },
    { id: 'new-client', label: 'Nuevo cliente', icon: UserPlus, to: '/crm?new=1', gradient: ['#4ade80', '#22c55e'] },
    { id: 'charge', label: 'Cobrar', icon: Receipt, to: '/cash-register', gradient: ['#fb923c', '#f97316'] },
  ],
};

// Long-press threshold in ms
const LONG_PRESS_MS = 500;

export default function MobileFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isBeauty } = useMobileVertical();
  const { contextAction } = useFabContext();
  const actions = isBeauty ? ACTIONS_BY_VERTICAL.beauty : ACTIONS_BY_VERTICAL.default;

  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const clearTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePressStart = () => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      haptics.select();
      setOpen(true); // Always open full menu on long-press (escape hatch)
    }, LONG_PRESS_MS);
  };

  const handlePressEnd = () => {
    clearTimer();
    if (!isLongPress.current) {
      if (contextAction) {
        // Single tap with context: execute contextAction directly
        haptics.tap();
        contextAction.action();
      } else {
        // Single tap, no context: open standard menu
        haptics.select();
        setOpen(true);
      }
    }
  };

  const handlePick = (action) => {
    haptics.tap();
    setOpen(false);
    navigate(action.to);
  };

  // Determine FAB icon: use contextAction's icon if set, else Plus
  const FabIcon = contextAction?.icon || Plus;

  return (
    <>
      <motion.button
        type="button"
        aria-label={open ? 'Cerrar acciones rápidas' : (contextAction?.label || 'Acciones rápidas')}
        aria-expanded={open}
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerLeave={clearTimer}
        onPointerCancel={clearTimer}
        whileTap={{ scale: 0.92 }}
        className="no-tap-highlight no-select absolute left-1/2 -translate-x-1/2 -top-6
                   rounded-full text-white
                   flex items-center justify-center transition-all duration-300"
        style={{
          width: 'var(--mobile-fab-size)',
          height: 'var(--mobile-fab-size)',
          zIndex: 'var(--z-mobile-fab)',
          background: 'var(--gradient-primary)',
          boxShadow: '0 4px 20px oklch(0.62 0.22 268 / 0.35), var(--elevation-floating)',
        }}
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={SPRING.soft}
          className="flex items-center justify-center"
        >
          <FabIcon size={24} strokeWidth={2} />
        </motion.span>
      </motion.button>

      {/* Context label tooltip — visible when a contextAction is active and menu is closed */}
      {contextAction && !open && (
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap pointer-events-none"
          style={{ zIndex: 'var(--z-mobile-fab)' }}
        >
          {contextAction.label}
        </div>
      )}

      <MobileActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Acciones rápidas"
      >
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={STAGGER(0.06, 0.05)}
          initial="initial"
          animate="animate"
        >
          {actions.map((action) => {
            const Icon = action.icon;
            const [g1, g2] = action.gradient;
            return (
              <motion.button
                key={action.id}
                type="button"
                variants={scaleIn}
                onClick={() => handlePick(action)}
                whileTap={{ scale: 0.96 }}
                className="no-tap-highlight no-select flex flex-col items-center justify-center gap-3 p-5"
                style={{
                  borderRadius: 'var(--mobile-radius-xl)',
                  background: `linear-gradient(135deg, ${g1}10, ${g2}06)`,
                  boxShadow: 'var(--elevation-rest)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${g1}25, ${g2}15)`,
                  }}
                >
                  <Icon size={22} strokeWidth={1.5} style={{ color: g1 }} />
                </div>
                <span className="text-[13px] font-semibold text-foreground/80">{action.label}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </MobileActionSheet>
    </>
  );
}
