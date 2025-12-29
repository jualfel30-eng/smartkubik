import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { fetchApi, getTenantSettings } from '@/lib/api';
import { OrdersDataTableV2 } from './OrdersDataTableV2';
import { Badge } from "@/components/ui/badge";
import { NewOrderFormV3 } from './NewOrderFormV3';
import { PaymentDialogV2 } from './PaymentDialogV2';
import { OrderStatusSelector } from './OrderStatusSelector';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, Download, ChefHat, Settings } from "lucide-react";
import BillingDrawer from '@/components/billing/BillingDrawer';
import { OrderProcessingDrawer } from '../OrderProcessingDrawer';
import { useDebounce } from '@/hooks/use-debounce.js';
import { useCrmContext } from '@/context/CrmContext.jsx';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth.jsx';
import { useVerticalConfig } from '@/hooks/useVerticalConfig.js';
import { useExchangeRate } from '@/hooks/useExchangeRate';

const paymentStatusMap = {
  pending: { label: 'Pendiente', variant: 'outline' },
  partial: { label: 'Parcial', variant: 'warning' },
  paid: { label: 'Pagado', variant: 'success' },
  overpaid: { label: 'Sobrepagado', variant: 'info' },
  refunded: { label: 'Reembolsado', variant: 'destructive' },
};

