import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { initClarity, identifyUser } from '@/lib/analytics';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth, AuthProvider } from './hooks/use-auth.jsx';
import { useShift, ShiftProvider } from './context/ShiftContext.jsx';
import { useTheme } from '@/components/ThemeProvider';
import { useTipsLabels } from '@/hooks/useTipsLabels';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';
import SmartKubikLogoDark from '@/assets/logo-smartkubik.png';
import SmartKubikLogoLight from '@/assets/logo-smartkubik-light.png';
import {
  Settings,
  LogOut,
  PlayCircle,
  StopCircle,
  Building2,
  PanelLeft,
  Building,
  ChevronRight,
  Sparkles,
  MapPin,
  ChevronDown,
  User,
  Search,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/sonner';
import './App.css';
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CrmProvider } from './context/CrmContext.jsx';
import { AccountingProvider } from './context/AccountingContext.jsx';
import { NotificationProvider, useNotification } from './context/NotificationContext.jsx';
import { useFeatureFlags } from './hooks/use-feature-flags.jsx';
import { getSidebarWhitelist } from './config/sidebarProfiles.js';
import { getNavLinks } from './config/navLinks.js';
import { isNavItemVisible, getDisplayName as getNavDisplayName } from './lib/nav-utils.js';
import { CashRegisterProvider } from './contexts/CashRegisterContext.jsx';
import { FabProvider } from './contexts/FabContext.jsx';
import { BusinessLocationProvider } from './context/BusinessLocationContext.jsx';
import { NotificationCenter } from './components/NotificationCenter.jsx';
import TrialBanner from './components/TrialBanner.jsx';
import { CountryPluginProvider } from './country-plugins/CountryPluginContext.jsx';
import { TenantPickerDialog } from '@/components/auth/TenantPickerDialog.jsx';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar.jsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.jsx';

