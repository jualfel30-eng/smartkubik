import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileActionSheet from './MobileActionSheet.jsx';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { CalendarPlus, UserPlus, Receipt, ShoppingCart } from 'lucide-react';

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

  const handlePick = (action) => {
    setOpen(false);
    navigate(action.to);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Acciones rápidas"
        onClick={() => setOpen(true)}
        className="no-tap-highlight no-select absolute left-1/2 -translate-x-1/2 -top-6
                   rounded-full bg-primary text-primary-foreground
                   shadow-lg active:scale-95 transition-transform
                   flex items-center justify-center"
        style={{
          width: 'var(--mobile-fab-size)',
          height: 'var(--mobile-fab-size)',
          zIndex: 'var(--z-mobile-fab)',
        }}
      >
        <Plus size={28} strokeWidth={2.4} />
      </button>

      <MobileActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Acciones rápidas"
      >
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handlePick(action)}
                className="no-tap-highlight no-select flex flex-col items-center justify-center gap-2
                           rounded-2xl border border-border bg-card p-4
                           min-h-[96px] active:scale-[0.98] transition-transform"
              >
                <Icon size={26} className="text-primary" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      </MobileActionSheet>
    </>
  );
}
