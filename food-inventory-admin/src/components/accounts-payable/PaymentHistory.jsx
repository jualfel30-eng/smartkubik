import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Eye } from 'lucide-react';
import { getPayments } from '@/lib/api';
import { toast } from 'sonner';
import { AnimatedTableBody, AnimatedTableRow } from '../ui/animated-table-body';
import { EmptyState } from '../ui/empty-state';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const itemsPerPage = 10;

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPayments();
      setPayments(response.data || []);
    } catch (error) {
      console.error('Error al cargar el historial de pagos:', error);
      toast.error('Error al cargar el historial de pagos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    const searchTermLower = searchTerm.toLowerCase();
    const concept = payment.paymentType === 'sale'
      ? `pago de orden #${payment.orderId?.orderNumber}`
      : payment.payableId?.description
        ? `${payment.payableId.description} - ${payment.payableId.payeeName || ''}`
        : payment.payableId?.payeeName || '';
    const method = payment.method?.toLowerCase() || '';
    const reference = payment.reference?.toLowerCase() || '';
    return concept.toLowerCase().includes(searchTermLower) || method.includes(searchTermLower) || reference.includes(searchTermLower);
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayments, currentPage]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Pagos</CardTitle>
            <div className="w-1/3">
              <Input
                placeholder="Buscar en pagos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <EmptyState title="Cargando..." description="Obteniendo historial de pagos" />
          ) : filteredPayments.length === 0 ? (
            <EmptyState title="Sin pagos registrados" description="Los pagos aparecerán aquí una vez procesados" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Monto Pagado</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Ver</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatedTableBody>
                {paginatedPayments.map((payment) => {
                  const isSale = payment.paymentType === 'sale';
                  const concept = isSale
                    ? `Pago de Orden #${payment.orderId?.orderNumber || 'N/A'}`
                    : payment.payableId?.description
                      ? `${payment.payableId.description} - ${payment.payableId.payeeName || ''}`
                      : payment.payableId?.payeeName || 'N/A';

                  return (
                    <AnimatedTableRow key={payment._id}>
                      <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                      <TableCell>{concept}</TableCell>
                      <TableCell>${Number(payment.amount).toFixed(2)}</TableCell>
                      <TableCell>{payment.method || payment.paymentMethod || '-'}</TableCell>
                      <TableCell>{payment.reference || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedPayment(payment); setIsViewDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </AnimatedTableRow>
                  );
                })}
              </AnimatedTableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({filteredPayments.length} registros)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Payment Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Resumen de Transacción</DialogTitle>
            <DialogDescription>Detalles completos del pago realizado</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Información General</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fecha:</span>
                    <p className="font-medium">{new Date(selectedPayment.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo de Pago:</span>
                    <p className="font-medium capitalize">
                      {selectedPayment.paymentType === 'sale' ? 'Pago de Orden' : 'Pago de Cuenta por Pagar'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Concepto</h3>
                <p className="text-sm">
                  {selectedPayment.paymentType === 'sale'
                    ? `Pago de Orden #${selectedPayment.orderId?.orderNumber || 'N/A'}`
                    : selectedPayment.payableId?.description
                      ? `${selectedPayment.payableId.description} - ${selectedPayment.payableId.payeeName || ''}`
                      : selectedPayment.payableId?.payeeName || 'N/A'}
                </p>
              </div>

              <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
                <h3 className="font-semibold text-base">Detalles del Pago</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto Pagado:</span>
                    <span className="font-semibold text-success">${Number(selectedPayment.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método de Pago:</span>
                    <span className="font-medium">{selectedPayment.method || selectedPayment.paymentMethod || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referencia:</span>
                    <span className="font-medium">{selectedPayment.reference || '-'}</span>
                  </div>
                </div>
              </div>

              {selectedPayment.paymentType === 'sale' && selectedPayment.orderId && (
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-base">Información de la Orden</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedPayment.orderId.customerName && (
                      <div>
                        <span className="text-muted-foreground">Cliente:</span>
                        <p className="font-medium">{selectedPayment.orderId.customerName}</p>
                      </div>
                    )}
                    {selectedPayment.orderId.total && (
                      <div>
                        <span className="text-muted-foreground">Total de la Orden:</span>
                        <p className="font-medium">${Number(selectedPayment.orderId.total).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedPayment.paymentType === 'payable' && selectedPayment.payableId && (
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-base">Información del Proveedor</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedPayment.payableId.payeeName && (
                      <div>
                        <span className="text-muted-foreground">Proveedor:</span>
                        <p className="font-medium">{selectedPayment.payableId.payeeName}</p>
                      </div>
                    )}
                    {selectedPayment.payableId.totalAmount && (
                      <div>
                        <span className="text-muted-foreground">Monto Total de la Cuenta:</span>
                        <p className="font-medium">${Number(selectedPayment.payableId.totalAmount).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedPayment.notes && (
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-base">Notas</h3>
                  <p className="text-sm text-muted-foreground">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
