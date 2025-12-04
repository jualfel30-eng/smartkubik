'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getStorefrontConfig, getCustomerOrders } from '@/lib/api';
import { Order } from '@/types';

interface OrderHistoryClientProps {
  domain: string;
}

// Status badge styling
const statusConfig = {
  pending: { label: 'Pendiente', bgClass: 'bg-yellow-100 text-yellow-800', bgDarkClass: 'bg-yellow-900/30 text-yellow-400' },
  confirmed: { label: 'Confirmada', bgClass: 'bg-blue-100 text-blue-800', bgDarkClass: 'bg-blue-900/30 text-blue-400' },
  processing: { label: 'Procesando', bgClass: 'bg-indigo-100 text-indigo-800', bgDarkClass: 'bg-indigo-900/30 text-indigo-400' },
  shipped: { label: 'Enviada', bgClass: 'bg-purple-100 text-purple-800', bgDarkClass: 'bg-purple-900/30 text-purple-400' },
  delivered: { label: 'Entregada', bgClass: 'bg-green-100 text-green-800', bgDarkClass: 'bg-green-900/30 text-green-400' },
  completed: { label: 'Completada', bgClass: 'bg-green-100 text-green-800', bgDarkClass: 'bg-green-900/30 text-green-400' },
  cancelled: { label: 'Cancelada', bgClass: 'bg-red-100 text-red-800', bgDarkClass: 'bg-red-900/30 text-red-400' },
};

export function OrderHistoryClient({ domain }: OrderHistoryClientProps) {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [error, setError] = useState('');

  // Detectar dark mode
  useEffect(() => {
    const stored = localStorage.getItem('storefront_theme');
    if (stored) {
      const val = stored === 'dark';
      setIsDarkMode(val);
      document.documentElement.classList.toggle('dark', val);
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  // Cargar tenantId
  useEffect(() => {
    getStorefrontConfig(domain).then((config) => {
      const id = typeof config.tenantId === 'string'
        ? config.tenantId
        : config.tenantId._id;
      setTenantId(id);
    }).catch((err) => {
      console.error('Error loading tenant config:', err);
    });
  }, [domain]);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${domain}/login`);
    }
  }, [isLoading, isAuthenticated, router, domain]);

  // Cargar órdenes
  useEffect(() => {
    if (!tenantId || !isAuthenticated) return;

    const token = localStorage.getItem('customer_token');
    if (!token) {
      setIsLoadingOrders(false);
      return;
    }

    setIsLoadingOrders(true);
    getCustomerOrders(token, tenantId)
      .then((data) => {
        setOrders(data);
        setError('');
      })
      .catch((err) => {
        console.error('Error loading orders:', err);
        if (err.message === 'Sesión expirada') {
          router.push(`/${domain}/login`);
        } else {
          setError(err.message || 'Error al cargar las órdenes');
        }
      })
      .finally(() => {
        setIsLoadingOrders(false);
      });
  }, [tenantId, isAuthenticated, router, domain]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: Order['status']) => {
    const config = statusConfig[status] || statusConfig.pending;
    const bgClass = isDarkMode ? config.bgDarkClass : config.bgClass;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgClass}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading || isLoadingOrders) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Cargando órdenes...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <div className={`shadow rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Header */}
          <div className={`px-6 py-5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mis Órdenes</h1>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Historial de todas tus compras
                </p>
              </div>
              <div className="flex gap-4">
                <Link
                  href={`/${domain}/perfil`}
                  className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Mi Perfil
                </Link>
                <Link
                  href={`/${domain}`}
                  className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Volver a la tienda
                </Link>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className={`mx-6 mt-6 rounded-md p-4 ${isDarkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50'}`}>
              <div className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>{error}</div>
            </div>
          )}

          {/* Orders List */}
          <div className="px-6 py-6">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  No tienes órdenes
                </h3>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Comienza a comprar para ver tu historial aquí
                </p>
                <div className="mt-6">
                  <Link
                    href={`/${domain}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Explorar productos
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}>
                      <tr>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Orden
                        </th>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Fecha
                        </th>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Total
                        </th>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Estado
                        </th>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {orders.map((order) => (
                        <tr key={order._id} className={isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {order.orderNumber}
                            </div>
                            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {order.items?.length || 0} {order.items?.length === 1 ? 'producto' : 'productos'}
                            </div>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {formatDate(order.createdAt)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatCurrency(order.totalAmount || order.total || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link
                              href={`/${domain}/orden/${order.orderNumber}`}
                              className="text-primary hover:opacity-80 font-medium"
                            >
                              Ver detalles
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order._id}
                      className={`border rounded-lg p-4 ${isDarkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {order.orderNumber}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {order.items?.length || 0} {order.items?.length === 1 ? 'producto' : 'productos'}
                          </span>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatCurrency(order.totalAmount || order.total || 0)}
                          </span>
                        </div>
                        <Link
                          href={`/${domain}/orden/${order.orderNumber}`}
                          className="block w-full text-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer with order count */}
          {orders.length > 0 && (
            <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Mostrando {orders.length} {orders.length === 1 ? 'orden' : 'órdenes'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
