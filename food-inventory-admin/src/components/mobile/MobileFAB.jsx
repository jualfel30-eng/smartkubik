import { useState } from 'react';
import { Plus, CalendarPlus, UserPlus, Receipt, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MobileActionSheet from './MobileActionSheet.jsx';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { SPRING } from '@/lib/motion';
import haptics from '@/lib/haptics';

const ACTIONS_BY_VERTICAL = {
  beauty: [
    { id: 'new-appointment', label: 'Nueva cita', icon: CalendarPlus, to: '/appointments?new=1' },
    { id: 'walk-in', label: 'Walk-in', icon: UserPlus, to: '/appointments?walkin=1' },
    { id: 'charge', label: 'Cobrar', icon: Receipt, to: '/cash-register' },
    { id: 'new-client', label: 'Nuevo cliente', icon: UserPlus, to: '/crm?new=1' },
  ],
  default: [
    { id: 'new-sale', label: 'Nueva venta', icon: ShoppingCart, to: '/orders/new' },
    { id: 'new-client', label: 'Nuevo cliente', icon: UserPlus, to: '/crm?new=1' },
    { id: 'charge', label: 'Cobrar', icon: Receipt, to: '/cash-register' },
  ],
};

export default function MobileFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isBeauty } = useMobileVertical();
  const actions = isBeauty ? ACTIONS_BY_VERTICAL.beauty : ACTIONS_BY_VERTICAL.default;

  const handleToggle = () => {
    haptics.select();
    setOpen((o) => !o);
  };

  const handlePick = (action) => {
    haptics.tap();
    setOpen(false);
    navigate(action.to);
  };

  return (
    <>
      <motion.button
        type="button"
        aria-label={open ? 'Cerrar acciones rápidas' : 'Acciones rápidas'}
        aria-expanded={open}
        onClick={handleToggle}
        whileTap={{ scale: 0.92 }}
        className="no-tap-highlight no-select absolute left-1/2 -translate-x-1/2 -top-6
                   rounded-full bg-primary text-primary-foreground
                   flex items-center justify-center"
        style={{
          width: 'var(--mobile-fab-size)',
          height: 'var(--mobile-fab-size)',
          zIndex: 'var(--z-mobile-fab)',
          boxShadow: 'var(--elevation-floating)',
        }}
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={SPRING.soft}
          className="flex items-center justify-center"
        >
          <Plus size={28} strokeWidth={2.4} />
        </motion.span>
      </motion.button>

      <MobileActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Acciones rápidas"
      >
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                type="button"
                onClick={() => handlePick(action)}
                whileTap={{ scale: 0.96 }}
                className="no-tap-highlight no-select flex flex-col items-center justify-center gap-2
                           border border-border bg-card p-4 min-h-[96px]"
                style={{
                  borderRadius: 'var(--mobile-radius-lg)',
                  boxShadow: 'var(--elevation-rest)',
                }}
              >
                <Icon size={26} className="text-primary" />
                <span className="text-sm font-medium">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </MobileActionSheet>
    </>
  );
}
