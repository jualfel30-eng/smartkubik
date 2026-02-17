import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth, AuthProvider } from './hooks/use-auth.jsx';
import { useShift, ShiftProvider } from './context/ShiftContext.jsx';
import { useTheme } from '@/components/ThemeProvider';
import { useTipsLabels } from '@/hooks/useTipsLabels';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';
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
  Calculator,
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
  ChevronRight,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Box,
  List,
  Receipt,
  RefreshCw,
  Coffee,
  Wrench,
  Factory,
  Filter,
  BarChart3,
  GitBranch,
  Layers,
  UserCog,
  Mail,
  DollarSign,
  Target,
  BookOpen,
  Tag,
  Percent,
  Award,
  Megaphone,
  ShoppingBag,
  Sparkles,
  Zap,
  AlertCircle,
  PlusCircle,
  Trash2,
  Bike,
  BanknoteArrowUp,
  BanknoteArrowDown,
  CircleDollarSign,
  HandCoins,
  PackageCheck,
  MessageCircleMore,
  Boxes,
  PackagePlus,
  UserCheck,
  Upload,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import './App.css';
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CrmProvider } from './context/CrmContext.jsx';
import { AccountingProvider } from './context/AccountingContext.jsx';
import { NotificationProvider, useNotification } from './context/NotificationContext.jsx';
import { CashRegisterProvider } from './contexts/CashRegisterContext.jsx';
import { NotificationCenter } from './components/NotificationCenter.jsx';
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
const DashboardView = lazy(() => import('./components/DashboardView.jsx'));
const SettingsPage = lazy(() => import('./components/SettingsPage.jsx'));
const InventoryDashboard = lazy(() => import('@/components/InventoryDashboard.jsx'));
const PayablesManagement = lazy(() => import('@/components/PayablesManagement.jsx'));
const AccountingManagement = lazy(() => import('@/components/AccountingManagement.jsx'));
const AccountsReceivableReport = lazy(() => import('@/components/AccountsReceivableReport.jsx'));
const ElectronicInvoicesManager = lazy(() => import('@/components/accounting/ElectronicInvoicesManager.jsx'));
const IslrWithholdingList = lazy(() => import('@/components/accounting/IslrWithholdingList.jsx'));
const TrialBalance = lazy(() => import('@/components/accounting/TrialBalance.jsx'));
const GeneralLedger = lazy(() => import('@/components/accounting/GeneralLedger.jsx'));
const AccountingPeriods = lazy(() => import('@/components/accounting/AccountingPeriods.jsx'));
const RecurringEntries = lazy(() => import('@/components/accounting/RecurringEntries.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const SuperAdminLayout = lazy(() => import('./layouts/SuperAdminLayout'));
const FoundersPage = lazy(() => import('./pages/FoundersPage'));
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
const ServicesManagement = lazy(() => import('@/components/ServicesManagement.jsx'));
const ResourcesManagement = lazy(() => import('@/components/ResourcesManagement.jsx'));
const AppointmentsManagement = lazy(() => import('@/components/AppointmentsManagement.jsx'));
const StorefrontSettings = lazy(() => import('@/components/StorefrontSettings'));
const OrganizationsManagement = lazy(() => import('@/components/OrganizationsManagement.jsx'));
const TablesPage = lazy(() => import('./pages/TablesPage.jsx'));
const KitchenDisplay = lazy(() => import('@/components/restaurant/KitchenDisplay.jsx'));
const ReservationsPage = lazy(() => import('./pages/ReservationsPage.jsx'));
const TipsPage = lazy(() => import('./pages/TipsPage.jsx'));
const CommissionsPage = lazy(() => import('./pages/CommissionsPage.jsx'));
const MenuEngineeringPage = lazy(() => import('./pages/MenuEngineeringPage.jsx'));
const RecipesPage = lazy(() => import('./pages/RecipesPage.jsx'));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage.jsx'));
const MarketingPage = lazy(() => import('./pages/MarketingPage.jsx'));
const WasteManagementPage = lazy(() => import('./pages/WasteManagementPage.jsx'));
const WhatsAppInbox = lazy(() => import('./pages/WhatsAppInbox.jsx')); // <-- Componente de WhatsApp añadido
const AssistantChatWidget = lazy(() => import('@/components/AssistantChatWidget.jsx'));
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
const FulfillmentDashboard = lazy(() => import('@/components/fulfillment/FulfillmentDashboard.jsx').then(module => ({ default: module.FulfillmentDashboard })));
const CashRegisterPage = lazy(() => import('./pages/CashRegisterPage.jsx'));
const DataImportPage = lazy(() => import('./components/data-import/DataImportPage.jsx'));


// Loading fallback component - RubikLoader is now directly imported (not lazy)
const LoadingFallback = () => (
  <RubikLoader fullScreen message="Cargando..." />
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

    // 1. Módulos Operativos
    {
      name: 'Órdenes',
      href: 'orders',
      icon: ShoppingCart,
      permission: 'orders_read',
      children: [
        { name: 'Nueva Orden', href: 'orders/new', icon: PlusCircle },
        { name: 'Historial', href: 'orders/history', icon: List },
      ]
    },
    {
      name: 'Inventario',
      href: 'inventory-management',
      icon: Boxes,
      permission: 'inventory_read',
      children: [
        {
          name: 'Productos',
          href: 'inventory-management?tab=products',
          icon: Box,
          children: [
            { name: 'Mercancía', href: 'inventory-management?tab=products', icon: Box },
            { name: 'Materias Primas', href: 'inventory-management?tab=raw-materials', icon: Factory },
            { name: 'Consumibles', href: 'inventory-management?tab=consumables', icon: Coffee },
            { name: 'Suministros', href: 'inventory-management?tab=supplies', icon: Wrench },
            { name: 'Motor de Precios', href: 'inventory-management?tab=pricing-engine', icon: Calculator },
          ],
        },
        {
          name: 'Inventario',
          href: 'inventory-management?tab=inventory',
          icon: List,
          children: [
            { name: 'Inventario', href: 'inventory-management?tab=inventory', icon: List },
            { name: 'Almacenes', href: 'inventory-management?tab=inventory-warehouses', icon: Building2 },
            { name: 'Movimientos de Inventario', href: 'inventory-management?tab=inventory-movements', icon: RefreshCw },
            { name: 'Alertas de Stock', href: 'inventory-management?tab=inventory-alerts', icon: AlertCircle },
          ],
        },
        { name: 'Compras', href: 'inventory-management?tab=purchases', icon: PackagePlus },
        { name: 'Proveedores', href: 'inventory-management?tab=suppliers', icon: UserCheck },
        { name: 'Control de Mermas', href: 'waste-control', icon: Trash2, permission: 'inventory_read' },
      ]
    },
    { name: 'Entregas', href: 'fulfillment', icon: PackageCheck, permission: 'orders_read' },
    { name: 'Portal Repartidores', href: 'driver', icon: Truck, permission: 'orders_read' }, // TODO: Add driver permission
    { name: 'WhatsApp', href: 'whatsapp', icon: MessageCircleMore, permission: 'chat_read' },
    { name: 'Compras', href: 'purchases', icon: Truck, permission: 'purchases_read' },
    {
      name: 'Producción',
      href: 'production',
      icon: Factory,
      permission: 'inventory_read',
      requiresModule: 'production',
      // Permitido por vertical nativa o por activación manual del super-admin
      requiresVertical: ['MANUFACTURING', 'FOOD_SERVICE'],
      children: [
        { name: 'Dashboard', href: 'production?tab=dashboard', icon: BarChart3 },
        { name: 'Órdenes', href: 'production?tab=orders', icon: Factory },
        { name: 'BOMs', href: 'production?tab=boms', icon: FileText },
        { name: 'Centros de Trabajo', href: 'production?tab=workcenters', icon: Settings },
        { name: 'Rutas', href: 'production?tab=routings', icon: GitBranch },
        { name: 'Versiones', href: 'production?tab=versions', icon: Layers },
      ]
    },
    { name: 'Mi Sitio Web', href: 'storefront', icon: Store, permission: 'dashboard_read', requiresModule: 'ecommerce' },

    // Módulos específicos de Restaurante
    { name: 'Mesas', href: 'restaurant/floor-plan', icon: Utensils, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Cocina (KDS)', href: 'restaurant/kitchen-display', icon: ChefHat, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Recetas', href: 'restaurant/recipes', icon: BookOpen, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Reservas', href: 'restaurant/reservations', icon: Calendar, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Ingeniería de Menú', href: 'restaurant/menu-engineering', icon: Target, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Órdenes de Compra', href: 'restaurant/purchase-orders', icon: FileText, permission: 'restaurant_read', requiresModule: 'restaurant' },

    // Módulos específicos de Hotel / Servicios
    { name: 'Operaciones Hotel', href: 'hospitality/operations', icon: Building2, permission: 'appointments_read', requiresModule: 'appointments', requiresVertical: ['SERVICES', 'HOSPITALITY'] },
    { name: 'Plano Hotel', href: 'hospitality/floor-plan', icon: Building, permission: 'appointments_read', requiresModule: 'appointments', requiresVertical: ['SERVICES', 'HOSPITALITY'] },
    { name: 'Recursos', href: 'resources', icon: UserSquare, permission: 'appointments_read', requiresVertical: ['SERVICES', 'HOSPITALITY'] },
    { name: 'Servicios', href: 'services', icon: Briefcase, permission: 'appointments_read', requiresVertical: ['SERVICES', 'HOSPITALITY'] },
    {
      name: 'Citas',
      href: 'appointments',
      icon: Calendar,
      permission: 'appointments_read',
      requiresVertical: ['SERVICES', 'HOSPITALITY'],
      children: [
        { name: 'Lista', href: 'appointments?tab=list', icon: List },
        { name: 'Calendario hotel', href: 'appointments?tab=calendar', icon: Calendar },
      ]
    },

    // 2. Marketing y CRM
    {
      name: 'Marketing',
      href: 'marketing',
      icon: Mail,
      permission: 'marketing_read',
      requiresModule: 'marketing',
      children: [
        {
          name: 'Campañas',
          href: 'marketing?tab=campaigns-overview',
          icon: Megaphone,
          children: [
            { name: 'Resumen', href: 'marketing?tab=campaigns-overview', icon: BarChart3 },
            { name: 'Campañas', href: 'marketing?tab=campaigns-campaigns', icon: List },
            { name: 'Triggers', href: 'marketing?tab=campaigns-triggers', icon: Zap },
            { name: 'Rendimiento', href: 'marketing?tab=campaigns-performance', icon: TrendingUp },
          ]
        },
        { name: 'Productos', href: 'marketing?tab=products', icon: ShoppingBag },
        { name: 'Lealtad', href: 'marketing?tab=loyalty', icon: Award },
        { name: 'Cupones', href: 'marketing?tab=coupons', icon: Tag },
        { name: 'Promociones', href: 'marketing?tab=promotions', icon: Percent },
      ]
    },
    {
      name: 'CRM',
      href: 'crm',
      icon: Users,
      permission: 'customers_read',
      children: [
        {
          name: 'Contactos',
          href: 'crm?tab=all',
          icon: Users,
          children: [
            { name: 'Todos', href: 'crm?tab=all', icon: Users },
            { name: 'Clientes', href: 'crm?tab=individual', icon: Users },
            { name: 'Proveedores', href: 'crm?tab=supplier', icon: Truck },
          ]
        },
        {
          name: 'Embudo de Ventas',
          href: 'crm?tab=pipeline',
          icon: Filter,
          children: [
            { name: 'Pipeline', href: 'crm?tab=pipeline', icon: BarChart3 },
          ]
        }
      ]
    },

    // 3. Contabilidad, Finanzas y RH
    {
      name: 'Contabilidad General',
      href: 'accounting',
      icon: Calculator,
      permission: 'accounting_read',
      children: [
        { name: 'Facturación Electrónica', href: 'accounting?tab=electronic-invoices', icon: Receipt },
        { name: 'Libro Diario', href: 'accounting?tab=journal', icon: FileText },
        { name: 'Libro Mayor', href: 'accounting?tab=general-ledger', icon: BookOpen },
        { name: 'Libro de Ventas', href: 'accounting?tab=sales-book', icon: BookOpen },
        { name: 'Declaración IVA', href: 'accounting?tab=iva-declaration', icon: FileText },
        { name: 'Retenciones ISLR', href: 'accounting?tab=islr-withholding', icon: FileText },
        { name: 'Balance de Comprobación', href: 'accounting?tab=trial-balance', icon: BarChart3 },
        { name: 'Estado de Resultados', href: 'accounting?tab=profit-loss', icon: TrendingUp },
        { name: 'Balance General', href: 'accounting?tab=balance-sheet', icon: AreaChart },
        { name: 'Informes', href: 'accounting?tab=reports', icon: FileText },
      ]
    },
    {
      name: 'Cuentas por Pagar',
      href: 'accounts-payable',
      icon: BanknoteArrowDown,
      permission: 'accounting_read',
      children: [
        { name: 'Cuentas por Pagar', href: 'accounts-payable?tab=monthly', icon: TrendingDown },
        { name: 'Pagos Recurrentes', href: 'accounts-payable?tab=recurring', icon: RefreshCw },
        { name: 'Historial', href: 'accounts-payable?tab=history', icon: List },
      ]
    },
    {
      name: 'Cuentas por Cobrar',
      href: 'receivables?tab=pending',
      icon: BanknoteArrowUp,
      permission: 'accounting_read',
      children: [
        { name: 'Pendientes', href: 'receivables?tab=pending', icon: Clock },
        { name: 'Confirmados', href: 'receivables?tab=confirmed', icon: CheckCircle2 },
        { name: 'Por cliente', href: 'receivables?tab=customers', icon: Users },
        { name: 'Reportes', href: 'receivables?tab=reports', icon: TrendingUp },
      ]
    },
    {
      name: 'Recursos Humanos',
      href: 'payroll/runs',
      icon: UserCog,
      permission: 'payroll_employees_read',
      requiresModule: 'payroll',
      children: [
        {
          name: 'Gestión de Equipo',
          href: 'payroll/employees',
          icon: Users,
          children: [
            { name: 'Empleados', href: 'payroll/employees', icon: Users },
            { name: 'Turnos', href: 'hr/shifts', icon: Clock },
            { name: 'Ausencias', href: 'payroll/absences', icon: CalendarDays },
          ]
        },
        {
          name: 'Nómina',
          href: 'payroll/runs',
          icon: BarChart3,
          children: [
            { name: 'Nómina', href: 'payroll/runs', icon: BarChart3 },
            { name: 'Calendario', href: 'payroll/calendar', icon: CalendarDays },
            { name: 'Estructuras', href: 'payroll/structures', icon: Layers },
          ]
        }
      ],
    },
    { name: 'tips', href: 'tips', icon: CircleDollarSign, permission: 'tips_read', requiresModule: 'tips', dynamicLabel: true }, // Dynamic label: Tips or Commissions
    { name: 'Comisiones y Metas', href: 'commissions', icon: HandCoins, permission: 'commissions_read', requiresModule: 'commissions' },
    { name: 'Cuentas Bancarias', href: 'bank-accounts', icon: CreditCard, permission: 'accounting_read', requiresModule: 'bankAccounts' },
    { name: 'Activos Fijos', href: 'fixed-assets', icon: Building, permission: 'reports_read' },
    { name: 'Inversiones', href: 'investments', icon: Briefcase, permission: 'reports_read' },
    { name: 'Cierre de Caja', href: 'cash-register', icon: Receipt, permission: 'cash_register_read', requiresModule: 'cashRegister' },
    // Facturación Electrónica ahora vive dentro de Contabilidad General
    { name: 'Reportes', href: 'reports', icon: AreaChart, permission: 'reports_read' },
    { name: 'Importar Datos', href: 'data-import', icon: Upload, permission: 'data_import_read' },

    // 4. Calendario
    {
      name: 'Calendario',
      href: 'calendar',
      icon: CalendarDays,
      permission: 'events_read',
      children: [
        { name: 'Calendario', href: 'calendar?tab=calendar', icon: CalendarDays },
        { name: 'Configuración', href: 'calendar?tab=management', icon: Settings },
      ]
    },
  ];

  const SidebarNavigation = () => {
    const { state, setOpen, isMobile, setOpenMobile } = useSidebar();
    const { unreadCount } = useNotification();
    const tipsLabels = useTipsLabels();

    const currentBasePath = activeTab.split('?')[0];

    // Helper function to get display name for menu items
    const getDisplayName = (item) => {
      if (item.dynamicLabel && item.name === 'tips') {
        return tipsLabels.plural; // "Propinas" or "Comisiones"
      }
      if (item.name === 'Citas' && tenant?.vertical === 'HOSPITALITY') {
        return 'Reservaciones';
      }
      return item.name;
    };

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
      if (item.requiresModule) {
        if (item.requiresModule === 'restaurant' && !restaurantModuleEnabled) {
          return null;
        }
        if (
          item.requiresModule !== 'restaurant' &&
          !tenant?.enabledModules?.[item.requiresModule]
        ) {
          return null;
        }
      }

      if (item.requiresVertical && !item.requiresVertical.includes(tenant?.vertical)) {
        return null;
      }

      if (item.permission && !hasPermission(item.permission)) {
        return null;
      }

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
              {item.href === 'whatsapp' && unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] h-5 min-w-5 flex items-center justify-center group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:shadow-md">
                  {unreadCount > 99 ? '99+' : unreadCount}
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
              <img src={logoSrc} alt="Smart Kubik" className="h-[18px] w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <ShiftTimer />
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="hidden items-center justify-between border-b border-border bg-card px-6 py-4 md:flex">
            <div className="flex items-center gap-3">
              <img src={logoSrc} alt="Smart Kubik" className="h-8 w-auto" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Hola, {tenant?.ownerFirstName || user?.firstName || 'Usuario'}</span>
              <ShiftTimer />
              {isClockedIn ? (
                <Button variant="destructive" size="sm" onClick={clockOut} disabled={isShiftLoading}>
                  <StopCircle className="mr-2" size={12} />
                  Finalizar Turno
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={clockIn} disabled={isShiftLoading}>
                  <PlayCircle className="mr-2" size={12} />
                  Iniciar Turno
                </Button>
              )}
              {isMultiTenantEnabled && memberships.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openTenantDialog}
                >
                  <Building2 className="mr-2" size={12} />
                  {tenant?.name || 'Seleccionar organización'}
                </Button>
              )}
              <NotificationCenter />
              <ThemeToggle />
              <Button id="settings-button" variant="outline" size="icon" onClick={() => navigate('/settings')}>
                <Settings size={12} />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2" size={12} />
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
                <Route path="crm" element={
                  <CrmProvider>
                    <CRMManagement hideEmployeeTab />
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
                <Route path="accounting/islr-withholding" element={<IslrWithholdingList />} />
                <Route path="billing" element={<Navigate to="/accounting?tab=electronic-invoices" replace />} />
                <Route path="billing/create" element={<BillingCreateForm />} />
                <Route path="billing/sequences" element={<BillingSequencesManager />} />
                <Route path="billing/documents/:id" element={<BillingDocumentDetail />} />
                <Route path="cash-register" element={<CashRegisterPage />} />
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
                    <AppointmentsManagement />
                  </CrmProvider>
                } />
                <Route path="services" element={<ServicesManagement />} />
                <Route path="resources" element={<ResourcesManagement />} />
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
                <Route path="commissions" element={<CommissionsPage />} />
                <Route path="restaurant/menu-engineering" element={<MenuEngineeringPage />} />
                <Route path="restaurant/recipes" element={<RecipesPage />} />
                <Route path="restaurant/purchase-orders" element={<PurchaseOrdersPage />} />
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
                <Route path="settings" element={<SettingsPage />} />
                <Route path="data-import" element={<DataImportPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="*" element={<NotFoundPage />} />
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
      <ShadcnToaster />
      <Suspense fallback={<LoadingFallback />}>

        <Routes>
          <Route path="/v2" element={<SmartKubikLandingV2 />} />
          <Route path="/fundadores" element={<FoundersPage />} />
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
                <ShiftProvider>
                  <AccountingProvider>
                    <CashRegisterProvider>
                      <TenantLayout />
                    </CashRegisterProvider>
                  </AccountingProvider>
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
