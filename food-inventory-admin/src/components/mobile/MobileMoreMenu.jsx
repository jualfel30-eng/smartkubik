import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ChevronRight, Settings } from 'lucide-react';
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
import { SPRING, STAGGER, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function BadgeCount({ count, color = 'destructive' }) {
  if (!count || count <= 0) return null;

  const colorClasses = {
    destructive: 'bg-destructive text-destructive-foreground',
    amber: 'bg-amber-500 text-white',
    blue: 'bg-blue-500 text-white',
  };

  return (
    <motion.span
      key={count}
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={SPRING.bouncy}
      className={`${colorClasses[color] || colorClasses.destructive} text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1`}
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
}

function NavRow({ item, displayName, badge, badgeColor, onNavigate }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => {
        haptics.tap();
        onNavigate(`/${item.href}`);
      }}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left no-tap-highlight active:bg-muted transition-colors"
    >
      <Icon size={18} className="text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm font-medium">{displayName}</span>
      <BadgeCount count={badge} color={badgeColor} />
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
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
    tenant,
    hasPermission,
    memberships,
    isFeatureEnabled,
    sidebarWhitelist,
    restaurantModuleEnabled,
    level: 0,
  }), [tenant, hasPermission, memberships, isFeatureEnabled, sidebarWhitelist, restaurantModuleEnabled]);

  // Build a map of href → navLink item for quick lookup
  const navLinks = useMemo(() => getNavLinks(tenant), [tenant]);
  const navLinkMap = useMemo(() => {
    const map = {};
    for (const item of navLinks) {
      map[item.href] = item;
    }
    return map;
  }, [navLinks]);

  // Badge map: href → { count, color }
  const badgeMap = useMemo(() => {
    const map = {};
    if (sidebarBadges['inventory-management'] > 0) {
      map['inventory-management'] = { count: sidebarBadges['inventory-management'], color: 'destructive' };
    }
    if (unreadCount > 0) {
      map['whatsapp'] = { count: unreadCount, color: 'blue' };
    }
    // Commissions badge from sidebar badges if available
    if (sidebarBadges['commissions'] > 0) {
      map['commissions'] = { count: sidebarBadges['commissions'], color: 'amber' };
    }
    return map;
  }, [sidebarBadges, unreadCount]);

  // Build grouped items: each group gets its visible items resolved
  const groups = useMemo(() => {
    const result = [];

    for (const group of MOBILE_NAV_GROUPS) {
      const items = [];

      for (const href of group.hrefs) {
        // Skip items already in bottom nav
        if (BOTTOM_NAV_HREFS.has(href)) continue;

        const item = navLinkMap[href];
        if (!item) continue;

        if (!isNavItemVisible(item, filterCtx)) continue;

        const displayName = getDisplayName(item, profileKey, tipsLabels);
        items.push({ item, displayName, href });
      }

      if (items.length > 0) {
        result.push({ ...group, items });
      }
    }

    return result;
  }, [navLinkMap, filterCtx, profileKey, tipsLabels]);

  // Apply search filter
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

  const handleNavigate = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  return (
    <div className="md:hidden mobile-content-pad pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Más</h1>
          <p className="text-sm text-muted-foreground">
            {tenant?.name || 'SmartKubik'} · {user?.firstName || 'Usuario'}
          </p>
        </div>
        <Link
          to="/settings"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Configuración"
        >
          <Settings size={20} />
        </Link>
      </header>

      {/* Search Bar */}
      <div className="sticky top-0 z-10 pb-3 bg-background">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => haptics.select()}
            placeholder="Buscar módulo..."
            className="w-full bg-muted rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
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
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
          >
            <Search size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No se encontró el módulo</p>
          </motion.div>
        ) : (
          <motion.div
            key="groups"
            initial="hidden"
            animate="visible"
            variants={{ visible: STAGGER(0.05) }}
            className="space-y-5"
          >
            {filteredGroups.map((group) => (
              <motion.section key={group.key} variants={listItem}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {group.label}
                </h2>
                <div className="bg-card rounded-[var(--mobile-radius-lg,12px)] border border-border divide-y divide-border overflow-hidden">
                  {group.items.map(({ item, displayName, href }) => (
                    <NavRow
                      key={href}
                      item={item}
                      displayName={displayName}
                      badge={badgeMap[href]?.count}
                      badgeColor={badgeMap[href]?.color}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              </motion.section>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
