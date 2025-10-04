import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth, AuthProvider } from './hooks/use-auth.jsx';
import { useShift, ShiftProvider } from './context/ShiftContext.jsx';
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
  Menu,
  X,
  Truck,
  Building2,
  Calendar,
  Briefcase,
  UserSquare,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import './App.css';
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CrmProvider } from './context/CrmContext.jsx';
import { FormStateProvider } from './context/FormStateContext.jsx';
import { AccountingProvider } from './context/AccountingContext.jsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';

// Tutorial Imports (Desactivado)
// import { TutorialProvider, useTutorial } from './context/TutorialContext.jsx';
// import Tutorial from './components/Tutorial.jsx';
// import ComprehensiveElementScanner from './components/ComprehensiveElementScanner.jsx';

// Lazy load the components
const CRMManagement = lazy(() => import('@/components/CRMManagement.jsx'));
const OrdersManagement = lazy(() => import('@/components/orders/v2/OrdersManagementV2.jsx').then(module => ({ default: module.OrdersManagementV2 })));
const CalendarView = lazy(() => import('@/components/CalendarView.jsx').then(module => ({ default: module.CalendarView })));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const DashboardView = lazy(() => import('./components/DashboardView.jsx'));
const SettingsPage = lazy(() => import('./components/SettingsPage.jsx'));
const InventoryDashboard = lazy(() => import('@/components/InventoryDashboard.jsx'));
const AccountingDashboard = lazy(() => import('@/components/AccountingDashboard.jsx'));
const AccountsReceivableReport = lazy(() => import('@/components/AccountsReceivableReport.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const SuperAdminLayout = lazy(() => import('./layouts/SuperAdminLayout'));
const SmartKubikLanding = lazy(() => import('./pages/SmartKubikLanding'));
const ComprasManagement = lazy(() => import('@/components/ComprasManagement.jsx'));
const BankAccountsManagement = lazy(() => import('@/components/BankAccountsManagement.jsx'));
const RubikLoader = lazy(() => import('@/components/RubikLoader.jsx'));
const ServicesManagement = lazy(() => import('@/components/ServicesManagement.jsx'));
const ResourcesManagement = lazy(() => import('@/components/ResourcesManagement.jsx'));
const AppointmentsManagement = lazy(() => import('@/components/AppointmentsManagement.jsx'));

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
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const { isClockedIn, clockIn, clockOut, isLoading: isShiftLoading } = useShift();
  const navigate = useNavigate();
  // const { startTutorial } = useTutorial(); // Desactivado

  useEffect(() => {
    const currentPath = location.pathname.substring(1);
    const defaultTab = 'dashboard';
    const tab = currentPath.split('/')[0] || defaultTab;
    setActiveTab(tab);
    setMobileMenuOpen(false); // Close mobile menu on navigation
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTabChange = (tab) => {
    navigate(`/${tab}`);
  }

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

  const navLinks = [
    { name: 'Panel de Control', href: 'dashboard', icon: LayoutDashboard, permission: 'dashboard_read' },
    { name: 'Órdenes', href: 'orders', icon: ShoppingCart, permission: 'orders_read' },
    { name: 'Inventario', href: 'inventory-management', icon: Package, permission: 'inventory_read' },
    { name: 'Contabilidad', href: 'accounting-management', icon: BookCopy, permission: 'accounting_read' },
    { name: 'Cuentas Bancarias', href: 'bank-accounts', icon: Building2, permission: 'accounting_read' },
    { name: 'CRM', href: 'crm', icon: Users, permission: 'customers_read' },
    { name: 'Compras', href: 'purchases', icon: Truck, permission: 'purchases_read' },
    { name: 'Citas', href: 'appointments', icon: Calendar, permission: 'appointments_read' },
    { name: 'Servicios', href: 'services', icon: Briefcase, permission: 'appointments_read' },
    { name: 'Recursos', href: 'resources', icon: UserSquare, permission: 'appointments_read' },
    { name: 'Calendario', href: 'calendar', icon: CalendarDays, permission: 'events_read' },
    { name: 'Reportes', href: 'reports', icon: AreaChart, permission: 'reports_read' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      {/* <Tutorial /> */}
      {/* <Button onClick={startTutorial} className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg z-[10001] flex items-center px-4 py-2">
        <PlayCircle className="h-5 w-5 mr-2" />
        Seguir tutorial de uso
      </Button> */}
      
      {/* Mobile Header & Menu */}
      <div className="md:hidden">
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-7 w-7 text-blue-600" />
            <h1 className="text-xl font-bold text-foreground">Smart Kubik</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Mobile Menu (Drawer) */}
        <div className={`fixed inset-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative z-10 h-full w-72 bg-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                    <Package className="h-8 w-8 text-blue-600" />
                    <h1 className="text-2xl font-bold text-foreground">Smart Kubik</h1>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-6 w-6" />
                </Button>
            </div>
            
            <nav className="flex-1 flex flex-col space-y-2">
              {navLinks.map(link => hasPermission(link.permission) && (
                <Button
                  key={link.name}
                  variant={activeTab === link.href ? 'secondary' : 'ghost'}
                  className="justify-start"
                  onClick={() => handleTabChange(link.href)}
                >
                  <link.icon className="mr-3 h-5 w-5" />
                  {link.name}
                </Button>
              ))}
            </nav>

            <div className="mt-auto">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Hola, {user?.firstName || 'Usuario'}</span>
                    <ThemeToggle />
                </div>
                {hasPermission('tenant_settings_read') && (
                    <Button variant="outline" className="w-full justify-start mb-2" onClick={() => navigate('/settings')}>
                        <Settings className="mr-3 h-5 w-5" />
                        Configuración
                    </Button>
                )}
                <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                  <LogOut className="mr-3 h-5 w-5" />
                  Cerrar Sesión
                </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="hidden md:block bg-card border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-foreground">Smart Kubik</h1>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              🇻🇪 Venezuela
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
             <span className="text-sm text-muted-foreground">Hola, {user?.firstName || 'Usuario'}</span>
             <ShiftTimer />
            {isClockedIn ? (
              <Button variant="destructive" size="sm" onClick={clockOut} disabled={isShiftLoading}>
                <StopCircle className="h-4 w-4 mr-2" />
                Finalizar Turno
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={clockIn} disabled={isShiftLoading}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Iniciar Turno
              </Button>
            )}
            <ThemeToggle />
            {hasPermission('tenant_settings_read') && (
                <Button id="settings-button" variant="outline" size="icon" onClick={() => navigate('/settings')}>
                    <Settings className="h-4 w-4" />
                </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop Tabs */}
      <div className="hidden md:block bg-card py-2">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="px-6">
          <TabsList className="max-w-full overflow-x-auto">
            {navLinks.map(link => hasPermission(link.permission) && (
              <TabsTrigger key={link.href} value={link.href}>
                <link.icon className="mr-2 h-4 w-4" />
                {link.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <main className="p-4 md:p-6">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="dashboard" element={<DashboardView />} />
            <Route path="inventory-management" element={<InventoryDashboard />} />
            <Route path="crm" element={<CRMManagement />} />
            <Route path="orders" element={<OrdersManagement />} />
            <Route path="purchases" element={<ComprasManagement />} />
            <Route path="accounting-management" element={<AccountingDashboard />} />
            <Route path="accounting/reports/accounts-receivable" element={<AccountsReceivableReport />} />
            <Route path="bank-accounts" element={<BankAccountsManagement />} />
            <Route path="appointments" element={<AppointmentsManagement />} />
            <Route path="services" element={<ServicesManagement />} />
            <Route path="resources" element={<ResourcesManagement />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="dashboard" />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function AppContent() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<SmartKubikLanding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
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
            <ProtectedRoute>
              {/* <TutorialProvider> */}
                <FormStateProvider>
                  <CrmProvider>
                    <ShiftProvider>
                      <AccountingProvider>
                        <TenantLayout />
                      </AccountingProvider>
                    </ShiftProvider>
                  </CrmProvider>
                </FormStateProvider>
              {/* </TutorialProvider> */}
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
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
      {/* {process.env.NODE_ENV === 'development' && <ComprehensiveElementScanner />} */}
    </Router>
  );
}

export default App;