import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { toast } from 'sonner';
import { getTransferOrders } from '@/lib/api';
import { Plus, Loader2, ArrowRightLeft, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import CreateTransferOrderDialog from '@/components/CreateTransferOrderDialog.jsx';
import TransferOrderDetail from '@/components/TransferOrderDetail.jsx';

const STATUS_CONFIG = {
  draft: { label: 'Borrador', variant: 'outline' },
  push_requested: { label: 'Solicitado', variant: 'secondary' },
  pull_requested: { label: 'Solicitado', variant: 'secondary' },
  push_approved: { label: 'Aprobado', variant: 'default' },
  pull_approved: { label: 'Aprobado', variant: 'default' },
  pull_rejected: { label: 'Rechazado', variant: 'destructive' },
  in_preparation: { label: 'En Preparacion', variant: 'outline' },
  in_transit: { label: 'En Transito', variant: 'default' },
  delivered: { label: 'Entregado', variant: 'default' },
  received: { label: 'Recibido', variant: 'secondary' },
  partially_received: { label: 'Parcial', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

export default function TransferOrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await getTransferOrders(params);
      const data = response?.data || response || [];
      setOrders(Array.isArray(data) ? data : []);
      setTotalPages(response?.totalPages || 1);
    } catch (err) {
      console.error('Error loading transfer orders', err);
      toast.error('No se pudieron cargar las transferencias');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleCreated = () => {
    setCreateOpen(false);
    loadOrders();
  };

  const handleOrderUpdated = () => {
    loadOrders();
  };

  if (selectedOrderId) {
    return (
      <TransferOrderDetail
        orderId={selectedOrderId}
        onBack={() => setSelectedOrderId(null)}
        onUpdated={handleOrderUpdated}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transferencias entre Sedes
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona el movimiento de inventario entre ubicaciones.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Filtrar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="requested">Solicitado</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="in_transit">En Transito</SelectItem>
                <SelectItem value="received">Recibido</SelectItem>
                <SelectItem value="partially_received">Parcial</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva transferencia
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Cargando transferencias...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay transferencias {statusFilter !== 'all' ? 'con este filtro' : 'registradas'}.</p>
              <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera transferencia
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const id = order._id || order.id;
                    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
                    return (
                      <TableRow key={id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOrderId(id)}>
                        <TableCell className="font-mono font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span>{order.sourceLocationId?.name || 'N/A'}</span>
                            {order.sourceWarehouseId?.name && (
                              <span className="text-xs text-muted-foreground block">{order.sourceWarehouseId.name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span>{order.destinationLocationId?.name || 'N/A'}</span>
                            {order.destinationWarehouseId?.name && (
                              <span className="text-xs text-muted-foreground block">{order.destinationWarehouseId.name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{order.items?.length || 0}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es') : ''}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedOrderId(id); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">
                    Pagina {page} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateTransferOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
