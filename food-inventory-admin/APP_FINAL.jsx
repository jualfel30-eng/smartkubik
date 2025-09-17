import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import InventoryManagement from '@/components/InventoryManagement.jsx';
import CRMManagement from '@/components/CRMManagement.jsx';
import OrdersManagement from '@/components/OrdersManagement-Fixed.jsx';
import ProductsManagement from '@/components/ProductsManagement.jsx';
import { CalendarView } from '@/components/CalendarView.jsx';
import ComprasManagement from '@/components/ComprasManagement.jsx';
import PurchaseHistory from '@/components/PurchaseHistory.jsx';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/use-auth.jsx';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Bell,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  LogOut,
  CalendarDays,
  Truck,
  Landmark,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import './App.css';
import { ThemeToggle } from "@/components/ThemeToggle";
import { CrmProvider } from './context/CrmContext.jsx';
import { FormStateProvider } from './context/FormStateContext.jsx';
import DashboardView from './components/DashboardView.jsx';
import AccountingManagement from './components/AccountingManagement.jsx';



// Componente de Layout Principal
function AdminLayout() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout } = useAuth();
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
          <TabsList className="grid w-full grid-cols-8 max-w-5xl">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2"> <BarChart3 className="h-4 w-4" /> <span>Dashboard</span> </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center space-x-2"> <Package className="h-4 w-4" /> <span>Producto</span> </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center space-x-2"> <Package className="h-4 w-4" /> <span>Inventario</span> </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center space-x-2"> <ShoppingCart className="h-4 w-4" /> <span>Órdenes</span> </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center space-x-2"> <Truck className="h-4 w-4" /> <span>Compras</span> </TabsTrigger>
            <TabsTrigger value="crm" className="flex items-center space-x-2"> <Users className="h-4 w-4" /> <span>CRM</span> </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center space-x-2"> <CalendarDays className="h-4 w-4" /> <span>Calendario</span> </TabsTrigger>
            <TabsTrigger value="accounting" className="flex items-center space-x-2"> <Landmark className="h-4 w-4" /> <span>Contabilidad</span> </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <main className="p-6">
        <Routes>
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/inventory" element={<InventoryView />} />
          <Route path="/crm" element={<CRMView />} />
          <Route path="/orders" element={<OrdersView />} />
          <Route path="/products" element={<ProductsView />} />
          <Route path="/purchases" element={<ComprasView />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/accounting" element={<AccountingManagement />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  );
}

// Views for each module
function InventoryView() { return <InventoryManagement />; }
function CRMView() { return <CRMManagement />; }
function OrdersView() { return <OrdersManagement />; }
function ProductsView() { return <ProductsManagement />; }
function CalendarModuleView() { return <CalendarView />; }

function ComprasView() { return <ComprasManagement />; }

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
