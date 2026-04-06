import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Label } from '@/components/ui/label.jsx';
import { toast } from 'sonner';
import {
  fetchApi,
  getTransferOrder,
  requestTransferOrder,
  approveTransferOrder,
  approveTransferRequest,
  prepareTransferOrder,
  shipTransferOrder,
  receiveTransferOrder,
  cancelTransferOrder,
} from '@/lib/api';
import {
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle,
  Truck,
  PackageCheck,
  XCircle,
  Clock,
  ArrowRight,
  MapPin,
  ClipboardList,
  Warehouse,
  Edit,
  RotateCcw,
} from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Borrador', variant: 'outline', icon: Clock },
  // PUSH flow
  push_requested: { label: 'Solicitado', variant: 'secondary', icon: Send },
  push_approved: { label: 'Aprobado', variant: 'default', icon: CheckCircle },
  // PULL flow
  pull_requested: { label: 'Solicitado', variant: 'secondary', icon: Send },
  pull_approved: { label: 'Aprobado', variant: 'default', icon: CheckCircle },
  pull_rejected: { label: 'Rechazado', variant: 'destructive', icon: XCircle },
  // Shared statuses
  in_preparation: { label: 'En Preparacion', variant: 'outline', icon: Clock },
  in_transit: { label: 'En Transito', variant: 'default', icon: Truck },
  delivered: { label: 'Entregado', variant: 'default', icon: PackageCheck },
  received: { label: 'Recibido', variant: 'secondary', icon: PackageCheck },
  partially_received: { label: 'Parcialmente Recibido', variant: 'outline', icon: PackageCheck },
  cancelled: { label: 'Cancelado', variant: 'destructive', icon: XCircle },
};

// Normalize push/pull-specific statuses for timeline display
const normalizeStatus = (status) => {
  if (status?.includes('requested')) return 'requested';
  if (status?.includes('approved')) return 'approved';
  return status;
};

const TIMELINE_STEPS_DISPLAY = [
  { key: 'draft', label: 'Borrador' },
  { key: 'requested', label: 'Solicitado' },
  { key: 'approved', label: 'Aprobado' },
  { key: 'in_preparation', label: 'Preparacion' },
  { key: 'in_transit', label: 'En Transito' },
  { key: 'received', label: 'Recibido' },
];

