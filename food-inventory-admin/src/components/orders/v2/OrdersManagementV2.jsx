import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchApi } from '@/lib/api';
import { OrdersDataTableV2 } from './OrdersDataTableV2';
import { Badge } from "@/components/ui/badge";
import { NewOrderFormV2 } from './NewOrderFormV2';
import { PaymentDialogV2 } from './PaymentDialogV2';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, RefreshCw } from "lucide-react";

export function OrdersManagementV2() {
  const [data, setData] = useState({ orders: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);

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
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const order = row.original;
        const balance = (order.totalAmount || 0) - (order.paidAmount || 0);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => alert(`Ver detalles de la orden ${order.orderNumber}`)}>Ver Detalles</DropdownMenuItem>
              {balance > 0 && (
                <DropdownMenuItem onClick={() => handleOpenPaymentDialog(order)}>Registrar Pago</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [handleOpenPaymentDialog]);

  const handlePageChange = (newPage) => {
    fetchOrders(newPage);
  };

  const handleOrderCreated = () => {
    fetchOrders(1);
  };

  const handleRefresh = () => {
    fetchOrders(data.pagination?.page || 1);
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
    </>
  );
}
