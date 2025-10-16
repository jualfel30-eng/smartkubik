import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchApi, getTenantSettings } from '@/lib/api';
import { OrdersDataTableV2 } from './OrdersDataTableV2';
import { Badge } from "@/components/ui/badge";
import { NewOrderFormV2 } from './NewOrderFormV2';
import { PaymentDialogV2 } from './PaymentDialogV2';
import { OrderStatusSelector } from './OrderStatusSelector';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { Button } from "@/components/ui/button";
import { CreditCard, RefreshCw, Search, Printer, ChefHat } from "lucide-react";
import { useDebounce } from '@/hooks/use-debounce.js';
import { useCrmContext } from '@/context/CrmContext.jsx';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth.jsx';

const paymentStatusMap = {
  pending: { label: 'Pendiente', variant: 'outline' },
  partial: { label: 'Parcial', variant: 'warning' },
  paid: { label: 'Pagado', variant: 'success' },
  overpaid: { label: 'Sobrepagado', variant: 'info' },
  refunded: { label: 'Reembolsado', variant: 'destructive' },
};

export function OrdersManagementV2() {
  const { loadCustomers } = useCrmContext();
  const { tenant } = useAuth();
  const [data, setData] = useState({ orders: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [pageLimit, setPageLimit] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const restaurantEnabled = Boolean(
    tenant?.enabledModules?.restaurant ||
    tenant?.enabledModules?.tables ||
    tenant?.enabledModules?.kitchenDisplay
  );

  // State for Payment Dialog
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);

  // State for Details Dialog
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);

  const fetchOrders = async (page = 1, limit = 25, search = '') => {
    try {
      setLoading(true);
      const url = `/orders?page=${page}&limit=${limit}&search=${search}&_=${new Date().getTime()}`;
      const data = await fetchApi(url);

      setData({
        orders: data.data || [],
        pagination: data.pagination
      });
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Effect for initial load and search term changes
  useEffect(() => {
    setCurrentPage(1);
    const timeoutId = setTimeout(() => {
      fetchOrders(1, pageLimit, debouncedSearchTerm);
    }, debouncedSearchTerm ? 800 : 0);
    return () => clearTimeout(timeoutId);
  }, [debouncedSearchTerm, pageLimit]);

  // Effect to fetch tenant settings
  useEffect(() => {
    getTenantSettings().then(settings => {
      setTenantSettings(settings);
    }).catch(err => console.error("Failed to fetch tenant settings:", err));
  }, []);

  // Effect for page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchOrders(currentPage, pageLimit, debouncedSearchTerm);
    }
  }, [currentPage]);

  const handleRefresh = useCallback(() => {
    fetchOrders(currentPage, pageLimit, debouncedSearchTerm);
  }, [currentPage, pageLimit, debouncedSearchTerm]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageLimitChange = (newLimit) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
  };

  // Handlers for Payment Dialog
  const handleOpenPaymentDialog = useCallback((order) => {
    setSelectedOrderForPayment(order);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleClosePaymentDialog = useCallback(() => {
    setIsPaymentDialogOpen(false);
    setSelectedOrderForPayment(null);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    handleClosePaymentDialog();
    handleRefresh();
  }, [handleClosePaymentDialog, handleRefresh]);

  // Handlers for Details Dialog
  const handleOpenDetailsDialog = useCallback((order) => {
    setSelectedOrderForDetails(order);
    setIsDetailsDialogOpen(true);
  }, []);

  const handleCloseDetailsDialog = useCallback(() => {
    setIsDetailsDialogOpen(false);
    setSelectedOrderForDetails(null);
  }, []);

  const estimatePrepTime = useCallback((itemCount = 1) => {
    const normalizedCount = Math.max(itemCount, 1);
    return 5 + Math.max(normalizedCount - 1, 0) * 2;
  }, []);

  const sendToKitchen = useCallback(async (order) => {
    if (!restaurantEnabled) {
      toast.error('El módulo de restaurante no está habilitado para este tenant');
      return;
    }

    if (!order || order.status !== 'confirmed') {
      toast.error('Solo se pueden enviar a cocina órdenes confirmadas');
      return;
    }

    try {
      const itemCount =
        (Array.isArray(order.items) && order.items.length) ||
        order.itemsCount ||
        order.totalItems ||
        1;

      await fetchApi('/kitchen-display/create', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order._id,
          priority: 'normal',
          estimatedPrepTime: estimatePrepTime(itemCount),
          notes: order.notes || undefined,
        }),
      });

      toast.success(`Orden #${order.orderNumber} enviada a cocina`);
      handleRefresh();
    } catch (error) {
      console.error('Error sending to kitchen:', error);
      toast.error('Error al enviar orden a cocina');
    }
  }, [restaurantEnabled, estimatePrepTime, handleRefresh]);

  const columns = useMemo(() => {
    const baseColumns = [
    { accessorKey: "orderNumber", header: "Número de Orden" },
    { accessorKey: "customerName", header: "Cliente" },
    {
      accessorKey: "assignedTo",
      header: "Atendido Por",
      cell: ({ row }) => {
        const assigned = row.original.assignedTo;
        if (!assigned) {
          return <span className="text-muted-foreground">-</span>;
        }

        if (typeof assigned === 'string') {
          return <Badge variant="outline">{assigned}</Badge>;
        }

        const fullName = [assigned.firstName, assigned.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

        const display = fullName || assigned.email || '—';
        return <Badge variant="outline">{display}</Badge>;
      }
    },
    {
      accessorKey: "totalAmount",
      header: "Monto Total",
      cell: ({ row }) => {
        const amount = parseFloat(row.original.totalAmount);
        const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
        return <div className="text-right font-medium">{formatted}</div>;
      }
    },
    {
        accessorKey: "balance",
        header: "Balance",
        cell: ({ row }) => {
            const balance = (row.original.totalAmount || 0) - (row.original.paidAmount || 0);
            const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balance);
            return <div className={`text-right font-medium ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatted}</div>;
        }
    },
    {
      accessorKey: "paymentStatus",
      header: "Estado de Pago",
       cell: ({ row }) => {
         const status = row.original.paymentStatus;
         const { label, variant } = paymentStatusMap[status] || { label: status, variant: 'secondary' };
         return <Badge variant={variant}>{label}</Badge>;
       }
    },
    {
      accessorKey: "status",
      header: "Estado de la Orden",
      cell: ({ row }) => (
        <OrderStatusSelector order={row.original} onStatusChange={handleRefresh} />
      )
    },
    {
      id: "view",
      header: () => <div className="text-center">Ver/Imprimir</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <Button variant="ghost" size="icon" onClick={() => handleOpenDetailsDialog(row.original)}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      id: "pay",
      header: () => <div className="text-center">Pagar</div>,
      cell: ({ row }) => {
        const order = row.original;
        const balance = (order.totalAmount || 0) - (order.paidAmount || 0);
        if (balance <= 0) return <div className="text-center">-</div>;
        
        return (
          <div className="text-center">
            <Button variant="ghost" size="icon" onClick={() => handleOpenPaymentDialog(order)}>
              <CreditCard className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

    if (restaurantEnabled) {
      baseColumns.push({
        id: "kitchen",
        header: () => <div className="text-center">Cocina</div>,
        cell: ({ row }) => {
          const order = row.original;

          return (
            <div className="text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => sendToKitchen(order)}
                disabled={order.status !== 'confirmed'}
              >
                <ChefHat className="mr-2 h-4 w-4" />
                Enviar a Cocina
              </Button>
            </div>
          );
        },
      });
    }

    return baseColumns;
  }, [handleOpenPaymentDialog, handleOpenDetailsDialog, restaurantEnabled, sendToKitchen]);

  const handleOrderCreated = () => {
    document.dispatchEvent(new CustomEvent('order-form-success'));
    fetchOrders(1, pageLimit, searchTerm);
    loadCustomers();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
          <p className="text-muted-foreground">
            Crea nuevas órdenes y administra el historial de pedidos.
          </p>
        </div>
      </div>

      <NewOrderFormV2 onOrderCreated={handleOrderCreated} />
      
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Historial de Órdenes</CardTitle>
            <CardDescription>
              Consulta, busca y administra todas las órdenes registradas.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por cliente, RIF o N°..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-[300px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="w-full sm:w-auto">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p>Cargando órdenes...</p>}
          {error && <p className="text-red-500">Error al cargar las órdenes: {error}</p>}
          {!loading && !error && (
            <OrdersDataTableV2
              columns={columns}
              data={data.orders}
              pagination={data.pagination}
              onPageChange={handlePageChange}
              pageLimit={pageLimit}
              onPageLimitChange={handlePageLimitChange}
            />
          )}
        </CardContent>
      </Card>

      <PaymentDialogV2
        isOpen={isPaymentDialogOpen}
        onClose={handleClosePaymentDialog}
        order={selectedOrderForPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <OrderDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={handleCloseDetailsDialog}
        order={selectedOrderForDetails}
        tenantSettings={tenantSettings}
        onUpdate={handleRefresh}
      />
    </div>
  );
}
