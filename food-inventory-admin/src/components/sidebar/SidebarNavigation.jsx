import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING, EASE, DUR } from '@/lib/motion';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useNotification } from '@/context/NotificationContext';
import { useTipsLabels } from '@/hooks/useTipsLabels';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { isNavItemVisible, getDisplayName as getNavDisplayName } from '@/lib/nav-utils';
import { getSidebarWhitelist } from '@/config/sidebarProfiles';
import { SIDEBAR_NAV_GROUPS } from '@/config/sidebarNavGroups';
import { AnimatedCollapsibleContent, sidebarChildItem } from './AnimatedCollapsible';
import { SidebarBadge, SidebarBadgeDot } from './SidebarBadge';

export default function SidebarNavigation({
  navLinks,
  activeTab,
  sidebarBadges,
  handleTabChange,
  tenant,
  hasPermission,
  memberships,
  restaurantModuleEnabled,
}) {
  const { state, setOpen, isMobile, setOpenMobile } = useSidebar();
  const { unreadCount } = useNotification();
  const tipsLabels = useTipsLabels();
  const { isFeatureEnabled } = useFeatureFlags();

  const sidebarWhitelist = useMemo(
    () => getSidebarWhitelist(tenant?.verticalProfile?.key),
    [tenant?.verticalProfile?.key]
  );

  const currentBasePath = activeTab.split('?')[0];

  const getDisplayName = (item) => getNavDisplayName(item, tenant?.verticalProfile?.key, tipsLabels);

  const isRouteActive = useCallback((itemHref) => {
    if (!itemHref) return false;
    if (activeTab === itemHref) return true;
    // If item href has query params, require exact match (already checked above)
    if (itemHref.includes('?')) return false;
    const itemBasePath = itemHref.split('?')[0];
    return itemBasePath === currentBasePath;
  }, [activeTab, currentBasePath]);

  const hasActiveChild = useCallback((item) => {
    if (!item.children) return false;
    return item.children.some(child => {
      if (child.href === activeTab) return true;
      if (!child.href.includes('?') && child.href.split('?')[0] === currentBasePath) return true;
      if (child.children) {
        return child.children.some(grandchild => {
          if (grandchild.href === activeTab) return true;
          return !grandchild.href.includes('?') && grandchild.href.split('?')[0] === currentBasePath;
        });
      }
      return false;
    });
  }, [activeTab, currentBasePath]);

  // Find the deepest active href (for layoutId pill — only one pill at a time)
  const deepestActiveHref = useMemo(() => {
    for (const item of navLinks) {
      if (item.children) {
        for (const child of item.children) {
          if (child.children) {
            for (const gc of child.children) {
              if (gc.href === activeTab) return gc.href;
              if (!gc.href.includes('?') && gc.href.split('?')[0] === currentBasePath) return gc.href;
            }
          }
          if (child.href === activeTab) return child.href;
          if (!child.href.includes('?') && child.href.split('?')[0] === currentBasePath) return child.href;
        }
      }
      if (item.href === activeTab || item.href.split('?')[0] === currentBasePath) {
        if (!item.children || !hasActiveChild(item)) return item.href;
      }
    }
    return null;
  }, [navLinks, activeTab, currentBasePath, hasActiveChild]);

  // --- openMenus state (auto-expand on route change) ---
  // Helper: check if href matches activeTab (exact for query-param hrefs, basePath for plain hrefs)
  const hrefMatchesTab = useCallback((href, tab, basePath) => {
    if (href === tab) return true;
    if (!href.includes('?') && href.split('?')[0] === basePath) return true;
    return false;
  }, []);

  const [openMenus, setOpenMenus] = useState(() => {
    const initial = {};
    const basePath = activeTab.split('?')[0];
    navLinks.forEach(item => {
      if (item.children?.length > 0) {
        const isActive = hrefMatchesTab(item.href, activeTab, basePath) ||
          item.children.some(child => {
            if (hrefMatchesTab(child.href, activeTab, basePath)) return true;
            if (child.children) return child.children.some(gc => hrefMatchesTab(gc.href, activeTab, basePath));
            return false;
          });
        initial[item.href] = isActive;
        if (isActive) {
          item.children.forEach(child => {
            if (child.children) {
              const childActive = hrefMatchesTab(child.href, activeTab, basePath) ||
                child.children.some(gc => hrefMatchesTab(gc.href, activeTab, basePath));
              initial[child.href] = childActive;
            }
          });
        }
      }
    });
    return initial;
  });

  useEffect(() => {
    setOpenMenus(prev => {
      const menusToOpen = {};
      let hasChanges = false;
      navLinks.forEach(item => {
        if (item.children?.length > 0) {
          const shouldBeOpen = hrefMatchesTab(item.href, activeTab, currentBasePath) ||
            item.children.some(child => {
              if (hrefMatchesTab(child.href, activeTab, currentBasePath)) return true;
              if (child.children) return child.children.some(gc => hrefMatchesTab(gc.href, activeTab, currentBasePath));
              return false;
            });
          if (shouldBeOpen && prev[item.href] !== true) {
            menusToOpen[item.href] = true;
            hasChanges = true;
          }
          if (shouldBeOpen && item.children) {
            item.children.forEach(child => {
              if (child.children) {
                const childShouldOpen = hrefMatchesTab(child.href, activeTab, currentBasePath) ||
                  child.children.some(gc => hrefMatchesTab(gc.href, activeTab, currentBasePath));
                if (childShouldOpen && prev[child.href] !== true) {
                  menusToOpen[child.href] = true;
                  hasChanges = true;
                }
              }
            });
          }
        }
      });
      return hasChanges ? { ...prev, ...menusToOpen } : prev;
    });
  }, [activeTab, currentBasePath, navLinks, hrefMatchesTab]);

  const handleNavigationClick = (href) => {
    if (!href) return;
    if (!isMobile && state === 'collapsed') setOpen(true);
    handleTabChange(href);
    if (isMobile) setOpenMobile(false);
  };

  const toggleMenu = useCallback((href, requestedState) => {
    setOpenMenus(prev => {
      if (requestedState === undefined) return { ...prev, [href]: !prev[href] };
      return { ...prev, [href]: requestedState };
    });
  }, []);

  // --- Grouped navLinks for section headers ---
  const groupedNavLinks = useMemo(() => {
    const hrefToItem = new Map(navLinks.map(item => [item.href, item]));
    const used = new Set();
    const groups = SIDEBAR_NAV_GROUPS.map(group => ({
      key: group.key,
      label: group.label,
      items: group.hrefs
        .filter(href => hrefToItem.has(href))
        .map(href => { used.add(href); return hrefToItem.get(href); }),
    })).filter(g => g.items.length > 0);

    const orphans = navLinks.filter(item => !used.has(item.href));
    if (orphans.length > 0) {
      groups.push({ key: 'other', label: 'Otros', items: orphans });
    }
    return groups;
  }, [navLinks]);

  // --- Badge helper ---
  const getBadge = (item) => {
    if (item.href === 'whatsapp') return { count: unreadCount, variant: 'destructive', dotColor: 'info' };
    const count = sidebarBadges[item.href];
    if (count > 0) return { count, variant: 'secondary', dotColor: 'destructive' };
    return null;
  };

  // --- Recursive renderMenuItem ---
  const renderMenuItem = (item, level = 0) => {
    if (!isNavItemVisible(item, {
      tenant, hasPermission, memberships, isFeatureEnabled,
      sidebarWhitelist, restaurantModuleEnabled, level,
    })) return null;

    const hasChildren = item.children?.length > 0;
    const isItemActive = isRouteActive(item.href) || (hasChildren && hasActiveChild(item));
    const isExactActive = item.href === deepestActiveHref;
    const badge = getBadge(item);

    if (hasChildren) {
      if (level === 0) {
        return (
          <Collapsible
            key={item.href}
            open={openMenus[item.href]}
            onOpenChange={(open) => toggleMenu(item.href, open)}
            asChild
          >
            <SidebarMenuItem className="relative">
              {/* Active pill only for parent items with no active child (exact match) */}
              {isExactActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-y-0.5 left-0.5 right-0.5 rounded-lg bg-primary/10 border border-primary/20"
                  transition={SPRING.soft}
                />
              )}
              <CollapsibleTrigger asChild>
                <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.15, ease: EASE.out }}>
                  <SidebarMenuButton
                    tooltip={getDisplayName(item)}
                    isActive={false}
                    className={cn(
                      'justify-start relative z-10 hover:!translate-x-0',
                      isItemActive && 'text-primary font-semibold',
                    )}
                    aria-label={getDisplayName(item)}
                    onClick={() => { if (state === 'collapsed') setOpen(true); }}
                  >
                    <span className="relative">
                      <item.icon strokeWidth={1.25} />
                      {state === 'collapsed' && badge && (
                        <SidebarBadgeDot color={badge.dotColor} />
                      )}
                    </span>
                    <span className="font-medium text-[0.78rem] group-data-[collapsible=icon]:hidden">{getDisplayName(item)}</span>
                    {state !== 'collapsed' && badge && !openMenus[item.href] && (
                      <SidebarBadge count={badge.count} variant={badge.variant} className="group-data-[collapsible=icon]:hidden" />
                    )}
                    <motion.div
                      animate={{ rotate: openMenus[item.href] ? 90 : 0 }}
                      transition={SPRING.snappy}
                      className="ml-auto group-data-[collapsible=icon]:hidden"
                    >
                      <ChevronRight className="size-4" />
                    </motion.div>
                  </SidebarMenuButton>
                </motion.div>
              </CollapsibleTrigger>
              <AnimatedCollapsibleContent isOpen={openMenus[item.href]}>
                <SidebarMenuSub>
                  {item.children.map(child => (
                    <motion.div key={child.href} variants={sidebarChildItem}>
                      {renderMenuItem(child, level + 1)}
                    </motion.div>
                  ))}
                </SidebarMenuSub>
              </AnimatedCollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        );
      } else {
        // Level 1+: nested collapsible
        return (
          <Collapsible
            key={item.href}
            open={openMenus[item.href]}
            onOpenChange={(open) => toggleMenu(item.href, open)}
            asChild
          >
            <SidebarMenuSubItem className="relative">
              {isExactActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-y-0.5 left-0.5 right-0.5 rounded-lg bg-primary/10 border border-primary/20"
                  transition={SPRING.soft}
                />
              )}
              <CollapsibleTrigger asChild>
                <SidebarMenuSubButton
                  isActive={false}
                  className={cn('w-full relative z-10', isItemActive && 'text-primary font-semibold')}
                >
                  <item.icon strokeWidth={1.25} />
                  <span>{getDisplayName(item)}</span>
                  <motion.div
                    animate={{ rotate: openMenus[item.href] ? 90 : 0 }}
                    transition={SPRING.snappy}
                    className="ml-auto"
                  >
                    <ChevronRight className="size-4" />
                  </motion.div>
                </SidebarMenuSubButton>
              </CollapsibleTrigger>
              <AnimatedCollapsibleContent isOpen={openMenus[item.href]}>
                <SidebarMenuSub className="ml-3">
                  {item.children.map(child => (
                    <motion.div key={child.href} variants={sidebarChildItem}>
                      {renderMenuItem(child, level + 1)}
                    </motion.div>
                  ))}
                </SidebarMenuSub>
              </AnimatedCollapsibleContent>
            </SidebarMenuSubItem>
          </Collapsible>
        );
      }
    }

    // Leaf items (no children)
    if (level === 0) {
      return (
        <SidebarMenuItem key={item.href} className="relative">
          {isExactActive && (
            <motion.div
              layoutId="sidebar-active-pill"
              className="absolute inset-y-0.5 left-0.5 right-0.5 rounded-lg bg-primary/10 border border-primary/20"
              transition={SPRING.soft}
            />
          )}
          <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.15, ease: EASE.out }}>
            <SidebarMenuButton
              tooltip={getDisplayName(item)}
              isActive={false}
              className={cn(
                'relative z-10 hover:!translate-x-0',
                isExactActive && 'text-primary font-semibold',
              )}
              aria-label={getDisplayName(item)}
              onClick={() => handleNavigationClick(item.href)}
            >
              <span className="relative">
                <item.icon strokeWidth={1.25} />
                {state === 'collapsed' && badge && (
                  <SidebarBadgeDot color={badge.dotColor} />
                )}
              </span>
              <span className="font-medium text-[0.78rem] group-data-[collapsible=icon]:hidden flex-1">{getDisplayName(item)}</span>
              {state !== 'collapsed' && badge && (
                <SidebarBadge
                  count={badge.count}
                  variant={badge.variant}
                  className="ml-auto group-data-[collapsible=icon]:hidden"
                />
              )}
            </SidebarMenuButton>
          </motion.div>
        </SidebarMenuItem>
      );
    } else {
      return (
        <SidebarMenuSubItem key={item.href} className="relative">
          {isExactActive && (
            <motion.div
              layoutId="sidebar-active-pill"
              className="absolute inset-y-0.5 left-0.5 right-0.5 rounded-lg bg-primary/10 border border-primary/20"
              transition={SPRING.soft}
            />
          )}
          <SidebarMenuSubButton
            asChild
            isActive={false}
            className={cn('relative z-10', isExactActive && 'text-primary font-semibold')}
          >
            <button onClick={() => handleNavigationClick(item.href)} className="w-full">
              <item.icon strokeWidth={1.25} />
              <span>{getDisplayName(item)}</span>
            </button>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    }
  };

  // --- Quick search button ---
  const openCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };

  return (
    <>
      {/* Quick search */}
      {state !== 'collapsed' ? (
        <div className="px-1 pb-3">
          <button
            onClick={openCommandPalette}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
          </button>
        </div>
      ) : (
        <div className="px-1 pb-2 flex justify-center">
          <SidebarMenuButton
            tooltip="Buscar (⌘K)"
            onClick={openCommandPalette}
            className="w-auto"
          >
            <Search strokeWidth={1.25} />
          </SidebarMenuButton>
        </div>
      )}

      {/* Grouped navigation */}
      <SidebarMenu>
        {groupedNavLinks.map(group => (
          <Fragment key={group.key}>
            {group.label && (
              <li className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] px-3 pt-4 pb-1 group-data-[collapsible=icon]:hidden select-none">
                {group.label}
              </li>
            )}
            {group.items.map(link => renderMenuItem(link))}
          </Fragment>
        ))}
      </SidebarMenu>
    </>
  );
}
