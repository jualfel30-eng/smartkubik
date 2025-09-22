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
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import './App.css';
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CrmProvider } from './context/CrmContext.jsx';
import { FormStateProvider } from './context/FormStateContext.jsx';
import DashboardView from './components/DashboardView.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import InventoryDashboard from './components/InventoryDashboard.jsx';
import AccountingDashboard from './components/AccountingDashboard.jsx';
import AccountsReceivableReport from './components/AccountsReceivableReport.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SuperAdminLayout from './layouts/SuperAdminLayout';

// Tenant Layout Component
function TenantLayout() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout, hasPermission } = useAuth();
  const { isClockedIn, clockIn, clockOut, isLoading: isShiftLoading } = useShift();
  const navigate = useNavigate();

  useEffect(() => {
    const currentPath = location.pathname.substring(1);
    const defaultTab = 'dashboard';
    const tab = currentPath.split('/')[0] || defaultTab;
    setActiveTab(tab);
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

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-foreground">Food Inventory SaaS</h1>
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

      <div className="bg-card border-b border-border py-2">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="px-6">
          <TabsList className="max-w-full overflow-x-auto">
            {hasPermission('dashboard_read') && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
            {hasPermission('orders_read') && <TabsTrigger value="orders">Órdenes</TabsTrigger>}
            {hasPermission('inventory_read') && <TabsTrigger value="inventory-management">Inventario</TabsTrigger>}
            {hasPermission('accounting_read') && <TabsTrigger value="accounting-management">Contabilidad</TabsTrigger>}
            {hasPermission('customers_read') && <TabsTrigger value="crm">CRM</TabsTrigger>}
            {hasPermission('events_read') && <TabsTrigger value="calendar">Calendario</TabsTrigger>}
            {hasPermission('reports_read') && <TabsTrigger value="reports">Reportes</TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>

      <main className="p-6">
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
  const { user } = useAuth();

  return (
    <Routes>
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
                  <TenantLayout />
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
