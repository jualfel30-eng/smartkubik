import React, { useState, useMemo, useEffect } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Eye, Trash2 } from 'lucide-react';
import { deletePayable } from '@/lib/api';
import { toast } from 'sonner';
import { AnimatedTableBody, AnimatedTableRow } from '../ui/animated-table-body';
import { EmptyState } from '../ui/empty-state';
import { useBcvRates } from '@/hooks/use-bcv-rates';
import { cn } from '@/lib/utils';
import { formatCurrency, CURRENCY_LABELS } from '@/lib/currency-utils';
import { URGENCY_STYLES, getUrgency, getPayableStatusInfo, getTotalAmount } from '@/lib/invoice-constants';

const ViewPayableDialog = ({ isOpen, onOpenChange, payable }) => {
  const getTotalAmount = (lines) => {
    return (lines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0);
  };

  if (!payable) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalles de Cuenta por Pagar</DialogTitle>
          <DialogDescription>{payable.payableNumber || 'Sin número'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-base">Información del Proveedor</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <p className="font-medium">{payable.payeeName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium capitalize">{payable.payeeType || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-base">Detalles del Pago</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo de Gasto:</span>
                <p className="font-medium capitalize">{payable.type?.replace(/_/g, ' ') || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant={payable.status === 'paid' ? 'default' : payable.status === 'partially_paid' ? 'secondary' : 'outline'}>
                  {payable.status === 'paid' ? 'Pagado' : payable.status === 'partially_paid' ? 'Parcial' : payable.status === 'void' ? 'Anulado' : payable.status === 'open' ? 'Abierto' : payable.status}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha de Emisión:</span>
                <p className="font-medium">{new Date(payable.issueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha de Vencimiento:</span>
                <p className="font-medium">{payable.dueDate ? new Date(payable.dueDate).toLocaleDateString() : 'No definida'}</p>
              </div>
              {payable.expectedCurrency && (
                <div>
                  <span className="text-muted-foreground">Moneda Esperada:</span>
                  <p className="font-medium">{CURRENCY_LABELS[payable.expectedCurrency] || payable.expectedCurrency}</p>
                </div>
              )}
              {payable.expectedPaymentMethods?.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Métodos de Pago:</span>
                  <p className="font-medium">{payable.expectedPaymentMethods.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-base">Líneas del Gasto</h3>
            <div className="space-y-2">
              {(payable.lines || []).map((line, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{line.description || 'Sin descripción'}</p>
                  </div>
                  <p className="font-semibold">${Number(line.amount || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
            <h3 className="font-semibold text-base">Resumen</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto Total:</span>
                <span className="font-semibold">${getTotalAmount(payable.lines).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto Pagado:</span>
                <span className="font-semibold text-success">${(payable.paidAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Saldo Pendiente:</span>
                <span className="font-bold text-lg text-warning">
                  ${(getTotalAmount(payable.lines) - (payable.paidAmount || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {payable.notes && (
            <div className="p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold text-base">Notas</h3>
              <p className="text-sm text-muted-foreground">{payable.notes}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function PayablesHistory({ payables, fetchPayables, highlightId, onHighlightConsumed }) {
  const [ConfirmDialog, confirm] = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { usdRate, eurRate } = useBcvRates();

  const handleOpenViewDialog = (payable) => {
    setSelectedPayable(payable);
    setIsViewDialogOpen(true);
  };

  useEffect(() => {
    if (!highlightId) return;
    const match = payables.find((p) => p._id === highlightId);
    if (!match) return;
    setSelectedPayable(match);
    setIsViewDialogOpen(true);
    onHighlightConsumed?.();
  }, [highlightId, payables, onHighlightConsumed]);

  const handleDeletePayable = async (payableId) => {
    const ok = await confirm({
      title: '¿Eliminar este registro de pago?',
      description: 'Esta acción no se puede deshacer.',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deletePayable(payableId);
      toast.success('Cuenta por pagar eliminada');
      fetchPayables();
    } catch (error) {
      console.error('Error al eliminar cuenta por pagar:', error);
      toast.error('Error al eliminar la cuenta por pagar', { description: error.message });
    }
  };

  // Status now comes from shared constants

  const filteredPayables = useMemo(() => {
    if (!searchTerm.trim()) return payables;
    const searchLower = searchTerm.toLowerCase();
    return payables.filter(payable =>
      payable.payeeName?.toLowerCase().includes(searchLower) ||
      payable.description?.toLowerCase().includes(searchLower) ||
      payable.payableNumber?.toLowerCase().includes(searchLower)
    );
  }, [payables, searchTerm]);

  const totalPages = Math.ceil(filteredPayables.length / itemsPerPage);
  const paginatedPayables = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayables.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayables, currentPage]);

  // getTotalAmount imported from invoice-constants

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Cuentas por Pagar</CardTitle>
            <div className="w-1/3">
              <Input
                placeholder="Buscar por proveedor, descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredPayables.length} de {payables.length} registros
          </p>
        </CardHeader>
        <CardContent>
          {filteredPayables.length === 0 ? (
            <EmptyState title="Sin resultados" description="No se encontraron registros con ese criterio de búsqueda" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto Total</TableHead>
                  <TableHead>Monto Pagado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Ver</TableHead>
                  <TableHead className="text-center">Eliminar</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatedTableBody>
                {paginatedPayables.map((payable) => {
                  const isBcvUsd = payable.expectedCurrency === 'USD_BCV' || payable.expectedPaymentMethods?.includes('bolivares_bcv');
                  const isBcvEur = payable.expectedCurrency === 'EUR_BCV' || payable.expectedPaymentMethods?.includes('euro_bcv');
                  const shouldShowBs = (isBcvUsd && usdRate) || (isBcvEur && eurRate);
                  const totalAmount = getTotalAmount(payable.lines);
                  const bsAmount = isBcvUsd ? totalAmount * usdRate : totalAmount * eurRate;
                  const urgency = getUrgency(payable.dueDate);

                  return (
                    <AnimatedTableRow key={payable._id} className={cn(URGENCY_STYLES[urgency])}>
                      <TableCell>{payable.payeeName || 'N/A'}</TableCell>
                      <TableCell>{new Date(payable.issueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>${totalAmount.toFixed(2)}</span>
                          {shouldShowBs && (
                            <span className="text-xs text-success">
                              Bs. {bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>${(payable.paidAmount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={getPayableStatusInfo(payable.status).variant} className={getPayableStatusInfo(payable.status).color}>
                          {getPayableStatusInfo(payable.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenViewDialog(payable)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePayable(payable._id)}
                          disabled={payable.status === 'paid' || payable.status === 'partially_paid'}
                        >
                          <Trash2 className="h-4 w-4" />
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
                Página {currentPage} de {totalPages} ({filteredPayables.length} registros)
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

      {selectedPayable && (
        <ViewPayableDialog
          isOpen={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          payable={selectedPayable}
        />
      )}
      <ConfirmDialog />
    </>
  );
}
