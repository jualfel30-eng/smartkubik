import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { toast } from 'sonner';
import { Eye, Truck, RefreshCw } from 'lucide-react';
import RatingModal from './RatingModal.jsx';

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [poForRating, setPoForRating] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadPurchases = useCallback(async (page = 1, limit = pageLimit) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const data = await fetchApi(`/purchases?${params.toString()}`);
      setPurchases(data.data || []);
      setTotalPurchases(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 0);
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
      setPurchases([]);
      setTotalPurchases(0);
      setTotalPages(0);
      toast.error('Error de Conexión', { description: 'No se pudo conectar con el servidor para cargar el historial.' });
    }
    setLoading(false);
  }, [pageLimit]);

  useEffect(() => {
    if (currentPage > 1) {
      loadPurchases(currentPage, pageLimit);
    }
  }, [currentPage, pageLimit, loadPurchases]);

  useEffect(() => {
    if (currentPage === 1) {
      loadPurchases(1, pageLimit);
    }
  }, [currentPage, pageLimit, loadPurchases]);

  const handleStatusChange = (purchaseOrder, newStatus) => {
    if (newStatus !== 'received') return;
    setPoForRating(purchaseOrder);
    setIsRatingModalOpen(true);
  };

  const handleRatingSubmit = async (ratingData) => {
    try {
      await fetchApi('/ratings', { method: 'POST', body: JSON.stringify(ratingData) });
      toast.success('Calificación Enviada', { description: 'La calificación ha sido guardada.' });

      await fetchApi(`/purchases/${ratingData.purchaseOrderId}/receive`, {
        method: 'PATCH',
        body: JSON.stringify({ receivedBy: ratingData.receivedBy })
      });
      toast.success('Orden Recibida', { description: 'El inventario ha sido actualizado correctamente.' });

      setIsRatingModalOpen(false);
      loadPurchases(currentPage, pageLimit);
    } catch (err) {
      toast.error('Error en el Proceso', { description: err.message });
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageLimitChange = (newLimit) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
  };

  const handleViewDetails = (purchaseOrder) => {
    setSelectedPurchaseOrder(purchaseOrder);
    setIsDetailDialogOpen(true);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'received': return 'success';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  if (loading) return <div>Cargando historial...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Órdenes de Compra</CardTitle>
            <Button onClick={() => loadPurchases(currentPage, pageLimit)} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
          <CardDescription>Gestiona y da seguimiento a tus órdenes de compra.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nro. Orden</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead className="w-[250px]">Estado / Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.length > 0 ? (
                purchases.map(po => (
                  <TableRow key={po._id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{po.supplierName}</TableCell>
                    <TableCell>{new Date(po.purchaseDate).toLocaleDateString()}</TableCell>
                    <TableCell>${po.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Select
                          onValueChange={(newStatus) => handleStatusChange(po, newStatus)}
                          value={po.status}
                          disabled={po.status !== 'pending'}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Cambiar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="received"><div className="flex items-center"><Truck className="mr-2 h-4 w-4" />Recibido</div></SelectItem>
                            <SelectItem value="cancelled">Cancelar</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => handleViewDetails(po)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="5" className="text-center">No se encontraron órdenes de compra.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {purchases.length} de {totalPurchases} órdenes de compra
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Filas por página:</p>
                  <Select
                    value={pageLimit.toString()}
                    onValueChange={(value) => handlePageLimitChange(parseInt(value))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={pageLimit.toString()} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 25, 50, 100].map((limit) => (
                        <SelectItem key={limit} value={limit.toString()}>
                          {limit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {totalPages > 1 && (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resumen de Orden de Compra #{selectedPurchaseOrder?.poNumber}</DialogTitle>
            <DialogDescription>
              Proveedor: {selectedPurchaseOrder?.supplierName}
            </DialogDescription>
          </DialogHeader>
          {selectedPurchaseOrder && (
            <div className="space-y-4 p-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="font-semibold">Fecha de Compra:</p><p>{new Date(selectedPurchaseOrder.purchaseDate).toLocaleDateString()}</p></div>
                <div><p className="font-semibold">Estado:</p><p><Badge variant={getStatusVariant(selectedPurchaseOrder.status)}>{selectedPurchaseOrder.status}</Badge></p></div>
              </div>
              <h4 className="font-semibold mt-4">Items de la Orden</h4>
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cantidad</TableHead><TableHead>Costo Unit.</TableHead><TableHead>Costo Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedPurchaseOrder.items.map(item => (
                    <TableRow key={item.productId}>
                      <TableCell>{item.productName} ({item.productSku})</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.costPrice.toFixed(2)}</TableCell>
                      <TableCell>${item.totalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right font-bold text-lg">
                Monto Total: ${selectedPurchaseOrder.totalAmount.toFixed(2)}
              </div>
              {selectedPurchaseOrder.notes && <div><p className="font-semibold">Notas:</p><p className="p-2 bg-muted rounded">{selectedPurchaseOrder.notes}</p></div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {poForRating && (
        <RatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          onSubmit={handleRatingSubmit}
          purchaseOrder={poForRating}
        />
      )}
    </>
  );
}
