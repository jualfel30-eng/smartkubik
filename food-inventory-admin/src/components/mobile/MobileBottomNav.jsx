import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, Home, Users, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import { fetchApi } from '@/lib/api';
import MobileFAB from './MobileFAB.jsx';
import { onBadgeUpdate } from '@/lib/badge-events';

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

function BadgeDot({ count }) {
  const prevCountRef = useRef(count);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (count !== prevCountRef.current) {
      prevCountRef.current = count;
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 400);
      return () => clearTimeout(t);
    }
  }, [count]);

  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-0.5 leading-none',
        animating && 'animate-badge-bounce',
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

function TabItem({ to, label, Icon, active, badge = 0 }) {
  const { shouldReduce, t } = useReducedMotionSafe();
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
          layoutId={shouldReduce ? undefined : 'mobile-nav-pill'}
          className="absolute top-1.5 h-1 w-8 rounded-full bg-primary"
          transition={t(SPRING.soft)}
          aria-hidden
        />
      )}
      <motion.span
        animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
        transition={t(SPRING.soft)}
        className="flex flex-col items-center gap-0.5"
      >
        <span className="relative">
          <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
          <BadgeDot count={badge} />
        </span>
        <span className="leading-none transition-colors">{label}</span>
      </motion.span>
    </NavLink>
  );
}

export default function MobileBottomNav() {
  const { isBeauty } = useMobileVertical();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);

  const loadCounts = useCallback(async () => {
    if (!isBeauty) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetchApi(`/beauty-bookings?startDate=${today}&endDate=${today}`);
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setPendingCount(raw.filter(b => b.status === 'pending' || b.status === 'confirmed').length);
      setUnpaidCount(raw.filter(b => b.status === 'completed' && b.paymentStatus !== 'paid').length);
    } catch { /* silent */ }
  }, [isBeauty]);

  // Initial load + 60s polling
  useEffect(() => {
    if (!isBeauty) return;
    loadCounts();
    const interval = setInterval(loadCounts, 60000);
    return () => clearInterval(interval);
  }, [isBeauty, loadCounts]);

  // Real-time badge updates: re-fetch immediately when events are emitted
  useEffect(() => {
    const unsub = onBadgeUpdate(() => {
      loadCounts();
    });
    return unsub;
  }, [loadCounts]);

  const rawTabs = isBeauty ? TAB_CONFIGS.beauty : TAB_CONFIGS.default;
  const tabs = rawTabs.map(tab => {
    if (!tab.to) return tab;
    if (isBeauty && tab.to === '/appointments') return { ...tab, badge: pendingCount };
    if (isBeauty && tab.to === '/dashboard') return { ...tab, badge: unpaidCount };
    return tab;
  });

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
            badge={tab.badge || 0}
          />
        );
      })}
    </nav>
  );
}
