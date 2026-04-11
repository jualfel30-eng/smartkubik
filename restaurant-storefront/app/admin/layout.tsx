'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('admin_token');

      if (!token) {
        if (pathname !== '/admin/login') router.push('/admin/login');
        setIsLoading(false);
        return;
      }

      try {
        // SmartKubik: GET /auth/me retorna el usuario actual si el token es válido
        await api.get<{ _id: string }>('/auth/me', { token });
        setIsAuthenticated(true);
        if (pathname === '/admin/login') router.push('/admin/dashboard');
      } catch {
        localStorage.removeItem('admin_token');
        if (pathname !== '/admin/login') router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-t-2 border-accent animate-spin" />
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-6 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
