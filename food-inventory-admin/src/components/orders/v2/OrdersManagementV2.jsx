import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchApi } from '@/lib/api';
import { OrdersDataTableV2 } from './OrdersDataTableV2';
import { Badge } from "@/components/ui/badge";
import { NewOrderFormV2 } from './NewOrderFormV2';
import { PaymentDialogV2 } from './PaymentDialogV2';
import { OrderStatusSelector } from './OrderStatusSelector';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { Button } from "@/components/ui/button";
import { Eye, CreditCard, RefreshCw } from "lucide-react";

export function OrdersManagementV2() {
  const [data, setData] = useState({ orders: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para el diálogo de pago
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);

  // Estado para el diálogo de detalles
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);

  const fetchOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/orders?page=${page}&limit=10&_=${new Date().getTime()}`);
      
      setData({
        orders: response.data || [],
        pagination: response.pagination
      });
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleRefresh = useCallback(() => {
    fetchOrders(data.pagination?.page || 1);
  }, [data.pagination, fetchOrders]);

  // Handlers para el diálogo de pago
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
    fetchOrders(data.pagination?.page || 1);
  }, [data.pagination, fetchOrders, handleClosePaymentDialog]);

  // Handlers para el diálogo de detalles
  const handleOpenDetailsDialog = useCallback((order) => {
    setSelectedOrderForDetails(order);
    setIsDetailsDialogOpen(true);
  }, []);

  const handleCloseDetailsDialog = useCallback(() => {
    setIsDetailsDialogOpen(false);
    setSelectedOrderForDetails(null);
  }, []);

  const columns = useMemo(() => [
    { accessorKey: "orderNumber", header: "Número de Orden" },
    { accessorKey: "customerName", header: "Cliente" },
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
         let variant = "secondary";
         if (status === 'paid') variant = "success";
         if (status === 'pending') variant = "outline";
         if (status === 'partial') variant = "warning";
         return <Badge variant={variant}>{status}</Badge>;
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
      header: () => <div className="text-center">Ver</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <Button variant="ghost" size="icon" onClick={() => handleOpenDetailsDialog(row.original)}>
            <Eye className="h-4 w-4" />
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
  ], [handleOpenPaymentDialog, handleRefresh, handleOpenDetailsDialog]);

  const handlePageChange = (newPage) => {
    fetchOrders(newPage);
  };

  const handleOrderCreated = () => {
    fetchOrders(1);
  };

  return (
    <>
      <div className="space-y-8">
        <NewOrderFormV2 onOrderCreated={handleOrderCreated} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Historial de Órdenes (V2)</CardTitle>
              <CardDescription>
                Versión refactorizada para consulta de órdenes con paginación.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
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
              />
            )}
          </CardContent>
        </Card>
      </div>

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
      />
    </>
  );
}