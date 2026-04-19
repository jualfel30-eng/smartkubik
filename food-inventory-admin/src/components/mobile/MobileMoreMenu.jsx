import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Settings, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { useSidebarBadges } from '@/hooks/use-sidebar-badges';
import { useNotification } from '@/context/NotificationContext';
import { useTipsLabels } from '@/hooks/useTipsLabels';
import { getSidebarWhitelist } from '@/config/sidebarProfiles';
import { getNavLinks } from '@/config/navLinks';
import { isNavItemVisible, getDisplayName } from '@/lib/nav-utils';
import { MOBILE_NAV_GROUPS, BOTTOM_NAV_HREFS } from '@/config/mobileNavGroups';
import { STAGGER, listItem, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';

// ── Color gradients per group (matches onboarding icon orb pattern) ──
const GROUP_GRADIENT = {
  operations: ['#c084fc', '#a855f7'],
  'sales-marketing': ['#38bdf8', '#0ea5e9'],
  'finance-hr': ['#4ade80', '#22c55e'],
  system: ['#fb923c', '#f97316'],
};

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function BadgeCount({ count, color = 'destructive' }) {
  if (!count || count <= 0) return null;
  const colors = {
    destructive: 'bg-destructive text-destructive-foreground',
    amber: 'bg-amber-500 text-white',
    blue: 'bg-blue-500 text-white',
  };
  return (
    <span className={`${colors[color] || colors.destructive} text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function NavRow({ item, displayName, badge, badgeColor, gradient, onNavigate }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => { haptics.tap(); onNavigate(`/${item.href}`); }}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left no-tap-highlight transition-colors group"
      style={{ background: 'transparent' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${gradient[0]}15, ${gradient[1]}08)`,
        }}
      >
        <Icon
          size={16}
          strokeWidth={1.5}
          className="transition-colors duration-300"
          style={{ color: `${gradient[0]}B0` }}
        />
      </div>
      <span className="flex-1 text-[14px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">
        {displayName}
      </span>
      <BadgeCount count={badge} color={badgeColor} />
      <ChevronRight size={14} strokeWidth={1.5} className="text-muted-foreground/25 shrink-0" />
    </button>
  );
}

export default function MobileMoreMenu() {
  const { tenant, user, hasPermission, memberships } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const sidebarBadges = useSidebarBadges(!!tenant);
  const { unreadCount } = useNotification();
  const tipsLabels = useTipsLabels();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const profileKey = tenant?.verticalProfile?.key;
  const sidebarWhitelist = useMemo(
    () => getSidebarWhitelist(profileKey),
    [profileKey]
  );

  const restaurantModuleEnabled = useMemo(() => Boolean(
    tenant?.enabledModules?.restaurant ||
    tenant?.enabledModules?.tables ||
    tenant?.enabledModules?.kitchenDisplay ||
    tenant?.enabledModules?.menuEngineering
  ), [tenant?.enabledModules]);

  const filterCtx = useMemo(() => ({
    tenant, hasPermission, memberships, isFeatureEnabled,
    sidebarWhitelist, restaurantModuleEnabled, level: 0,
  }), [tenant, hasPermission, memberships, isFeatureEnabled, sidebarWhitelist, restaurantModuleEnabled]);

  const navLinks = useMemo(() => getNavLinks(tenant), [tenant]);
  const navLinkMap = useMemo(() => {
    const map = {};
    for (const item of navLinks) map[item.href] = item;
    return map;
  }, [navLinks]);

  const badgeMap = useMemo(() => {
    const map = {};
    if (sidebarBadges['inventory-management'] > 0)
      map['inventory-management'] = { count: sidebarBadges['inventory-management'], color: 'destructive' };
    if (unreadCount > 0)
      map['whatsapp'] = { count: unreadCount, color: 'blue' };
    if (sidebarBadges['commissions'] > 0)
      map['commissions'] = { count: sidebarBadges['commissions'], color: 'amber' };
    return map;
  }, [sidebarBadges, unreadCount]);

  const groups = useMemo(() => {
    const result = [];
    for (const group of MOBILE_NAV_GROUPS) {
      const items = [];
      for (const href of group.hrefs) {
        if (BOTTOM_NAV_HREFS.has(href)) continue;
        const item = navLinkMap[href];
        if (!item) continue;
        if (!isNavItemVisible(item, filterCtx)) continue;
        const displayName = getDisplayName(item, profileKey, tipsLabels);
        items.push({ item, displayName, href });
      }
      if (items.length > 0) result.push({ ...group, items });
    }
    return result;
  }, [navLinkMap, filterCtx, profileKey, tipsLabels]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = stripAccents(searchQuery.trim());
    return groups
      .map(group => ({
        ...group,
        items: group.items.filter(({ displayName }) =>
          stripAccents(displayName).includes(query)
        ),
      }))
      .filter(group => group.items.length > 0);
  }, [groups, searchQuery]);

  const handleNavigate = useCallback((path) => navigate(path), [navigate]);

  return (
    <div className="md:hidden mobile-content-pad pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 pt-1">
        <div>
          <p className="text-[11px] text-muted-foreground/50 font-medium tracking-wide">
            {tenant?.name || 'SmartKubik'}
          </p>
          <h1 className="text-[22px] font-extrabold tracking-tight mt-0.5">
            {user?.firstName || 'Menu'}
          </h1>
        </div>
        <Link
          to="/settings"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors"
          style={{ background: 'var(--glass-subtle)' }}
          aria-label="Configuración"
        >
          <Settings size={18} strokeWidth={1.5} />
        </Link>
      </header>

      {/* Search Bar */}
      <div className="sticky top-0 z-10 pb-4 bg-background">
        <div className="relative">
          <Search size={15} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => haptics.select()}
            placeholder="Buscar..."
            className="w-full py-3 pl-10 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/30 outline-none transition-all duration-300"
            style={{
              borderRadius: 'var(--mobile-radius-xl)',
              background: 'var(--glass-subtle)',
            }}
          />
        </div>
      </div>

      {/* Grouped Sections */}
      <AnimatePresence mode="popLayout">
        {filteredGroups.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--glass-subtle)' }}>
              <Search size={20} strokeWidth={1.5} className="text-muted-foreground/25" />
            </div>
            <p className="text-[14px] text-muted-foreground/40">Sin resultados</p>
          </motion.div>
        ) : (
          <motion.div
            key="groups"
            initial="hidden"
            animate="visible"
            variants={{ visible: STAGGER(0.06) }}
            className="space-y-6"
          >
            {filteredGroups.map((group) => {
              const gradient = GROUP_GRADIENT[group.key] || GROUP_GRADIENT.system;
              return (
                <motion.section key={group.key} variants={listItem}>
                  <h2 className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-[0.15em] mb-2 px-1">
                    {group.label}
                  </h2>
                  <div
                    className="bg-card overflow-hidden"
                    style={{
                      borderRadius: 'var(--mobile-radius-xl)',
                      boxShadow: 'var(--elevation-rest)',
                    }}
                  >
                    {group.items.map(({ item, displayName, href }, i) => (
                      <div key={href}>
                        {i > 0 && (
                          <div className="mx-4" style={{ height: '1px', background: 'var(--glass-subtle)' }} />
                        )}
                        <NavRow
                          item={item}
                          displayName={displayName}
                          badge={badgeMap[href]?.count}
                          badgeColor={badgeMap[href]?.color}
                          gradient={gradient}
                          onNavigate={handleNavigate}
                        />
                      </div>
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