export function OrdersManagementV2() {
  const { loadCustomers } = useCrmContext();
  const { tenant, token } = useAuth();
  const verticalConfig = useVerticalConfig();
  const [data, setData] = useState({ orders: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const [attributeKey, setAttributeKey] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const debouncedAttributeValue = useDebounce(attributeValue, 500);
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
  const { rate: exchangeRate, loading: loadingRate, error: rateError } = useExchangeRate();



  // State for Details Dialog
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);

  // State for Billing Drawer
  const [isBillingDrawerOpen, setIsBillingDrawerOpen] = useState(false);
  const [selectedOrderForBilling, setSelectedOrderForBilling] = useState(null);

  // State for Order Processing Drawer
  const [isProcessingDrawerOpen, setIsProcessingDrawerOpen] = useState(false);
  const [selectedOrderForProcessing, setSelectedOrderForProcessing] = useState(null);

  const productAttributes = useMemo(
    () => (verticalConfig?.attributeSchema || []).filter((attr) => attr.scope === 'product'),
    [verticalConfig],
  );

  const variantAttributes = useMemo(
    () => (verticalConfig?.attributeSchema || []).filter((attr) => attr.scope === 'variant'),
    [verticalConfig],
  );

  const attributeOptions = useMemo(
    () =>
      [...productAttributes, ...variantAttributes].map((descriptor) => ({
        key: descriptor.key,
        label: descriptor.label || descriptor.key,
      })),
    [productAttributes, variantAttributes],
  );

  const fetchOrders = useCallback(async (page = 1, limit = 25, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) {
        params.set('search', search);
      }
      const attributeFilterValue = (debouncedAttributeValue || attributeValue || '').trim();
      if (attributeKey) {
        params.set('itemAttributeKey', attributeKey);
      }
      if (attributeKey && attributeFilterValue) {
        params.set('itemAttributeValue', attributeFilterValue);
      }
      params.set('_', Date.now().toString());

      const url = `/orders?${params.toString()}`;
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
  }, [attributeKey, attributeValue, debouncedAttributeValue]);

  // Effect for initial load and search term changes
  useEffect(() => {
    setCurrentPage(1);
    const timeoutId = setTimeout(() => {
      fetchOrders(1, pageLimit, debouncedSearchTerm);
    }, debouncedSearchTerm ? 800 : 0);
    return () => clearTimeout(timeoutId);
  }, [debouncedSearchTerm, pageLimit, fetchOrders]);

  // Effect to fetch tenant settings
  useEffect(() => {
    getTenantSettings().then(response => {
      if (response?.data) {
        setTenantSettings(response.data);
      }
    }).catch(err => console.error("Failed to fetch tenant settings:", err));
  }, []);

  // Effect for page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchOrders(currentPage, pageLimit, debouncedSearchTerm);
    }
  }, [currentPage, pageLimit, debouncedSearchTerm, fetchOrders]);

  const handleRefresh = useCallback(() => {
    fetchOrders(currentPage, pageLimit, debouncedSearchTerm);
  }, [fetchOrders, currentPage, pageLimit, debouncedSearchTerm]);

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

  const handleExportOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', String(pageLimit));
      if (debouncedSearchTerm) {
        params.set('search', debouncedSearchTerm);
      }
      if (attributeKey) {
        params.set('itemAttributeKey', attributeKey);
      }
      const attributeFilterValue = (attributeValue || '').trim();
      if (attributeKey && attributeFilterValue) {
        params.set('itemAttributeValue', attributeFilterValue);
      }

      const isDevelopment =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      const baseUrl = isDevelopment ? 'http://localhost:3000' : 'https://api.smartkubik.com';

      const response = await fetch(`${baseUrl}/api/v1/orders/export?${params.toString()}`, {
        headers: {
          Accept: 'text/csv',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('No se pudo generar la exportación.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ordenes_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Error al exportar las órdenes', {
        description: err.message,
      });
    }
  }, [attributeKey, attributeValue, debouncedSearchTerm, pageLimit, token]);

  const handleClearAttributeFilter = useCallback(() => {
    setAttributeKey('');
    setAttributeValue('');
  }, []);

  // Handlers for Details Dialog
  const handleOpenDetailsDialog = useCallback((order) => {
    setSelectedOrderForDetails(order);
    setIsDetailsDialogOpen(true);
  }, []);

  const handleCloseDetailsDialog = useCallback(() => {
    setIsDetailsDialogOpen(false);
    setSelectedOrderForDetails(null);
  }, []);

  const handleOpenBillingDrawer = useCallback((order) => {
    setSelectedOrderForBilling(order);
    setIsBillingDrawerOpen(true);
  }, []);

  const handleCloseBillingDrawer = useCallback(() => {
    setIsBillingDrawerOpen(false);
    setSelectedOrderForBilling(null);
  }, []);

  // Handlers for Order Processing Drawer
  const handleOpenProcessingDrawer = useCallback((order) => {
    setSelectedOrderForProcessing(order);
    setIsProcessingDrawerOpen(true);
  }, []);

  const handleCloseProcessingDrawer = useCallback(() => {
    setIsProcessingDrawerOpen(false);
    setSelectedOrderForProcessing(null);
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
        id: "process",
        header: () => <div className="text-center">Procesar</div>,
        cell: ({ row }) => {
          const order = row.original;
          const isPaid = order.paymentStatus === 'paid';
          const hasInvoice = order.billingDocumentId && order.billingDocumentType !== 'none';

          // Determine button variant based on order state
          let variant = 'outline';
          let label = 'Procesar';

          if (!isPaid) {
            variant = 'default';
            label = 'Procesar';
          } else if (isPaid && !hasInvoice) {
            variant = 'default';
            label = 'Facturar';
          } else if (hasInvoice) {
            variant = 'outline';
            label = 'Ver Proceso';
          }

          return (
            <div className="text-center">
              <Button
                variant={variant}
                size="sm"
                onClick={() => handleOpenProcessingDrawer(order)}
                title="Procesar orden completa"
              >
                <Settings className="h-4 w-4 mr-2" />
                {label}
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
  }, [handleOpenProcessingDrawer, restaurantEnabled, sendToKitchen, handleRefresh]);

  const handleOrderCreated = (newOrder) => {
    document.dispatchEvent(new CustomEvent('order-form-success'));
    fetchOrders(1, pageLimit, searchTerm);
    loadCustomers();

    if (newOrder) {
      toast.success('Orden creada. Iniciando proceso de cobro...');
      // Automatically open the processing wizard for the new order
      handleOpenProcessingDrawer(newOrder);
    }
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

      <NewOrderFormV3 onOrderCreated={handleOrderCreated} />

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
            <Button variant="outline" size="sm" onClick={handleExportOrders} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="w-full sm:w-auto">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {attributeOptions.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
              <div className="space-y-2">
                <Label htmlFor="order-attribute-key">Atributo</Label>
                <Select
                  id="order-attribute-key"
                  value={attributeKey}
                  onValueChange={setAttributeKey}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona atributo" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributeOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="order-attribute-value">Valor contiene</Label>
                <Input
                  id="order-attribute-value"
                  value={attributeValue}
                  onChange={(event) => setAttributeValue(event.target.value)}
                  placeholder="Ej: Azul, 38, serial..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAttributeFilter}
                  disabled={!attributeKey && !attributeValue}
                  className="w-full sm:w-auto"
                >
                  Limpiar filtro
                </Button>
              </div>
            </div>
          )}
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
        exchangeRate={exchangeRate}
      />

      <OrderDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={handleCloseDetailsDialog}
        order={selectedOrderForDetails}
        tenantSettings={tenantSettings}
        onUpdate={handleRefresh}
      />

      <BillingDrawer
        isOpen={isBillingDrawerOpen}
        onClose={handleCloseBillingDrawer}
        order={selectedOrderForBilling}
        onOrderUpdated={handleRefresh}
      />

      <OrderProcessingDrawer
        isOpen={isProcessingDrawerOpen}
        onClose={handleCloseProcessingDrawer}
        order={selectedOrderForProcessing}
        onUpdate={async () => {
          handleRefresh();
          // Re-fetch the specific order to update the prop
          if (selectedOrderForProcessing?._id) {
            try {
              const updatedOrder = await fetchApi(`/orders/${selectedOrderForProcessing._id}`);
              setSelectedOrderForProcessing(updatedOrder);
            } catch (error) {
              console.error('Error refreshing selected order:', error);
            }
          }
        }}
      />
    </div>
  );
}
