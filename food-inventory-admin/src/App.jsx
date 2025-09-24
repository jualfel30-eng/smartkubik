import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import CRMManagement from '@/components/CRMManagement.jsx';
import { OrdersManagementV2 as OrdersManagement } from '@/components/orders/v2/OrdersManagementV2.jsx';
import { CalendarView } from '@/components/CalendarView.jsx';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth, AuthProvider } from './hooks/use-auth.jsx';
import { useShift, ShiftProvider } from './context/ShiftContext.jsx';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3, 
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
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import './App.css';
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CrmProvider } from './context/CrmContext.jsx';
import { FormStateProvider } from './context/FormStateContext.jsx';
import { AccountingProvider } from './context/AccountingContext.jsx';
import DashboardView from './components/DashboardView.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import InventoryDashboard from './components/InventoryDashboard.jsx';
import AccountingDashboard from './components/AccountingDashboard.jsx';
import AccountsReceivableReport from './components/AccountsReceivableReport.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SmartKubikLanding from './pages/SmartKubikLanding';

// Tenant Layout Component
function TenantLayout() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const { isClockedIn, clockIn, clockOut, isLoading: isShiftLoading } = useShift();
  const navigate = useNavigate();

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
    { name: 'Dashboard', href: 'dashboard', icon: LayoutDashboard, permission: 'dashboard_read' },
    { name: 'Órdenes', href: 'orders', icon: ShoppingCart, permission: 'orders_read' },
    { name: 'Inventario', href: 'inventory-management', icon: Package, permission: 'inventory_read' },
    { name: 'Contabilidad', href: 'accounting-management', icon: BookCopy, permission: 'accounting_read' },
    { name: 'CRM', href: 'crm', icon: Users, permission: 'customers_read' },
    { name: 'Calendario', href: 'calendar', icon: CalendarDays, permission: 'events_read' },
    { name: 'Reportes', href: 'reports', icon: AreaChart, permission: 'reports_read' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      
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
                <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
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
        <Routes>
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="inventory-management" element={<InventoryDashboard />} />
          <Route path="crm" element={<CRMManagement />} />
          <Route path="orders" element={<OrdersManagement />} />
          <Route path="accounting-management" element={<AccountingDashboard />} />
          <Route path="accounting/reports/accounts-receivable" element={<AccountsReceivableReport />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="dashboard" />} />
        </Routes>
      </main>
    </div>
  );
}

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<SmartKubikLanding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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