// Lazy load the components
const CRMManagement = lazy(() => import('@/components/CRMManagement.jsx'));
const OrdersManagement = lazy(() => import('@/components/CRMManagement.jsx')); // Legacy name kept for safety but check usage
const OrdersPOS = lazy(() => import('@/components/orders/v2/OrdersPOS.jsx').then(module => ({ default: module.OrdersPOS })));
const OrdersHistory = lazy(() => import('@/components/orders/v2/OrdersHistoryV2.jsx').then(module => ({ default: module.OrdersHistoryV2 })));
const CalendarView = lazy(() => import('@/components/CalendarView.jsx').then(module => ({ default: module.CalendarView })));
const CalendarManagement = lazy(() => import('@/components/CalendarManagement.jsx').then(module => ({ default: module.CalendarManagement })));
const CalendarModule = lazy(() => import('@/components/CalendarModule.jsx').then(module => ({ default: module.CalendarModule })));
const ShiftManagement = lazy(() => import('@/components/ShiftManagement.jsx'));
const Login = lazy(() => import('./pages/Login'));
const LoginV2 = lazy(() => import('./pages/LoginV2'));
const Register = lazy(() => import('./pages/Register'));
const ConfirmAccount = lazy(() => import('./pages/ConfirmAccount'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const OrganizationSelector = lazy(() => import('./pages/OrganizationSelector'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));
const DashboardView = lazy(() => import('./components/DashboardView.jsx'));
const TodayDashboard = lazy(() => import('./components/mobile/home/TodayDashboard.jsx'));
const SettingsPage = lazy(() => import('./components/SettingsPage.jsx'));
const InventoryDashboard = lazy(() => import('@/components/InventoryDashboard.jsx'));
const PayablesManagement = lazy(() => import('@/components/PayablesManagement.jsx'));
const AccountingManagement = lazy(() => import('@/components/AccountingManagement.jsx'));
const AccountsReceivableReport = lazy(() => import('@/components/AccountsReceivableReport.jsx'));
const ElectronicInvoicesManager = lazy(() => import('@/components/accounting/ElectronicInvoicesManager.jsx'));
// DEPRECATED: Legacy ISLR module - replaced by unified WithholdingManagement
// const IslrWithholdingList = lazy(() => import('@/components/accounting/IslrWithholdingList.jsx'));
const TrialBalance = lazy(() => import('@/components/accounting/TrialBalance.jsx'));
const GeneralLedger = lazy(() => import('@/components/accounting/GeneralLedger.jsx'));
const AccountingPeriods = lazy(() => import('@/components/accounting/AccountingPeriods.jsx'));
const RecurringEntries = lazy(() => import('@/components/accounting/RecurringEntries.jsx'));
const ReportsRouteGate = lazy(() => import('./components/mobile/reports/ReportsRouteGate.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const MobileBottomNav = lazy(() => import('./components/mobile/MobileBottomNav.jsx'));
const MobileMoreMenu = lazy(() => import('./components/mobile/MobileMoreMenu.jsx'));
const MobileInstallPrompt = lazy(() => import('./components/mobile/MobileInstallPrompt.jsx'));
const MobileTopBar = lazy(() => import('./components/mobile/MobileTopBar.jsx'));
const SuperAdminLayout = lazy(() => import('./layouts/SuperAdminLayout'));
const FoundersPage = lazy(() => import('./pages/FoundersPage'));
const TrialExpired = lazy(() => import('./pages/TrialExpired'));
const LinksPage = lazy(() => import('./pages/LinksPage'));
const SmartKubikLanding = lazy(() => import('./pages/SmartKubikLanding'));
const SmartKubikLandingV2 = lazy(() => import('./pages/SmartKubikLandingV2'));
const WebVentasSectionDemo = lazy(() => import('./pages/WebVentasSectionDemo'));
const BlogIndex = lazy(() => import('./pages/BlogIndex.jsx'));
const BlogPost = lazy(() => import('./pages/BlogPost.jsx'));
const DocsLanding = lazy(() => import('./pages/DocsLanding.jsx'));
const DocsCategoryPage = lazy(() => import('./pages/DocsCategoryPage.jsx'));
const TimeClock = lazy(() => import('./pages/TimeClock.jsx'));
const DocsArticle = lazy(() => import('./pages/DocsArticle.jsx'));
const ComprasManagement = lazy(() => import('@/components/ComprasManagement.jsx'));
const BankAccountsManagement = lazy(() => import('@/components/BankAccountsManagement.jsx'));
const FixedAssetsView = lazy(() => import('@/components/FixedAssetsView.jsx'));
const InvestmentsView = lazy(() => import('@/components/InvestmentsView.jsx'));
const BankReconciliationView = lazy(() => import('@/components/BankReconciliationView.jsx'));
import { DriverLayout } from '@/components/drivers/DriverLayout.jsx';
import { DriverDashboard } from '@/components/drivers/DriverDashboard.jsx';
// RubikLoader imported directly (not lazy) - it's used as the loading fallback
import { RubikLoader } from '@/components/RubikLoader.jsx';
import BusinessLocationSelector from '@/components/BusinessLocationSelector.jsx';
const ServicesManagement = lazy(() => import('@/components/ServicesManagement.jsx'));
const ReviewsManagement = lazy(() => import('@/components/ReviewsManagement.jsx'));
const ResourcesManagement = lazy(() => import('@/components/ResourcesManagement.jsx'));
const AppointmentsManagement = lazy(() => import('@/components/AppointmentsManagement.jsx'));
const AppointmentsRouteGate = lazy(() => import('@/components/mobile/appointments/AppointmentsRouteGate.jsx'));
const CrmRouteGate = lazy(() => import('@/components/mobile/clients/CrmRouteGate.jsx'));
const ServicesRouteGate = lazy(() => import('@/components/mobile/services/ServicesRouteGate.jsx'));
const FloorViewRouteGate = lazy(() => import('@/components/mobile/floor/FloorViewRouteGate.jsx'));
const ProfessionalsRouteGate = lazy(() => import('@/components/mobile/professionals/ProfessionalsRouteGate.jsx'));
const InventoryRouteGate = lazy(() => import('@/components/mobile/inventory/InventoryRouteGate.jsx'));
const SettingsRouteGate = lazy(() => import('@/components/mobile/settings/SettingsRouteGate.jsx'));
const PublicCheckinPage = lazy(() => import('./pages/PublicCheckinPage.jsx'));
const StorefrontSettings = lazy(() => import('@/components/StorefrontSettings'));
const OrganizationsManagement = lazy(() => import('@/components/OrganizationsManagement.jsx'));
const TablesPage = lazy(() => import('./pages/TablesPage.jsx'));
const KitchenDisplay = lazy(() => import('@/components/restaurant/KitchenDisplay.jsx'));
const StorefrontRouteGate = lazy(() => import('./components/mobile/storefront/StorefrontRouteGate.jsx'));
const RestaurantStorefrontPage = lazy(() => import('./pages/RestaurantStorefrontPage.jsx'));
const ReservationsPage = lazy(() => import('./pages/ReservationsPage.jsx'));
const TipsPage = lazy(() => import('./pages/TipsPage.jsx'));
const CommissionsRouteGate = lazy(() => import('@/components/mobile/commissions/CommissionsRouteGate.jsx'));
const MenuEngineeringPage = lazy(() => import('./pages/MenuEngineeringPage.jsx'));
const RecipesPage = lazy(() => import('./pages/RecipesPage.jsx'));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage.jsx'));
const MarketingPage = lazy(() => import('./pages/MarketingPage.jsx'));
const WasteManagementPage = lazy(() => import('./pages/WasteManagementPage.jsx'));
const WhatsAppInbox = lazy(() => import('./pages/WhatsAppInbox.jsx')); // <-- Componente de WhatsApp añadido
const AssistantChatPanel = lazy(() => import('@/components/AssistantChatWidget.jsx'));
const AssistantPage = lazy(() => import('@/components/AssistantPage.jsx'));
const PaymentsManagementDashboard = lazy(() => import('@/components/hospitality/PaymentsManagementDashboard.jsx'));
const HospitalityOperationsDashboard = lazy(() => import('@/components/hospitality/HospitalityOperationsDashboard.jsx'));
const HotelFloorPlanPage = lazy(() => import('@/components/hospitality/HotelFloorPlanPage.jsx'));
const ProductionManagement = lazy(() => import('@/components/production/ProductionManagement.jsx'));
const PayrollRunsDashboard = lazy(() => import('@/components/payroll/PayrollRunsDashboard.jsx'));
const PayrollStructuresManager = lazy(() => import('@/components/payroll/PayrollStructuresManager.jsx'));
const PayrollCalendarTimeline = lazy(() => import('@/components/payroll/PayrollCalendarTimeline.jsx'));
const PayrollAbsencesManager = lazy(() => import('@/components/payroll/PayrollAbsencesManager.jsx'));
const PayrollRunWizard = lazy(() => import('@/components/payroll/PayrollRunWizard.jsx'));
const BillingDashboard = lazy(() => import('@/components/billing/BillingDashboard.jsx'));
const BillingCreateForm = lazy(() => import('@/components/billing/BillingCreateForm.jsx'));
const BillingDocumentDetail = lazy(() => import('@/components/billing/BillingDocumentDetail.jsx'));
const BillingSequencesManager = lazy(() => import('@/components/billing/BillingSequencesManager.jsx'));
const WithholdingManagement = lazy(() => import('@/components/billing/WithholdingManagement.jsx'));
const FulfillmentDashboard = lazy(() => import('@/components/fulfillment/FulfillmentDashboard.jsx').then(module => ({ default: module.FulfillmentDashboard })));
const CashRegisterPage = lazy(() => import('./pages/CashRegisterPage.jsx'));
const CashRegisterRouteGate = lazy(() => import('./components/mobile/cash-register/CashRegisterRouteGate.jsx'));
const DataImportPage = lazy(() => import('./components/data-import/DataImportPage.jsx'));
const BusinessLocationsManagement = lazy(() => import('./components/BusinessLocationsManagement.jsx'));
const SubsidiariesPanel = lazy(() => import('./components/SubsidiariesPanel.jsx'));

// Loading fallback component - RubikLoader is now directly imported (not lazy)
const LoadingFallback = () => (
  <RubikLoader fullScreen message="Cargando..." />
);

import PageTransition from '@/components/PageTransition';
import AppBreadcrumb from '@/components/AppBreadcrumb';
import { useSidebarBadges } from '@/hooks/use-sidebar-badges';
const CommandPalette = lazy(() => import('@/components/CommandPalette'));
const Celebration = lazy(() => import('@/components/Celebration'));
import { useCelebration } from '@/hooks/use-celebration';
const OnboardingTour = lazy(() => import('@/components/OnboardingTour'));


// Tenant Layout Component
function TenantLayout() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isTenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [tenantDialogError, setTenantDialogError] = useState('');
  const [isAssistantSheetOpen, setAssistantSheetOpen] = useState(false);
  const {
    user,
    tenant,
    memberships,
    activeMembershipId,
    selectTenant,
    isSwitchingTenant,
    isMultiTenantEnabled,
    logout,
    hasPermission,
    saveLastLocation,
  } = useAuth();
  const { theme } = useTheme();
  const { isClockedIn, clockIn, clockOut, isLoading: isShiftLoading } = useShift();
  const sidebarBadges = useSidebarBadges(!!tenant);
  const { celebrating, stop: stopCelebrating } = useCelebration();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding tour for new tenants after first load
  useEffect(() => {
    if (tenant && !tenant.onboardingCompleted) {
      const timer = setTimeout(() => setShowOnboarding(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [tenant]);
  const navigate = useNavigate();
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return theme === 'dark' ? 'dark' : 'light';
  });
  const logoSrc = resolvedTheme === 'dark' ? SmartKubikLogoDark : SmartKubikLogoLight;

  useEffect(() => {
    const currentPath = location.pathname.substring(1);
    const defaultTab = 'dashboard';
    // Incluir query params en activeTab para mantener sincronización con navegación
    const fullPath = currentPath + location.search;
    const tab = fullPath || defaultTab;
    setActiveTab(tab);

    if (tenant && location.pathname) {
      saveLastLocation(location.pathname);
    }
  }, [location.pathname, location.search, tenant, saveLastLocation]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = (event) => setResolvedTheme(event.matches ? 'dark' : 'light');
      setResolvedTheme(media.matches ? 'dark' : 'light');
      media.addEventListener('change', updateTheme);
      return () => media.removeEventListener('change', updateTheme);
    }

    setResolvedTheme(theme);
  }, [theme]);

  // Scope App.css typography overrides to dashboard only
  useEffect(() => {
    document.body.classList.add('erp-active');
    return () => document.body.classList.remove('erp-active');
  }, []);

  // Analytics: init Clarity + identify user once tenant is loaded
  useEffect(() => {
    const clarityId = import.meta.env.VITE_CLARITY_ID;
    if (clarityId) initClarity(clarityId);
    if (user?._id || user?.id) {
      identifyUser(user._id || user.id, { tenantId: tenant?._id || tenant?.id });
    }
  }, [user, tenant]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTabChange = (tab) => {
    navigate(`/${tab}`);
  }

  const openTenantDialog = () => {
    setTenantDialogError('');
    setTenantDialogOpen(true);
  };

  const handleTenantSwitch = async (
    membershipId,
    rememberAsDefault,
  ) => {
    setTenantDialogError('');
    try {
      await selectTenant(membershipId, { rememberAsDefault });
      setTenantDialogOpen(false);
      window.location.reload();
    } catch (err) {
      console.error('Tenant switch failed:', err);
      setTenantDialogError(
        err.message || 'No se pudo cambiar de organización.',
      );
    }
  };

  const handleTenantDialogClose = () => {
    setTenantDialogOpen(false);
    setTenantDialogError('');
  };

  const ShiftTimer = () => {
    const { activeShift } = useShift();
    const [duration, setDuration] = useState('');

    useEffect(() => {
      if (!activeShift) {
        setDuration('');
        return;
      }

      const timer = setInterval(() => {
        const now = new Date();
        const start = new Date(activeShift.clockIn);
        const diff = now - start;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setDuration(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }, 1000);

      return () => clearInterval(timer);
    }, [activeShift]);

    if (!duration) return null;

    return <Badge variant="outline" className="bg-info/10 text-blue-800">{duration}</Badge>;
  };

  const restaurantModuleEnabled = Boolean(
    tenant?.enabledModules?.restaurant ||
    tenant?.enabledModules?.tables ||
    tenant?.enabledModules?.kitchenDisplay ||
    tenant?.enabledModules?.menuEngineering
  );

  const navLinks = getNavLinks(tenant);

  const SidebarNavigation = () => {
    const { state, setOpen, isMobile, setOpenMobile } = useSidebar();
    const { unreadCount } = useNotification();
    const tipsLabels = useTipsLabels();
    const { isFeatureEnabled } = useFeatureFlags();

    const sidebarWhitelist = useMemo(
      () => getSidebarWhitelist(tenant?.verticalProfile?.key),
      [tenant?.verticalProfile?.key]
    );

    const currentBasePath = activeTab.split('?')[0];

    // Display name helper — delegates to shared nav-utils
    const getDisplayName = (item) => getNavDisplayName(item, tenant?.verticalProfile?.key, tipsLabels);

    // Función optimizada para verificar si una ruta está activa
    const isRouteActive = useCallback((itemHref) => {
      if (!itemHref) return false;
      if (activeTab === itemHref) return true;

      const itemBasePath = itemHref.split('?')[0];
      return itemBasePath === currentBasePath;
    }, [currentBasePath]);

    // Función helper para verificar si un item tiene hijos activos (sin recursión innecesaria)
    const hasActiveChild = useCallback((item) => {
      if (!item.children) return false;

      return item.children.some(child => {
        const childBasePath = child.href.split('?')[0];
        if (childBasePath === currentBasePath) return true;

        // Solo verificar nietos si el child tiene children
        if (child.children) {
          return child.children.some(grandchild => {
            return grandchild.href.split('?')[0] === currentBasePath;
          });
        }
        return false;
      });
    }, [currentBasePath]);

    // Inicializar openMenus - solo calcular una vez al montar
    const [openMenus, setOpenMenus] = useState(() => {
      const initial = {};
      const basePath = activeTab.split('?')[0];

      navLinks.forEach(item => {
        if (item.children && item.children.length > 0) {
          const parentBasePath = item.href.split('?')[0];
          const isActive = parentBasePath === basePath ||
            item.children.some(child => {
              const childBasePath = child.href.split('?')[0];
              if (childBasePath === basePath) return true;
              if (child.children) {
                return child.children.some(gc => gc.href.split('?')[0] === basePath);
              }
              return false;
            });
          initial[item.href] = isActive;

          // Para children con hijos también
          if (isActive) {
            item.children.forEach(child => {
              if (child.children) {
                const childBasePath = child.href.split('?')[0];
                const childActive = childBasePath === basePath ||
                  child.children.some(gc => gc.href.split('?')[0] === basePath);
                initial[child.href] = childActive;
              }
            });
          }
        }
      });
      return initial;
    });

    // Auto-expandir cuando cambia el activeTab - OPTIMIZADO
    useEffect(() => {
      setOpenMenus(prev => {
        const menusToOpen = {};
        let hasChanges = false;

        navLinks.forEach(item => {
          if (item.children && item.children.length > 0) {
            const parentBasePath = item.href.split('?')[0];
            const shouldBeOpen = parentBasePath === currentBasePath ||
              item.children.some(child => {
                const childBasePath = child.href.split('?')[0];
                if (childBasePath === currentBasePath) return true;
                if (child.children) {
                  return child.children.some(gc => gc.href.split('?')[0] === currentBasePath);
                }
                return false;
              });

            if (shouldBeOpen && prev[item.href] !== true) {
              menusToOpen[item.href] = true;
              hasChanges = true;
            }

            // Para children con sub-items
            if (shouldBeOpen && item.children) {
              item.children.forEach(child => {
                if (child.children) {
                  const childBasePath = child.href.split('?')[0];
                  const childShouldOpen = childBasePath === currentBasePath ||
                    child.children.some(gc => gc.href.split('?')[0] === currentBasePath);
                  if (childShouldOpen && prev[child.href] !== true) {
                    menusToOpen[child.href] = true;
                    hasChanges = true;
                  }
                }
              });
            }
          }
        });

        // Solo actualizar si hay cambios
        return hasChanges ? { ...prev, ...menusToOpen } : prev;
      });
    }, [currentBasePath]);

    const handleNavigationClick = (href) => {
      if (!href) return;

      if (!isMobile && state === 'collapsed') {
        setOpen(true);
      }

      handleTabChange(href);

      if (isMobile) {
        setOpenMobile(false);
      }
    };

    const toggleMenu = useCallback((href, requestedState) => {
      setOpenMenus(prev => {
        // Toggle simple
        if (requestedState === undefined) {
          return { ...prev, [href]: !prev[href] };
        }

        // Aplicar el estado solicitado (permitir cierre manual)
        return { ...prev, [href]: requestedState };
      });
    }, []);

    // Función recursiva para renderizar items con múltiples niveles de anidación
    const renderMenuItem = (item, level = 0) => {
      // Shared visibility check (permissions, modules, vertical, whitelist, etc.)
      if (!isNavItemVisible(item, {
        tenant, hasPermission, memberships, isFeatureEnabled,
        sidebarWhitelist, restaurantModuleEnabled, level,
      })) return null;

      const hasChildren = item.children && item.children.length > 0;

      // Usar funciones memoizadas para determinar si está activo - OPTIMIZADO
      const isItemActive = isRouteActive(item.href) || (hasChildren && hasActiveChild(item));

      if (hasChildren) {
        // Si tiene hijos, renderizar como collapsible
        if (level === 0) {
          // Nivel 1: Menu principal
          return (
            <Collapsible
              key={item.href}
              open={openMenus[item.href]}
              onOpenChange={(open) => toggleMenu(item.href, open)}
              asChild
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={getDisplayName(item)}
                    isActive={isItemActive}
                    className="justify-start"
                    aria-label={getDisplayName(item)}
                    onClick={() => {
                      if (state === 'collapsed') {
                        setOpen(true);
                      }
                    }}
                  >
                    <item.icon strokeWidth={1.25} />
                    <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">{getDisplayName(item)}</span>
                    {sidebarBadges[item.href] > 0 && !openMenus[item.href] && (
                      <Badge variant="secondary" className="rounded-full px-1.5 py-0.5 text-[10px] h-5 min-w-5 flex items-center justify-center group-data-[collapsible=icon]:hidden">
                        {sidebarBadges[item.href]}
                      </Badge>
                    )}
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden"
                      style={{ transform: openMenus[item.href] ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.children.map(child => renderMenuItem(child, level + 1))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        } else {
          // Nivel 2+: Sub-menu con collapsible anidado
          return (
            <Collapsible
              key={item.href}
              open={openMenus[item.href]}
              onOpenChange={(open) => toggleMenu(item.href, open)}
              asChild
            >
              <SidebarMenuSubItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuSubButton
                    isActive={isItemActive}
                    className="w-full"
                  >
                    <item.icon strokeWidth={1.25} />
                    <span>{item.name}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200"
                      style={{ transform: openMenus[item.href] ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    />
                  </SidebarMenuSubButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="ml-3">
                    {item.children.map(child => renderMenuItem(child, level + 1))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuSubItem>
            </Collapsible>
          );
        }
      }

      // Si no tiene hijos, renderizar como item simple
      if (level === 0) {
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              tooltip={getDisplayName(item)}
              isActive={activeTab === item.href}
              className=""
              aria-label={getDisplayName(item)}
              onClick={() => handleNavigationClick(item.href)}
            >
              <item.icon strokeWidth={1.25} />
              <span className="text-sm font-medium group-data-[collapsible=icon]:hidden flex-1">{getDisplayName(item)}</span>
              {/* Badge: WhatsApp unread OR sidebar badge counts */}
              {item.href === 'whatsapp' && unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] h-5 min-w-5 flex items-center justify-center group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:shadow-md">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
              {item.href !== 'whatsapp' && sidebarBadges[item.href] > 0 && (
                <Badge variant="secondary" className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] h-5 min-w-5 flex items-center justify-center animate-in fade-in-0 zoom-in-75 duration-300 group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:shadow-md">
                  {sidebarBadges[item.href] > 99 ? '99+' : sidebarBadges[item.href]}
                </Badge>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      } else {
        return (
          <SidebarMenuSubItem key={item.href}>
            <SidebarMenuSubButton
              asChild
              isActive={activeTab === item.href}
            >
              <button
                onClick={() => handleNavigationClick(item.href)}
                className="w-full"
              >
                <item.icon strokeWidth={1.25} />
                <span>{item.name}</span>
              </button>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      }
    };

    return (
      <SidebarMenu>
        {navLinks.map(link => renderMenuItem(link))}
      </SidebarMenu>
    );
  };

  const SidebarHeaderContent = () => {
    const { state, setOpen, isMobile, setOpenMobile } = useSidebar();

    const handleOrganizationsClick = () => {
      if (!isMobile && state === 'collapsed') {
        setOpen(true);
      }

      handleTabChange('organizations');

      if (isMobile) {
        setOpenMobile(false);
      }
    };

    return (
      <SidebarMenu>
        {isMultiTenantEnabled && memberships.length > 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={tenant?.name || 'Seleccionar organización'}
              className=""
              onClick={openTenantDialog}
            >
              {tenant?.isSubsidiary ? <MapPin strokeWidth={1.25} /> : <Building2 strokeWidth={1.25} />}
              <span className="text-sm font-medium group-data-[collapsible=icon]:hidden flex items-center gap-1.5">
                {tenant?.name || 'Seleccionar organización'}
                {tenant?.isSubsidiary && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-300/20">
                    Sede
                  </span>
                )}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Mis Organizaciones"
            isActive={activeTab === 'organizations'}
            className="justify-start"
            onClick={handleOrganizationsClick}
          >
            <Building strokeWidth={1.25} />
            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Mis Organizaciones</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  };

  const SidebarFooterContent = () => {
    const { toggleSidebar } = useSidebar();

    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Colapsar menú"
            className="justify-start"
            onClick={toggleSidebar}
          >
            <PanelLeft strokeWidth={1.25} />
            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Colapsar menú</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Configuración"
            className="justify-start"
            onClick={() => navigate('/settings')}
          >
            <Settings strokeWidth={1.25} />
            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Configuración</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Cerrar Sesión"
            className="justify-start"
            onClick={handleLogout}
          >
            <LogOut strokeWidth={1.25} />
            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <Toaster richColors closeButton position="top-center" expand={false} />
      <Sidebar collapsible="icon" className="bg-card border-r border-border">

        <SidebarHeader className="border-b border-border px-2 py-3">
          <SidebarHeaderContent />
        </SidebarHeader>
        <SidebarContent className="px-2 py-4">
          <SidebarNavigation />
        </SidebarContent>
        <SidebarFooter className="border-t border-border px-2 py-3">
          <SidebarFooterContent />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
      <Suspense fallback={null}>
        {celebrating && <Celebration active={celebrating} onComplete={stopCelebrating} />}
      </Suspense>
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingTour
            active={showOnboarding}
            onComplete={() => setShowOnboarding(false)}
            storageKey="onboarding-main-tour"
            steps={[
              { target: '[data-slot="sidebar-menu-button"]', title: 'Navegación', description: 'Explora todos los módulos de SmartKubik desde la barra lateral. Haz clic en cualquier sección para acceder.' },
              { target: '[data-slot="card"]', title: 'Dashboard', description: 'Aquí verás un resumen de ventas, órdenes y métricas clave de tu negocio.' },
            ]}
          />
        </Suspense>
      )}
      <SidebarInset className="bg-background">
        <div className="flex h-screen flex-col overflow-hidden">
          <Suspense fallback={null}>
            <MobileTopBar
              logoSrc={logoSrc}
              onAssistantOpen={() => setAssistantSheetOpen(true)}
              onLogout={handleLogout}
            >
              <ShiftTimer />
              <ThemeToggle />
            </MobileTopBar>
          </Suspense>
          {/* Desktop Header — 3 zones: Logo | Context | Actions */}
          <div className="hidden items-center justify-between border-b border-border bg-card px-6 py-3 md:flex">
            {/* Zone 1: Logo */}
            <div className="flex items-center gap-3">
              <img src={logoSrc} alt="Smart Kubik" className="h-7 w-auto" />
              {isMultiTenantEnabled && memberships.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={openTenantDialog}
                >
                  <Building2 size={14} />
                  <span className="max-w-[140px] truncate">{tenant?.name || 'Organización'}</span>
                  <ChevronDown size={12} />
                </Button>
              )}
            </div>

            {/* Zone 2: Context (shift + location) */}
            <div className="flex items-center gap-3">
              <ShiftTimer />
              {isClockedIn ? (
                <Button variant="destructive" size="sm" onClick={clockOut} disabled={isShiftLoading}>
                  <StopCircle size={12} />
                  Finalizar
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={clockIn} disabled={isShiftLoading}>
                  <PlayCircle size={12} />
                  Iniciar Turno
                </Button>
              )}
              <BusinessLocationSelector />
            </div>

            {/* Zone 3: Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="hidden lg:flex gap-2 text-muted-foreground h-8 px-3"
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              >
                <Search size={14} />
                <span className="text-xs">Buscar...</span>
                <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
              <NotificationCenter />
              <Button variant="ghost" size="icon" onClick={() => setAssistantSheetOpen(true)} title="Asistente IA">
                <Sparkles size={16} />
              </Button>
              <ThemeToggle />

              {/* User menu — collapses Settings + Logout */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-1 gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User size={14} />
                    </div>
                    <span className="max-w-[100px] truncate text-sm">
                      {tenant?.ownerFirstName || user?.firstName || 'Usuario'}
                    </span>
                    <ChevronDown size={12} className="text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings size={14} />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut size={14} />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6 mobile-content-pad">
            <AppBreadcrumb />
            <TrialBanner />
            <Suspense fallback={<LoadingFallback />}>
              <PageTransition>
              <Routes>
                <Route path="dashboard" element={<><TodayDashboard /><DashboardView /></>} />
                <Route path="inventory-management" element={<InventoryRouteGate />} />
                <Route
                  path="storefront"
                  element={
                    tenant?.enabledModules?.ecommerce
                      ? <StorefrontRouteGate />
                      : <Navigate to="/dashboard" replace />
                  }
                />
                <Route path="crm" element={
                  <CrmProvider>
                    <CrmRouteGate hideEmployeeTab />
                  </CrmProvider>
                } />
                <Route
                  path="payroll/employees"
                  element={
                    tenant?.enabledModules?.payroll ? (
                      <CrmProvider>
                        <CRMManagement forceEmployeeTab />
                      </CrmProvider>
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="payroll/runs"
                  element={
                    tenant?.enabledModules?.payroll
                      ? <PayrollRunsDashboard />
                      : <Navigate to="/dashboard" replace />
                  }
                />
                <Route
                  path="payroll/runs/wizard"
                  element={
                    tenant?.enabledModules?.payroll
                      ? <PayrollRunWizard />
                      : <Navigate to="/dashboard" replace />
                  }
                />
                <Route
                  path="payroll/structures"
                  element={
                    tenant?.enabledModules?.payroll
                      ? <PayrollStructuresManager />
                      : <Navigate to="/dashboard" replace />
                  }
                />
                <Route
                  path="payroll/calendar"
                  element={
                    tenant?.enabledModules?.payroll
                      ? <PayrollCalendarTimeline />
                      : <Navigate to="/dashboard" replace />
                  }
                />
                <Route
                  path="payroll/absences"
                  element={
                    tenant?.enabledModules?.payroll
                      ? <PayrollAbsencesManager />
                      : <Navigate to="/dashboard" replace />
                  }
                />
                <Route path="orders" element={<Navigate to="orders/new" replace />} />
                <Route path="orders/new" element={
                  <CrmProvider>
                    <OrdersPOS />
                  </CrmProvider>
                } />
                <Route path="orders/history" element={
                  <CrmProvider>
                    <OrdersHistory />
                  </CrmProvider>
                } />
                <Route path="fulfillment" element={<FulfillmentDashboard />} />
                <Route path="whatsapp" element={
                  <CrmProvider>
                    <WhatsAppInbox />
                  </CrmProvider>
                } />
                <Route path="purchases" element={<ComprasManagement />} />
                <Route path="accounts-payable" element={<PayablesManagement />} />
                <Route path="accounting" element={<AccountingManagement />} />
                <Route path="accounting/reports/accounts-receivable" element={<AccountsReceivableReport />} />
                <Route path="accounting/reports/trial-balance" element={<TrialBalance />} />
                <Route path="accounting/reports/general-ledger" element={<GeneralLedger />} />
                <Route path="accounting/periods" element={<AccountingPeriods />} />
                <Route path="accounting/recurring-entries" element={<RecurringEntries />} />
                <Route path="accounting/electronic-invoices" element={<ElectronicInvoicesManager />} />
                {/* DEPRECATED: Legacy ISLR module - replaced by unified WithholdingManagement */}
                {/* <Route path="accounting/islr-withholding" element={<IslrWithholdingList />} /> */}
                <Route path="billing" element={<Navigate to="/accounting?tab=electronic-invoices" replace />} />
                <Route path="billing/create" element={<BillingCreateForm />} />
                <Route path="billing/sequences" element={<BillingSequencesManager />} />
                <Route path="billing/documents/:id" element={<BillingDocumentDetail />} />
                <Route path="billing/retenciones" element={<WithholdingManagement />} />
                <Route path="cash-register" element={<CashRegisterRouteGate />} />
                <Route path="fixed-assets" element={<FixedAssetsView />} />
                <Route path="investments" element={<InvestmentsView />} />
                <Route path="bank-accounts" element={<BankAccountsManagement />} />
                <Route path="bank-accounts/:accountId/reconciliation" element={<BankReconciliationView />} />
                <Route path="organizations" element={<OrganizationsManagement />} />
                <Route path="receivables" element={
                  <CrmProvider>
                    <PaymentsManagementDashboard />
                  </CrmProvider>
                } />
                <Route path="appointments" element={
                  <CrmProvider>
                    <AppointmentsRouteGate />
                  </CrmProvider>
                } />
                <Route path="services" element={<ServicesRouteGate />} />
                <Route path="resources" element={<ProfessionalsRouteGate />} />
                <Route path="floor-view" element={<FloorViewRouteGate />} />
                <Route path="reviews" element={<ReviewsManagement />} />
                <Route path="fichar" element={<TimeClock />} />
                <Route path="hospitality/deposits" element={
                  <CrmProvider>
                    <PaymentsManagementDashboard />
                  </CrmProvider>
                } />
                <Route path="hospitality/operations" element={<HospitalityOperationsDashboard />} />
                <Route path="hospitality/floor-plan" element={<HotelFloorPlanPage />} />
                <Route path="calendar" element={<CalendarModule />} />
                <Route path="production" element={<ProductionManagement />} />
                <Route path="restaurant/floor-plan" element={
                  <CrmProvider>
                    <TablesPage />
                  </CrmProvider>
                } />
                <Route path="restaurant/kitchen-display" element={<KitchenDisplay />} />
                <Route path="restaurant/reservations" element={<ReservationsPage />} />
                <Route path="tips" element={<TipsPage />} />
                <Route path="restaurant/tips" element={<Navigate to="/tips" replace />} /> {/* Redirect old route */}
                <Route path="commissions" element={<CommissionsRouteGate />} />
                <Route path="restaurant/menu-engineering" element={<MenuEngineeringPage />} />
                <Route path="restaurant/recipes" element={<RecipesPage />} />
                <Route path="restaurant/purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="restaurant/storefront" element={
                  restaurantModuleEnabled
                    ? <RestaurantStorefrontPage />
                    : <Navigate to="/dashboard" replace />
                } />
                <Route path="waste-control" element={<WasteManagementPage />} />
                <Route path="marketing" element={
                  <CrmProvider>
                    <MarketingPage />
                  </CrmProvider>
                } />
                <Route
                  path="hr/shifts"
                  element={
                    <ShiftManagement />
                  }
                />
                <Route path="settings" element={<SettingsRouteGate />} />
                <Route path="business-locations" element={<BusinessLocationsManagement />} />
                <Route path="subsidiaries" element={<SubsidiariesPanel />} />
                <Route path="data-import" element={<DataImportPage />} />
                <Route path="reports" element={<ReportsRouteGate />} />
                <Route path="assistant" element={<AssistantPage />} />
                <Route path="mas" element={<MobileMoreMenu />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </PageTransition>
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <MobileBottomNav />
            <MobileInstallPrompt />
          </Suspense>
        </div>
        <TenantPickerDialog
          isOpen={isTenantDialogOpen}
          memberships={memberships}
          defaultMembershipId={activeMembershipId}
          onSelect={handleTenantSwitch}
          onCancel={handleTenantDialogClose}
          isLoading={isSwitchingTenant}
          errorMessage={tenantDialogError}
        />
      </SidebarInset>
      <Sheet open={isAssistantSheetOpen} onOpenChange={setAssistantSheetOpen}>
        <SheetContent side="right" className="flex flex-col p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Asistente SmartKubik
            </SheetTitle>
          </SheetHeader>
          <Suspense fallback={null}>
            <AssistantChatPanel />
          </Suspense>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}

function AppContent() {
  return (
    <>
      <Toaster richColors closeButton position="top-center" expand={false} />
      <Suspense fallback={<LoadingFallback />}>

        <Routes>
          <Route path="/v2" element={<SmartKubikLandingV2 />} />
          <Route path="/fundadores" element={<FoundersPage />} />
          <Route path="/links" element={<LinksPage />} />
          <Route path="/demo-web-ventas" element={<WebVentasSectionDemo />} />
          <Route path="/" element={<SmartKubikLanding />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/docs" element={<DocsLanding />} />
          <Route path="/docs/:category" element={<DocsCategoryPage />} />
          <Route path="/docs/:category/:slug" element={<DocsArticle />} />
          <Route path="/docs/:category/:slug" element={<DocsArticle />} />
          <Route path="/driver" element={<ProtectedRoute><DriverLayout /></ProtectedRoute>}>
            <Route path="pool" element={<DriverDashboard />} />
            <Route path="active" element={<DriverDashboard />} />
            <Route index element={<Navigate to="pool" replace />} />
          </Route>
          <Route path="/login" element={<LoginV2 />} />
          <Route path="/register" element={<Register />} />
          <Route path="/confirm-account" element={<ConfirmAccount />} />
          <Route path="/trial-expired" element={<TrialExpired />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/checkin/:tenantId" element={<PublicCheckinPage />} />
          <Route
            path="/organizations"
            element={
              <ProtectedRoute>
                <OrganizationSelector />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/*"
            element={
              <ProtectedRoute>
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute requireOrganization>
                <OnboardingWizard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute requireOrganization>
                <ShiftProvider>
                  <BusinessLocationProvider>
                    <AccountingProvider>
                      <CashRegisterProvider>
                        <FabProvider>
                          <TenantLayout />
                        </FabProvider>
                      </CashRegisterProvider>
                    </AccountingProvider>
                  </BusinessLocationProvider>
                </ShiftProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

function MuiThemeBridge({ children }) {
  const { theme } = useTheme();
  const [resolvedMode, setResolvedMode] = useState('dark');

  useEffect(() => {
    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedMode(systemPrefersDark ? 'dark' : 'light');
    } else {
      setResolvedMode(theme);
    }
  }, [theme]);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: { mode: resolvedMode },
      }),
    [resolvedMode],
  );

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <MuiThemeBridge>
          <AuthProvider>
            <CountryPluginProvider>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </CountryPluginProvider>
          </AuthProvider>
        </MuiThemeBridge>
      </ThemeProvider>
    </Router>
  );
}

export default App;
