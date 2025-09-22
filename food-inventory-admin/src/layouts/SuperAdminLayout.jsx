import { useState, useEffect } from 'react';
import { Link, useLocation, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  BarChart3,
  Users,
  CalendarDays,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from "@/components/ThemeToggle";
import GlobalMetricsDashboard from '@/components/GlobalMetricsDashboard';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import SuperAdminCrm from '@/components/super-admin/SuperAdminCrm';
import SuperAdminCalendar from '@/components/super-admin/SuperAdminCalendar';
import TenantUserList from '@/components/TenantUserList';
import AuditLogView from '@/components/AuditLogView';

const navItems = [
  { to: '/super-admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/super-admin/crm', icon: Users, label: 'CRM' },
  { to: '/super-admin/calendar', icon: CalendarDays, label: 'Calendario' },
  { to: '/super-admin/tenants', icon: Settings, label: 'Gestión de Tenants' },
];

const NavLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <Link to={to}>
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-8 w-8 text-red-600" />
              <h1 className="text-2xl font-bold text-foreground">Super Admin</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <span className="text-sm text-muted-foreground">Hola, {user?.firstName || 'Super Admin'}</span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 bg-card border-r border-border p-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink key={item.to} {...item} />
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <Routes>
            <Route path="dashboard" element={<GlobalMetricsDashboard />} />
            <Route path="crm" element={<SuperAdminCrm />} />
            <Route path="calendar" element={<SuperAdminCalendar />} />
            <Route path="tenants" element={<SuperAdminDashboard />} />
            <Route path="tenants/:tenantId/users" element={<TenantUserList />} />
            <Route path="audit-logs" element={<AuditLogView />} />
            <Route path="*" element={<Navigate to="dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default SuperAdminLayout;
