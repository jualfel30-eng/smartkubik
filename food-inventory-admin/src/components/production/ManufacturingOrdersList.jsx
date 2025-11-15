import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Factory, Plus, Eye, Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useManufacturingOrders } from '@/hooks/useManufacturingOrders';
import { ManufacturingOrderDialog } from './ManufacturingOrderDialog';
import { ManufacturingOrderWizard } from './ManufacturingOrderWizard';
import { ManufacturingOrderDetails } from './ManufacturingOrderDetails';

const statusConfig = {
  draft: { label: 'Borrador', color: 'bg-gray-500', icon: AlertCircle },
  confirmed: { label: 'Confirmada', color: 'bg-blue-500', icon: CheckCircle },
  in_progress: { label: 'En Proceso', color: 'bg-yellow-500', icon: Play },
  completed: { label: 'Completada', color: 'bg-green-500', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: 'bg-red-500', icon: XCircle },
};

export function ManufacturingOrdersList() {
  const {
    manufacturingOrders,
    loading,
    error,
    loadManufacturingOrders,
    createManufacturingOrder,
    updateManufacturingOrder,
    confirmManufacturingOrder,
    startManufacturingOrder,
    completeManufacturingOrder,
    cancelManufacturingOrder,
    deleteManufacturingOrder,
  } = useManufacturingOrders();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadManufacturingOrders();
  }, [loadManufacturingOrders]);

  const handleCreate = () => {
    setSelectedOrder(null);
    setWizardOpen(true);
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleView = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleSave = async (orderData) => {
    try {
      if (selectedOrder) {
        await updateManufacturingOrder(selectedOrder._id, orderData);
      } else {
        await createManufacturingOrder(orderData);
      }
      setDialogOpen(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error('Error saving manufacturing order:', err);
    }
  };

  const handleSaveWizard = async (orderData) => {
    try {
      await createManufacturingOrder(orderData);
      setWizardOpen(false);
      await loadManufacturingOrders();
    } catch (err) {
      console.error('Error creating manufacturing order:', err);
      alert('Error al crear la orden de manufactura: ' + (err.message || 'Error desconocido'));
      throw err;
    }
  };

  const handleConfirm = async (orderId) => {
    try {
      await confirmManufacturingOrder(orderId);
    } catch (err) {
      console.error('Error confirming order:', err);
      alert(err.message);
    }
  };

  const handleStart = async (orderId) => {
    try {
      await startManufacturingOrder(orderId);
    } catch (err) {
      console.error('Error starting order:', err);
    }
  };

  const handleComplete = async (orderId) => {
    try {
      await completeManufacturingOrder(orderId);
    } catch (err) {
      console.error('Error completing order:', err);
      alert(err.message);
    }
  };

  const handleCancel = async (orderId) => {
    try {
      await cancelManufacturingOrder(orderId);
    } catch (err) {
      console.error('Error cancelling order:', err);
    }
  };

  const handleDelete = async (orderId) => {
    if (window.confirm('¿Estás seguro de eliminar esta orden de manufactura?')) {
      try {
        await deleteManufacturingOrder(orderId);
      } catch (err) {
        console.error('Error deleting order:', err);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="h-6 w-6" />
            <CardTitle>Órdenes de Manufactura</CardTitle>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Error: {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Planificada</TableHead>
                  <TableHead>Costo Material</TableHead>
                  <TableHead>Costo Mano de Obra</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manufacturingOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No hay órdenes de manufactura
                    </TableCell>
                  </TableRow>
                ) : (
                  manufacturingOrders.map((order) => {
                    const statusInfo = statusConfig[order.status] || statusConfig.draft;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.product?.name || order.productId}</TableCell>
                        <TableCell>{order.quantityToProduce} {order.product?.baseUnit || 'unidades'}</TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(order.plannedStartDate)}</TableCell>
                        <TableCell>{formatCurrency(order.actualMaterialCost)}</TableCell>
                        <TableCell>{formatCurrency(order.actualLaborCost)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleView(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>

                            {order.status === 'draft' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleEdit(order)}>
                                  Editar
                                </Button>
                                <Button size="sm" onClick={() => handleConfirm(order._id)}>
                                  Confirmar
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDelete(order._id)}>
                                  Eliminar
                                </Button>
                              </>
                            )}

                            {order.status === 'confirmed' && (
                              <>
                                <Button size="sm" onClick={() => handleStart(order._id)}>
                                  <Play className="h-4 w-4 mr-1" />
                                  Iniciar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleCancel(order._id)}>
                                  Cancelar
                                </Button>
                              </>
                            )}

                            {order.status === 'in_progress' && (
                              <>
                                <Button size="sm" onClick={() => handleComplete(order._id)}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Completar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleCancel(order._id)}>
                                  Cancelar
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ManufacturingOrderWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSave={handleSaveWizard}
      />

      <ManufacturingOrderDialog
        open={dialogOpen}
        order={selectedOrder}
        onClose={() => {
          setDialogOpen(false);
          setSelectedOrder(null);
        }}
        onSave={handleSave}
      />

      <ManufacturingOrderDetails
        open={detailsOpen}
        order={selectedOrder}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedOrder(null);
        }}
      />
    </>
  );
}
