import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, Home, Users, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion';
import haptics from '@/lib/haptics';
import MobileFAB from './MobileFAB.jsx';

const TAB_CONFIGS = {
  beauty: [
    { to: '/dashboard', label: 'Hoy', icon: Home },
    { to: '/appointments', label: 'Agenda', icon: CalendarDays },
    { slot: 'fab' },
    { to: '/crm', label: 'Clientes', icon: Users },
    { to: '/mas', label: 'Más', icon: Menu },
  ],
  default: [
    { to: '/dashboard', label: 'Inicio', icon: Home },
    { to: '/orders/new', label: 'Ventas', icon: CalendarDays },
    { slot: 'fab' },
    { to: '/crm', label: 'Clientes', icon: Users },
    { to: '/mas', label: 'Más', icon: Menu },
  ],
};

function TabItem({ to, label, Icon, active }) {
  return (
    <NavLink
      to={to}
      onClick={() => { if (!active) haptics.tap(); }}
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center gap-0.5 tap-target no-tap-highlight no-select',
        'text-[11px] font-medium',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {active && (
        <motion.span
          layoutId="mobile-nav-pill"
          className="absolute top-1.5 h-1 w-8 rounded-full bg-primary"
          transition={SPRING.soft}
          aria-hidden
        />
      )}
      <motion.span
        animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
        transition={SPRING.soft}
        className="flex flex-col items-center gap-0.5"
      >
        <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
        <span className="leading-none transition-colors">{label}</span>
      </motion.span>
    </NavLink>
  );
}

export default function MobileBottomNav() {
  const { isBeauty } = useMobileVertical();
  const location = useLocation();
  const tabs = isBeauty ? TAB_CONFIGS.beauty : TAB_CONFIGS.default;

  const isActive = (to) => {
    if (to === '/dashboard') return location.pathname === '/' || location.pathname.startsWith('/dashboard');
    return location.pathname.startsWith(to);
  };

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'md:hidden fixed bottom-0 inset-x-0',
        'bg-card/95 backdrop-blur border-t border-border',
        'flex items-stretch justify-between',
        'safe-bottom',
      )}
      style={{
        height: `calc(var(--mobile-bottomnav-h) + var(--safe-bottom))`,
        zIndex: 'var(--z-mobile-bottomnav)',
        boxShadow: 'var(--elevation-raised)',
      }}
    >
      {tabs.map((tab, idx) => {
        if (tab.slot === 'fab') {
          return <div key={`fab-${idx}`} className="flex-1 relative"><MobileFAB /></div>;
        }
        return (
          <TabItem
            key={tab.to}
            to={tab.to}
            label={tab.label}
            Icon={tab.icon}
            active={isActive(tab.to)}
          />
        );
      })}
    </nav>
  );
}
