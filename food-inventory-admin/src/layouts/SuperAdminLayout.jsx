import { useState } from 'react';
import { Link, useLocation, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  Activity,
  BrainCircuit,
  CalendarDays,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from "@/components/ThemeToggle";
import GlobalMetricsDashboard from '@/components/GlobalMetricsDashboard';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import SuperAdminCrm from '@/components/super-admin/SuperAdminCrm';
import SuperAdminCalendar from '@/components/super-admin/SuperAdminCalendar';
import TenantUserList from '@/components/TenantUserList';
import AuditLogView from '@/components/AuditLogView';
import TenantConfigurationEdit from '@/components/super-admin/TenantConfigurationEdit';
import SuperAdminSettings from '@/components/super-admin/SuperAdminSettings';
import KnowledgeBaseManagement from '@/components/super-admin/KnowledgeBaseManagement';
import QueueMonitor from '@/components/super-admin/QueueMonitor';

const navItems = [
  { to: '/super-admin/tenants', icon: Settings, label: 'Gestión de Tenants' },
  { to: '/super-admin/crm', icon: Users, label: 'CRM' },
  { to: '/super-admin/calendar', icon: CalendarDays, label: 'Calendario' },
  { to: '/super-admin/knowledge-base', icon: BrainCircuit, label: 'Base de Conocimiento' },
  { to: '/super-admin/settings', icon: Settings, label: 'Ajustes' },
  { to: '/super-admin/queues', icon: Activity, label: 'Cola de Tareas' },
];

const NavLink = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <Link to={to} onClick={onClick}>
      <Button variant={isActive ? 'secondary' : 'ghost'} className="w-full justify-start">
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
};

function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />

      {/* Mobile Header */}
      <header className="md:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-7 w-7 text-red-600" />
          <h1 className="text-xl font-bold text-foreground">Super Admin</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      {/* Mobile Menu (Drawer) */}
      <div className={`fixed inset-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:hidden`}>
        <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)}></div>
        <div className="relative z-10 h-full w-72 bg-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-8 w-8 text-red-600" />
              <h1 className="text-2xl font-bold text-foreground">Super Admin</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <nav className="flex-1 flex flex-col space-y-2">
            {navItems.map((item) => (
              <NavLink key={item.to} {...item} onClick={() => setMobileMenuOpen(false)} />
            ))}
          </nav>
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Hola, {user?.firstName || 'Super Admin'}</span>
              <ThemeToggle />
            </div>
            <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-3 h-5 w-5" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border p-4">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <ShieldCheck className="h-8 w-8 text-red-600" />
            <h1 className="text-2xl font-bold text-foreground">Super Admin</h1>
          </div>
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <NavLink key={item.to} {...item} />
            ))}
          </nav>
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-sm text-muted-foreground">Hola, {user?.firstName || 'Super Admin'}</span>
              <ThemeToggle />
            </div>
            <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-3 h-5 w-5" />
              Cerrar Sesión
            </Button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          <div className="flex-1 p-6">
            <Routes>
              <Route path="dashboard" element={<GlobalMetricsDashboard />} />
              <Route path="crm" element={<SuperAdminCrm />} />
              <Route path="calendar" element={<SuperAdminCalendar />} />
              <Route path="tenants" element={<SuperAdminDashboard />} />
              <Route path="tenants/:tenantId/users" element={<TenantUserList />} />
              <Route path="tenants/:tenantId/configuration" element={<TenantConfigurationEdit />} />
              <Route path="settings" element={<SuperAdminSettings />} />
              <Route path="knowledge-base" element={<KnowledgeBaseManagement />} />
              <Route path="queues" element={<QueueMonitor />} />
              <Route path="audit-logs" element={<AuditLogView />} />
              <Route path="*" element={<Navigate to="tenants" />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default SuperAdminLayout;
