import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth, AuthProvider } from './hooks/use-auth.jsx';
import { useShift, ShiftProvider } from './context/ShiftContext.jsx';
import { useTheme } from '@/components/ThemeProvider';
import SmartKubikLogoDark from '@/assets/logo-smartkubik.png';
import SmartKubikLogoLight from '@/assets/logo-smartkubik-light.png';
import {
  Package,
  Users,
  ShoppingCart,
  Settings,
  LogOut,
  CalendarDays,
  BookCopy,
  PlayCircle,
  StopCircle,
  AreaChart,
  LayoutDashboard,
  Truck,
  Building2,
  Calendar,
  Briefcase,
  UserSquare,
  Store,
  PanelLeft,
  CreditCard,
  Building,
  Utensils,
  ChefHat,
  MessageSquare, // Icono añadido para WhatsApp
  PiggyBank,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import './App.css';
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CrmProvider } from './context/CrmContext.jsx';
import { FormStateProvider } from './context/FormStateContext.jsx';
import { AccountingProvider } from './context/AccountingContext.jsx';
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
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar.jsx';

// Lazy load the components
const CRMManagement = lazy(() => import('@/components/CRMManagement.jsx'));
const OrdersManagement = lazy(() => import('@/components/orders/v2/OrdersManagementV2.jsx').then(module => ({ default: module.OrdersManagementV2 })));
const CalendarView = lazy(() => import('@/components/CalendarView.jsx').then(module => ({ default: module.CalendarView })));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ConfirmAccount = lazy(() => import('./pages/ConfirmAccount'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const OrganizationSelector = lazy(() => import('./pages/OrganizationSelector'));
const DashboardView = lazy(() => import('./components/DashboardView.jsx'));
const SettingsPage = lazy(() => import('./components/SettingsPage.jsx'));
const InventoryDashboard = lazy(() => import('@/components/InventoryDashboard.jsx'));
const AccountingDashboard = lazy(() => import('@/components/AccountingDashboard.jsx'));
const AccountsReceivableReport = lazy(() => import('@/components/AccountsReceivableReport.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const SuperAdminLayout = lazy(() => import('./layouts/SuperAdminLayout'));
const SmartKubikLanding = lazy(() => import('./pages/SmartKubikLanding'));
const BlogIndex = lazy(() => import('./pages/BlogIndex.jsx'));
const BlogPost = lazy(() => import('./pages/BlogPost.jsx'));
const ComprasManagement = lazy(() => import('@/components/ComprasManagement.jsx'));
const BankAccountsManagement = lazy(() => import('@/components/BankAccountsManagement.jsx'));
const BankReconciliationView = lazy(() => import('@/components/BankReconciliationView.jsx'));
const RubikLoader = lazy(() => import('@/components/RubikLoader.jsx'));
const ServicesManagement = lazy(() => import('@/components/ServicesManagement.jsx'));
const ResourcesManagement = lazy(() => import('@/components/ResourcesManagement.jsx'));
const AppointmentsManagement = lazy(() => import('@/components/AppointmentsManagement.jsx'));
const StorefrontSettings = lazy(() => import('@/components/StorefrontSettings'));
const OrganizationsManagement = lazy(() => import('@/components/OrganizationsManagement.jsx'));
const FloorPlan = lazy(() => import('@/components/restaurant/FloorPlan.jsx').then(module => ({ default: module.FloorPlan })));
const KitchenDisplay = lazy(() => import('@/components/restaurant/KitchenDisplay.jsx'));
const WhatsAppInbox = lazy(() => import('./pages/WhatsAppInbox.jsx')); // <-- Componente de WhatsApp añadido
const AssistantChatWidget = lazy(() => import('@/components/AssistantChatWidget.jsx'));
const HospitalityDepositsDashboard = lazy(() => import('@/components/hospitality/HospitalityDepositsDashboard.jsx'));

// Loading fallback component
const LoadingFallback = () => (
  <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-lg">Cargando...</div></div>}>
    <RubikLoader fullScreen message="Cargando..." />
  </Suspense>
);


// Tenant Layout Component
function TenantLayout() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isTenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [tenantDialogError, setTenantDialogError] = useState('');
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
    const tab = currentPath.split('/')[0] || defaultTab;
    setActiveTab(tab);

    if (tenant && location.pathname) {
      saveLastLocation(location.pathname);
    }
  }, [location.pathname, tenant, saveLastLocation]);

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
  
    return <Badge variant="outline" className="bg-blue-100 text-blue-800">{duration}</Badge>;
  };

  const restaurantModuleEnabled = Boolean(
    tenant?.enabledModules?.restaurant ||
    tenant?.enabledModules?.tables ||
    tenant?.enabledModules?.kitchenDisplay ||
    tenant?.enabledModules?.menuEngineering
  );

  const navLinks = [
    { name: 'Panel de Control', href: 'dashboard', icon: LayoutDashboard, permission: 'dashboard_read' },
    { name: 'Órdenes', href: 'orders', icon: ShoppingCart, permission: 'orders_read' },
    { name: 'WhatsApp', href: 'whatsapp', icon: MessageSquare, permission: 'chat_read' }, // <-- Enlace de WhatsApp añadido
    { name: 'Inventario', href: 'inventory-management', icon: Package, permission: 'inventory_read' },
    { name: 'Mi Storefront', href: 'storefront', icon: Store, permission: 'dashboard_read', requiresModule: 'ecommerce' },
    { name: 'Mesas', href: 'restaurant/floor-plan', icon: Utensils, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Cocina (KDS)', href: 'restaurant/kitchen-display', icon: ChefHat, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Contabilidad', href: 'accounting-management', icon: BookCopy, permission: 'accounting_read' },
    { name: 'Cuentas Bancarias', href: 'bank-accounts', icon: CreditCard, permission: 'accounting_read', requiresModule: 'bankAccounts' },
    { name: 'CRM', href: 'crm', icon: Users, permission: 'customers_read' },
    { name: 'Compras', href: 'purchases', icon: Truck, permission: 'purchases_read' },
    { name: 'Citas', href: 'appointments', icon: Calendar, permission: 'appointments_read' },
    { name: 'Servicios', href: 'services', icon: Briefcase, permission: 'appointments_read' },
    { name: 'Recursos', href: 'resources', icon: UserSquare, permission: 'appointments_read' },
    { name: 'Depósitos', href: 'hospitality/deposits', icon: PiggyBank, permission: 'appointments_read', requiresModule: 'appointments' },
    { name: 'Calendario', href: 'calendar', icon: CalendarDays, permission: 'events_read' },
    { name: 'Reportes', href: 'reports', icon: AreaChart, permission: 'reports_read' },
  ];

  const SidebarNavigation = () => {
    const { state, setOpen, isMobile, setOpenMobile } = useSidebar();

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

    return (
      <SidebarMenu>
        {navLinks.map(link => {
          if (link.requiresModule) {
            if (link.requiresModule === 'restaurant' && !restaurantModuleEnabled) {
              return null;
            }
            if (link.requiresModule !== 'restaurant' && !tenant?.enabledModules?.[link.requiresModule]) {
              return null;
            }
          }

          if (!hasPermission(link.permission)) {
            return null;
          }

          return (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                tooltip={link.name}
                isActive={activeTab === link.href}
                className="gap-3 justify-start"
                aria-label={link.name}
                onClick={() => handleNavigationClick(link.href)}
              >
                <link.icon strokeWidth={1.25} />
                <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">{link.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
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
              className="gap-3 justify-start"
              onClick={openTenantDialog}
            >
              <Building2 strokeWidth={1.25} />
              <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
                {tenant?.name || 'Seleccionar organización'}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Mis Organizaciones"
            isActive={activeTab === 'organizations'}
            className="gap-3 justify-start"
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
            className="gap-3 justify-start"
            onClick={toggleSidebar}
          >
            <PanelLeft strokeWidth={1.25} />
            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Colapsar menú</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Configuración"
            className="gap-3 justify-start"
            onClick={() => navigate('/settings')}
          >
            <Settings strokeWidth={1.25} />
            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Configuración</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Cerrar Sesión"
            className="gap-3 justify-start"
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
      <Toaster richColors />
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
      <SidebarInset className="bg-background">
        <div className="flex h-screen flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground" />
              <img src={logoSrc} alt="Smart Kubik" className="h-8 w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <ShiftTimer />
              <ThemeToggle />
            </div>
          </div>
          <div className="hidden items-center justify-between border-b border-border bg-card px-6 py-4 md:flex">
            <div className="flex items-center gap-3">
              <img src={logoSrc} alt="Smart Kubik" className="h-12 w-auto" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Hola, {user?.firstName || 'Usuario'}</span>
              <ShiftTimer />
              {isClockedIn ? (
                <Button variant="destructive" size="sm" onClick={clockOut} disabled={isShiftLoading}>
                  <StopCircle className="mr-2 h-4 w-4" />
                  Finalizar Turno
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={clockIn} disabled={isShiftLoading}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Iniciar Turno
                </Button>
              )}
              {isMultiTenantEnabled && memberships.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openTenantDialog}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {tenant?.name || 'Seleccionar organización'}
                </Button>
              )}
              <ThemeToggle />
              <Button id="settings-button" variant="outline" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="dashboard" element={<DashboardView />} />
                <Route path="inventory-management" element={<InventoryDashboard />} />
                <Route
                  path="storefront"
                  element={
                    tenant?.enabledModules?.ecommerce
                      ? <StorefrontSettings />
                      : <Navigate to="/dashboard" replace />
                  }
                />
                <Route path="crm" element={<CRMManagement />} />
                <Route path="orders" element={<OrdersManagement />} />
                <Route path="whatsapp" element={<WhatsAppInbox />} /> {/* <-- Ruta de WhatsApp añadida */}
                <Route path="purchases" element={<ComprasManagement />} />
                <Route path="accounting-management" element={<AccountingDashboard />} />
                <Route path="accounting/reports/accounts-receivable" element={<AccountsReceivableReport />} />
                <Route path="bank-accounts" element={<BankAccountsManagement />} />
                <Route path="bank-accounts/:accountId/reconciliation" element={<BankReconciliationView />} />
                <Route path="organizations" element={<OrganizationsManagement />} />
                <Route path="appointments" element={<AppointmentsManagement />} />
                <Route path="services" element={<ServicesManagement />} />
                <Route path="resources" element={<ResourcesManagement />} />
                <Route path="hospitality/deposits" element={<HospitalityDepositsDashboard />} />
                <Route path="calendar" element={<CalendarView />} />
                <Route path="restaurant/floor-plan" element={<FloorPlan />} />
                <Route path="restaurant/kitchen-display" element={<KitchenDisplay />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </Suspense>
          </div>
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
      <Suspense fallback={null}>
        <AssistantChatWidget />
      </Suspense>
    </SidebarProvider>
  );
}

function AppContent() {
  return (
    <>
      <Toaster richColors />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<SmartKubikLanding />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/confirm-account" element={<ConfirmAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
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
            path="/*"
            element={
              <ProtectedRoute requireOrganization>
                  <FormStateProvider>
                    <CrmProvider>
                      <ShiftProvider>
                        <AccountingProvider>
                          <TenantLayout />
                        </AccountingProvider>
                      </ShiftProvider>
                    </CrmProvider>
                  </FormStateProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
