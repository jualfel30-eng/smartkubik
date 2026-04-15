import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, Home, Users, Menu } from 'lucide-react';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { cn } from '@/lib/utils';
import MobileFAB from './MobileFAB.jsx';

// Tabs por vertical. Hoy solo beauty tiene un set específico; el resto
// recibe un set por defecto coherente con el ERP actual.
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
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5 tap-target no-tap-highlight no-select',
        'text-[11px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
      <span className="leading-none">{label}</span>
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