export default function TransferOrderDetail({ orderId, onBack, onUpdated }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState([]);
  const [cancelReason, setCancelReason] = useState('');
  const [editForm, setEditForm] = useState({ items: [], notes: '' });

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await getTransferOrder(orderId);
      setOrder(data);
    } catch (err) {
      console.error('Error loading transfer order', err);
      toast.error('No se pudo cargar la transferencia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const handleAction = async (actionFn, successMsg, ...args) => {
    setActionLoading(true);
    try {
      await actionFn(orderId, ...args);
      toast.success(successMsg);
      await loadOrder();
      onUpdated?.();
    } catch (err) {
      console.error('Action error:', err);
      toast.error(err?.message || 'Error ejecutando accion');
    } finally {
      setActionLoading(false);
    }
  };

  const openReceiveDialog = () => {
    if (!order?.items) return;
    setReceiveItems(
      order.items.map((item) => ({
        productId: item.productId?._id || item.productId,
        productName: item.productName || 'Producto',
        quantity: item.requestedQuantity,
        receivedQuantity: item.requestedQuantity - (item.receivedQuantity || 0),
        maxQuantity: item.requestedQuantity - (item.receivedQuantity || 0),
        selectedUnit: item.selectedUnit || null,
      })),
    );
    setReceiveDialogOpen(true);
  };

  const handleReceive = async () => {
    const items = receiveItems
      .filter((i) => i.receivedQuantity > 0)
      .map((i) => ({
        productId: i.productId,
        receivedQuantity: i.receivedQuantity,
      }));

    if (items.length === 0) {
      toast.error('Ingresa al menos una cantidad recibida');
      return;
    }

    setActionLoading(true);
    try {
      await receiveTransferOrder(orderId, { items });
      toast.success('Recepcion registrada exitosamente');
      setReceiveDialogOpen(false);
      await loadOrder();
      onUpdated?.();
    } catch (err) {
      toast.error(err?.message || 'Error registrando recepcion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await cancelTransferOrder(orderId, { reason: cancelReason });
      toast.success('Transferencia cancelada');
      setCancelDialogOpen(false);
      setCancelReason('');
      await loadOrder();
      onUpdated?.();
    } catch (err) {
      toast.error(err?.message || 'Error cancelando transferencia');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = () => {
    if (!order?.items) return;
    setEditForm({
      items: order.items.map((item) => ({
        productId: item.productId?._id || item.productId,
        productName: item.productName,
        productSku: item.productSku,
        requestedQuantity: item.requestedQuantity,
      })),
      notes: order.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (editForm.items.length === 0) {
      toast.error('Debe tener al menos un producto');
      return;
    }
    setActionLoading(true);
    try {
      await fetchApi(`/transfer-orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          items: editForm.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            productSku: i.productSku,
            requestedQuantity: i.requestedQuantity,
          })),
          notes: editForm.notes,
        }),
      });
      toast.success('Transferencia actualizada');
      setEditDialogOpen(false);
      await loadOrder();
      onUpdated?.();
    } catch (err) {
      toast.error(err?.message || 'Error actualizando transferencia');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevertToDraft = async () => {
    setActionLoading(true);
    try {
      await fetchApi(`/transfer-orders/${orderId}/revert-to-draft`, { method: 'POST' });
      toast.success('Transferencia regresada a borrador');
      setRevertDialogOpen(false);
      await loadOrder();
      onUpdated?.();
    } catch (err) {
      toast.error(err?.message || 'Error regresando a borrador');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Cargando detalle...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Transferencia no encontrada.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const normalizedStatus = normalizeStatus(order.status);
  const currentStepIdx = TIMELINE_STEPS_DISPLAY.findIndex((s) => s.key === normalizedStatus);
  const canEdit = order.status === 'draft';
  const canRevert = ['push_requested', 'pull_requested', 'push_approved', 'pull_approved', 'requested', 'approved'].includes(order.status);
  const canRequest = order.status === 'draft';
  const canApprove = ['push_requested', 'pull_requested', 'requested'].includes(order.status);
  const canPrepare = ['push_approved', 'pull_approved', 'approved'].includes(order.status);
  const canShip = order.status === 'in_preparation';
  const canReceive = ['in_transit', 'delivered'].includes(order.status);
  const canCancel = ['draft', 'push_requested', 'pull_requested', 'push_approved', 'pull_approved', 'in_preparation', 'requested', 'approved'].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Transferencia {order.orderNumber}
              <Badge variant={statusConfig.variant} className="ml-2">
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Creada el {new Date(order.createdAt).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {TIMELINE_STEPS_DISPLAY.map((step, idx) => {
              const isActive = idx <= currentStepIdx && order.status !== 'cancelled';
              const isCurrent = step.key === normalizedStatus;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center ${isCurrent ? 'scale-110' : ''}`}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className={`text-[10px] mt-1 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < TIMELINE_STEPS_DISPLAY.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${idx < currentStepIdx && order.status !== 'cancelled' ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
          {order.status === 'cancelled' && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <XCircle className="h-4 w-4 inline mr-2" />
              Cancelada{order.cancellationReason ? `: ${order.cancellationReason}` : ''}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source / Destination */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-600 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Origen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{order.sourceLocationId?.name || 'N/A'}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Warehouse className="h-3 w-3" />
              {order.sourceWarehouseId?.name || 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-600 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Destino
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{order.destinationLocationId?.name || 'N/A'}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Warehouse className="h-3 w-3" />
              {order.destinationWarehouseId?.name || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Productos ({order.items?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-center">Unidad</TableHead>
                <TableHead className="text-right">Solicitado</TableHead>
                <TableHead className="text-right">Aprobado</TableHead>
                <TableHead className="text-right">Recibido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(order.items || []).map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <span className="font-medium">{item.productName || 'Producto'}</span>
                    {item.productSku && (
                      <span className="text-xs text-muted-foreground ml-2">({item.productSku})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.selectedUnit ? (
                      <Badge variant="outline" className="text-[10px]">{item.selectedUnit}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{item.unitOfMeasure || '—'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.requestedQuantity}{item.selectedUnit ? ` ${item.selectedUnit}` : ''}</TableCell>
                  <TableCell className="text-right">{item.approvedQuantity ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    {item.receivedQuantity != null ? (
                      <span className={item.receivedQuantity < item.quantity ? 'text-orange-500' : 'text-green-600'}>
                        {item.receivedQuantity}
                      </span>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        {canCancel && (
          <Button variant="destructive" size="sm" onClick={() => setCancelDialogOpen(true)} disabled={actionLoading}>
            <XCircle className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        )}
        {canRevert && (
          <Button variant="outline" size="sm" onClick={() => setRevertDialogOpen(true)} disabled={actionLoading}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Regresar a borrador
          </Button>
        )}
        {canEdit && (
          <Button variant="outline" size="sm" onClick={openEditDialog} disabled={actionLoading}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )}
        {canRequest && (
          <Button variant="outline" size="sm" onClick={() => handleAction(requestTransferOrder, 'Transferencia solicitada')} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Solicitar
          </Button>
        )}
        {canApprove && (
          <Button variant="outline" size="sm" onClick={() => {
            const approveFn = order.type === 'pull' ? approveTransferRequest : approveTransferOrder;
            handleAction(approveFn, 'Transferencia aprobada');
          }} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
            Aprobar
          </Button>
        )}
        {canPrepare && (
          <Button variant="outline" size="sm" onClick={() => handleAction(prepareTransferOrder, 'Transferencia en preparacion')} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-1" />}
            Preparar
          </Button>
        )}
        {canShip && (
          <Button size="sm" onClick={() => handleAction(shipTransferOrder, 'Inventario despachado')} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />}
            Despachar
          </Button>
        )}
        {canReceive && (
          <Button size="sm" onClick={openReceiveDialog} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PackageCheck className="h-4 w-4 mr-1" />}
            Recibir
          </Button>
        )}
      </div>

      {/* Receive dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recibir productos</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Ingresa las cantidades recibidas para cada producto.</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="w-[100px] text-right">Pendiente</TableHead>
                <TableHead className="w-[100px]">Recibido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receiveItems.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className="text-sm">
                    {item.productName}
                    {item.selectedUnit && (
                      <span className="text-xs text-muted-foreground ml-1">({item.selectedUnit})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.maxQuantity}{item.selectedUnit ? ` ${item.selectedUnit}` : ''}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step={item.selectedUnit ? '0.01' : '1'}
                      max={item.maxQuantity}
                      value={item.receivedQuantity}
                      onChange={(e) => {
                        const val = Math.min(item.maxQuantity, Math.max(0, parseFloat(e.target.value) || 0));
                        setReceiveItems((prev) =>
                          prev.map((i) => (i.productId === item.productId ? { ...i, receivedQuantity: val } : i)),
                        );
                      }}
                      className="w-20 h-8 text-sm"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleReceive} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar recepcion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar transferencia</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Motivo de cancelacion</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ingresa el motivo..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Volver</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancelar transferencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar transferencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-[120px]">Cantidad</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editForm.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <span className="text-sm">{item.productName}</span>
                      {item.productSku && (
                        <span className="text-xs text-muted-foreground ml-2">({item.productSku})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.requestedQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditForm((f) => ({
                            ...f,
                            items: f.items.map((i, index) =>
                              index === idx ? { ...i, requestedQuantity: Math.max(0, val) } : i
                            ),
                          }));
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || parseInt(e.target.value) < 1) {
                            setEditForm((f) => ({
                              ...f,
                              items: f.items.map((i, index) =>
                                index === idx ? { ...i, requestedQuantity: 1 } : i
                              ),
                            }));
                          }
                        }}
                        className="w-20 h-8 text-sm no-spinners"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditForm((f) => ({
                            ...f,
                            items: f.items.filter((_, index) => index !== idx),
                          }));
                        }}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Observaciones..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert to draft confirmation dialog */}
      <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regresar a borrador</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de regresar esta transferencia a estado borrador? Podrás editarla y solicitarla nuevamente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRevertToDraft} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Regresar a borrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
