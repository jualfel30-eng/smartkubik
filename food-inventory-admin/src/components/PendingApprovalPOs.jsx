import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  getPendingApprovalPOs,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  autoGeneratePurchaseOrders,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  Check,
  X,
  AlertCircle,
  Calendar,
  Package,
  DollarSign,
  Sparkles,
  Clock,
  FileText,
} from 'lucide-react';

const PendingApprovalPOs = ({ onRefresh }) => {
  const [pendingPOs, setPendingPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState({ open: false, action: null });
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [generatingPOs, setGeneratingPOs] = useState(false);

  const fetchPendingPOs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getPendingApprovalPOs();
      setPendingPOs(response?.data || []);
    } catch (error) {
      toast.error('Error al cargar POs pendientes', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingPOs();
  }, [fetchPendingPOs]);

  const handleApprove = async () => {
    if (!selectedPO) return;

    try {
      await approvePurchaseOrder(selectedPO._id, approvalNotes);
      toast.success('Orden de compra aprobada');
      setApprovalDialog({ open: false, action: null });
      setApprovalNotes('');
      fetchPendingPOs();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Error al aprobar', { description: error.message });
    }
  };

  const handleReject = async () => {
    if (!selectedPO || !rejectionReason.trim()) {
      toast.error('Debes proporcionar una razón para rechazar');
      return;
    }

    try {
      await rejectPurchaseOrder(selectedPO._id, rejectionReason);
      toast.success('Orden de compra rechazada');
      setApprovalDialog({ open: false, action: null });
      setRejectionReason('');
      fetchPendingPOs();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Error al rechazar', { description: error.message });
    }
  };

  const handleAutoGenerate = async () => {
    setGeneratingPOs(true);
    try {
      const response = await autoGeneratePurchaseOrders();
      const count = response?.data?.length || 0;

      if (count > 0) {
        toast.success(`${count} orden(es) de compra generada(s) automáticamente`);
        fetchPendingPOs();
        if (onRefresh) onRefresh();
      } else {
        toast.info('No se encontraron productos con stock bajo');
      }
    } catch (error) {
      toast.error('Error al generar órdenes', { description: error.message });
    } finally {
      setGeneratingPOs(false);
    }
  };

  const openApprovalDialog = (po, action) => {
    setSelectedPO(po);
    setApprovalDialog({ open: true, action });
  };

  const closeApprovalDialog = () => {
    setApprovalDialog({ open: false, action: null });
    setSelectedPO(null);
    setApprovalNotes('');
    setRejectionReason('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Aprobación de Órdenes de Compra</h2>
          <p className="text-muted-foreground">
            Gestiona las órdenes de compra pendientes de aprobación
          </p>
        </div>
        <Button
          onClick={handleAutoGenerate}
          disabled={generatingPOs}
          className="gap-2"
        >
          {generatingPOs ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Auto-generar POs
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {pendingPOs.filter(po => po.status === 'pending').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Órdenes por revisar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Borradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {pendingPOs.filter(po => po.status === 'draft').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Auto-generadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(
                pendingPOs.reduce((sum, po) => sum + (po.totalAmount || 0), 0)
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">En órdenes pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending POs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes Pendientes de Aprobación</CardTitle>
          <CardDescription>
            Revisa y aprueba las órdenes de compra antes de que sean procesadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : pendingPOs.length === 0 ? (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                No hay órdenes de compra pendientes de aprobación
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-bold">Número OC</TableHead>
                    <TableHead className="font-bold">Proveedor</TableHead>
                    <TableHead className="font-bold">Fecha</TableHead>
                    <TableHead className="font-bold">Items</TableHead>
                    <TableHead className="font-bold">Monto</TableHead>
                    <TableHead className="font-bold">Estado</TableHead>
                    <TableHead className="font-bold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPOs.map((po) => (
                    <TableRow key={po._id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{po.poNumber}</span>
                        </div>
                        {po.autoGenerated && (
                          <Badge variant="outline" className="mt-1 text-xs bg-purple-50 border-purple-300">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Auto-generada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{po.supplierName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {formatDate(po.purchaseDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{po.items?.length || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          {formatCurrency(po.totalAmount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            po.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              : 'bg-gray-100 text-gray-800 border-gray-300'
                          }
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {po.status === 'pending' ? 'Pendiente' : 'Borrador'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openApprovalDialog(po, 'approve')}
                            className="gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openApprovalDialog(po, 'reject')}
                            className="gap-1"
                          >
                            <X className="h-4 w-4" />
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval/Rejection Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={closeApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.action === 'approve' ? 'Aprobar' : 'Rechazar'} Orden de Compra
            </DialogTitle>
            <DialogDescription>
              {selectedPO && `${selectedPO.poNumber} - ${selectedPO.supplierName}`}
            </DialogDescription>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-4 py-4">
              {/* PO Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Proveedor</p>
                  <p className="font-medium">{selectedPO.supplierName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha de Compra</p>
                  <p className="font-medium">{formatDate(selectedPO.purchaseDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Items</p>
                  <p className="font-medium">{selectedPO.items?.length || 0} producto(s)</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monto Total</p>
                  <p className="font-medium text-lg">{formatCurrency(selectedPO.totalAmount)}</p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Productos en la Orden</Label>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Costo Unit.</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.costPrice)}</TableCell>
                          <TableCell>{formatCurrency(item.totalCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Approval Notes or Rejection Reason */}
              {approvalDialog.action === 'approve' ? (
                <div>
                  <Label htmlFor="approvalNotes">Notas de Aprobación (opcional)</Label>
                  <Textarea
                    id="approvalNotes"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Agrega comentarios o instrucciones especiales..."
                    rows={3}
                    className="mt-2"
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="rejectionReason">
                    Razón de Rechazo <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explica por qué se rechaza esta orden de compra..."
                    rows={3}
                    required
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeApprovalDialog}>
              Cancelar
            </Button>
            {approvalDialog.action === 'approve' ? (
              <Button onClick={handleApprove} className="gap-2">
                <Check className="h-4 w-4" />
                Aprobar Orden
              </Button>
            ) : (
              <Button onClick={handleReject} variant="destructive" className="gap-2">
                <X className="h-4 w-4" />
                Rechazar Orden
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingApprovalPOs;
