import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { toast } from 'sonner';
import { Eye, Truck, RefreshCw } from 'lucide-react';

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);

  const loadPurchases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi('/purchases');
      setPurchases(data.data || []);
    } catch (err) {
      setError(err.message);
      setPurchases([]);
      toast.error('Error de Conexión', { description: 'No se pudo conectar con el servidor para cargar el historial.' });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const handleStatusChange = async (poId, newStatus) => {
    if (newStatus !== 'received') return; // For now, only handle receiving

    try {
      await fetchApi(`/purchases/${poId}/receive`, { method: 'PATCH' });
      toast.success('Orden Recibida', { description: 'El inventario ha sido actualizado correctamente.' });
      loadPurchases(); // Recargar la lista
    } catch (err) {
      toast.error('Error al Recibir la Orden', { description: err.message });
    }
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
            <Button onClick={loadPurchases} disabled={loading} variant="outline" size="sm">
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
                          onValueChange={(newStatus) => handleStatusChange(po._id, newStatus)} 
                          value={po.status}
                          disabled={po.status !== 'pending'}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Cambiar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="received"><div className="flex items-center"><Truck className="mr-2 h-4 w-4"/>Recibido</div></SelectItem>
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
    </>
  );
}
