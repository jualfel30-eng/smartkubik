import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import CRMManagement from '@/components/CRMManagement.jsx';
import { OrdersManagementV2 as OrdersManagement } from '@/components/orders/v2/OrdersManagementV2.jsx';
import { CalendarView } from '@/components/CalendarView.jsx';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/use-auth.jsx';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  LogOut,
  CalendarDays,
  BookCopy,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import './App.css';
import { ThemeToggle } from "@/components/ThemeToggle";
import { CrmProvider } from './context/CrmContext.jsx';
import { FormStateProvider } from './context/FormStateContext.jsx';
import DashboardView from './components/DashboardView.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';

// New Dashboard Components
import InventoryDashboard from './components/InventoryDashboard.jsx';
import AccountingDashboard from './components/AccountingDashboard.jsx';
import AccountsReceivableReport from './components/AccountsReceivableReport.jsx';

// Main Layout Component
function AdminLayout() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const currentPath = location.pathname.substring(1); // remove leading '/'
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

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      {/* Header */}
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

      {/* Navigation Tabs */}
      <div className="bg-card border-b border-border py-2">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="px-6">
          <TabsList className="max-w-5xl">
            {hasPermission('dashboard_read') && <TabsTrigger value="dashboard" className="flex items-center space-x-2"> <BarChart3 className="h-4 w-4" /> <span>Dashboard</span> </TabsTrigger>}
            {hasPermission('orders_read') && <TabsTrigger value="orders" className="flex items-center space-x-2"> <ShoppingCart className="h-4 w-4" /> <span>Órdenes</span> </TabsTrigger>}
            {hasPermission('inventory_read') && <TabsTrigger value="inventory-management" className="flex items-center space-x-2"> <Package className="h-4 w-4" /> <span>Gestión de Inventario</span> </TabsTrigger>}
            {hasPermission('accounting_read') && <TabsTrigger value="accounting-management" className="flex items-center space-x-2"> <BookCopy className="h-4 w-4" /> <span>Gestión Contable</span> </TabsTrigger>}
            {hasPermission('customers_read') && <TabsTrigger value="crm" className="flex items-center space-x-2"> <Users className="h-4 w-4" /> <span>CRM</span> </TabsTrigger>}
            {hasPermission('events_read') && <TabsTrigger value="calendar" className="flex items-center space-x-2"> <CalendarDays className="h-4 w-4" /> <span>Calendario</span> </TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <main className="p-6">
        <Routes>
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/inventory-management" element={<InventoryDashboard />} />
          <Route path="/crm" element={<CRMManagement />} />
          <Route path="/orders" element={<OrdersManagement />} />
          <Route path="/accounting-management" element={<AccountingDashboard />} />
          <Route path="/accounting/reports/accounts-receivable" element={<AccountsReceivableReport />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <FormStateProvider>
                <CrmProvider>
                  <AdminLayout />
                </CrmProvider>
              </FormStateProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;