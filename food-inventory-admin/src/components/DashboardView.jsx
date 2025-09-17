import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  PlusCircle,
  Truck
} from "lucide-react";
import { fetchApi } from '../lib/api';
import { Skeleton } from '@/components/ui/skeleton.jsx';

const statusMap = {
  draft: { label: 'Borrador', colorClassName: 'bg-gray-200 text-gray-800' },
  pending: { label: 'Pendiente', colorClassName: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmado', colorClassName: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Procesando', colorClassName: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'Enviado', colorClassName: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Entregado', colorClassName: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', colorClassName: 'bg-red-100 text-red-800' },
  refunded: { label: 'Reembolsado', colorClassName: 'bg-pink-100 text-pink-800' },
};

const getStatusBadge = (status) => {
    const statusInfo = statusMap[status] || { label: status, colorClassName: 'bg-gray-200' };
    return <Badge className={statusInfo.colorClassName}>{statusInfo.label}</Badge>;
};

function DashboardView() {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await fetchApi('/dashboard/summary');
        if (response.success) {
          setSummaryData(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch dashboard summary');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div className="text-red-500">Error al cargar el dashboard: {error}</div>;
  }

  if (!summaryData) {
    return <div>No hay datos para mostrar.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <div className="flex space-x-4">
          <Button onClick={() => navigate('/purchases')}>
            <Truck className="mr-2 h-5 w-5" />
            Crear Orden de Compra
          </Button>
          <Button onClick={() => navigate('/orders')}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Crear Pedido Nuevo
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas de Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(summaryData.salesToday || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes de Hoy</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{summaryData.ordersToday || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.activeCustomers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos en Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.productsInStock || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Órdenes Recientes</CardTitle>
            <CardDescription>
              Un vistazo a las últimas órdenes registradas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Orden</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.recentOrders?.length > 0 ? (
                  summaryData.recentOrders.map((order) => (
                    <TableRow key={order.orderNumber}>
                      <TableCell className="font-medium">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>${(order.totalAmount || 0).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan="4" className="text-center">No hay órdenes recientes.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
              Alertas de Inventario
            </CardTitle>
            <CardDescription>Productos que requieren atención.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summaryData.inventoryAlerts?.length > 0 ? (
                summaryData.inventoryAlerts.map((alert, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{alert.productName}</span>
                    {
                      alert.alerts.lowStock ? (
                          <Badge variant="destructive">Stock Bajo</Badge>
                      ) : alert.alerts.nearExpiration ? (
                          <Badge variant="secondary">Próximo a Vencer</Badge>
                      ) : null
                    }
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay alertas de inventario.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/5" /></CardHeader><CardContent><Skeleton className="h-8 w-3/5" /></CardContent></Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
            <CardDescription><Skeleton className="h-4 w-2/4" /></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-3/4" /></CardTitle>
            <CardDescription><Skeleton className="h-4 w-2/4" /></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardView;