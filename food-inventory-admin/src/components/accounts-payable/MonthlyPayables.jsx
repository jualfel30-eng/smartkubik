import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { PlusCircle, Eye, CreditCard, CheckCircle } from 'lucide-react';
import { PaymentDialog } from '../PaymentDialog';
import { AnimatedTableBody, AnimatedTableRow } from '../ui/animated-table-body';
import { EmptyState } from '../ui/empty-state';
import { useBcvRates } from '@/hooks/use-bcv-rates';
import { cn } from '@/lib/utils';
import CreatePayableDialog from './CreatePayableDialog';

const getUrgency = (dueDate) => {
  if (!dueDate) return 'current';
  const days = Math.floor((new Date() - new Date(dueDate)) / 86400000);
  if (days > 0) return 'overdue';
  if (days > -7) return 'due-soon';
  return 'current';
};

const urgencyStyles = {
  overdue: 'border-l-4 border-l-red-500 bg-red-500/5',
  'due-soon': 'border-l-4 border-l-amber-500',
  current: 'border-l-4 border-l-emerald-500/30',
};

const getDaysLabel = (dueDate) => {
  if (!dueDate) return null;
  const days = Math.floor((new Date() - new Date(dueDate)) / 86400000);
  if (days > 0) return { text: `Vencida hace ${days} día${days === 1 ? '' : 's'}`, className: 'text-destructive text-xs' };
  if (days === 0) return { text: 'Vence hoy', className: 'text-amber-600 dark:text-amber-400 text-xs' };
  if (days > -7) return { text: `Vence en ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`, className: 'text-amber-600 dark:text-amber-400 text-xs' };
  return null;
};

const getTotalAmount = (lines) => lines.reduce((acc, line) => acc + Number(line.amount || 0), 0);

export default function MonthlyPayables({ suppliers, accounts, fetchPayables, payables, fetchSuppliers }) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [flashRowId, setFlashRowId] = useState(null);
  const { usdRate, eurRate } = useBcvRates();

  const pendingPayables = useMemo(() => {
    return payables.filter(payable => !['paid', 'void'].includes(payable.status));
  }, [payables]);

  const handleOpenPaymentDialog = (payable) => {
    setSelectedPayable(payable);
    setIsPaymentDialogOpen(true);
  };

  const handleOpenViewDialog = (payable) => {
    setSelectedPayable(payable);
    setIsViewDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    const paidId = selectedPayable?._id;
    setIsPaymentDialogOpen(false);
    fetchPayables();
    if (paidId) {
      setFlashRowId(paidId);
      setTimeout(() => setFlashRowId(null), 1500);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex">
          <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" />Registrar Cuenta por Pagar
          </Button>
        </CardHeader>
        <CardContent>
          {pendingPayables.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="Cuentas al día"
              description="No hay facturas pendientes de pago"
              actionLabel="+ Nueva factura"
              onAction={() => setIsCreateDialogOpen(true)}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Monto Total</TableHead>
                  <TableHead>Monto Pagado</TableHead>
                  <TableHead>Forma de Pago</TableHead>
                  <TableHead className="text-center">Crédito</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Ver</TableHead>
                  <TableHead className="text-center">Pagar</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatedTableBody>
                {pendingPayables.map((payable) => {
                  const isBcvUsd = payable.expectedCurrency === 'USD_BCV' || payable.expectedPaymentMethods?.includes('bolivares_bcv');
                  const isBcvEur = payable.expectedCurrency === 'EUR_BCV' || payable.expectedPaymentMethods?.includes('euro_bcv');
                  const shouldShowBs = (isBcvUsd && usdRate) || (isBcvEur && eurRate);
                  const totalAmount = getTotalAmount(payable.lines);
                  const bsAmount = isBcvUsd ? totalAmount * usdRate : totalAmount * eurRate;
                  const urgency = getUrgency(payable.dueDate);
                  const daysLabel = getDaysLabel(payable.dueDate);

                  return (
                    <AnimatedTableRow
                      key={payable._id}
                      className={cn(urgencyStyles[urgency])}
                      animate={flashRowId === payable._id
                        ? { backgroundColor: ['rgba(16,185,129,0.3)', 'rgba(16,185,129,0)', 'transparent'] }
                        : {}
                      }
                      transition={flashRowId === payable._id ? { duration: 1.5 } : {}}
                    >
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
                        {payable.expectedPaymentMethods?.length > 0
                          ? payable.expectedPaymentMethods.join(', ')
                          : <span className="text-gray-400 italic">No def.</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {payable.isCredit
                          ? <Badge variant="outline" className="bg-success/5 text-success border-green-200">Sí</Badge>
                          : <span className="text-gray-400">No</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {payable.dueDate
                            ? new Date(payable.dueDate).toLocaleDateString()
                            : <span className="text-gray-400 italic">N/A</span>}
                          {daysLabel && <span className={daysLabel.className}>{daysLabel.text}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          payable.status === 'paid' ? 'bg-success/10 text-green-800' :
                            payable.status === 'partial' ? 'bg-warning/10 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                        )}>
                          {payable.status === 'paid' ? 'Pagado' :
                            payable.status === 'partial' ? 'Parcial' :
                              payable.status === 'draft' ? 'Borrador' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenViewDialog(payable)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant={urgency === 'overdue' ? 'destructive' : urgency === 'due-soon' ? 'outline' : 'ghost'}
                          size={urgency === 'overdue' ? 'sm' : 'icon'}
                          onClick={() => handleOpenPaymentDialog(payable)}
                          disabled={payable.status === 'paid'}
                          className={cn(urgency === 'overdue' && 'gap-1')}
                        >
                          <CreditCard className="h-4 w-4" />
                          {urgency === 'overdue' && <span>Pagar</span>}
                        </Button>
                      </TableCell>
                    </AnimatedTableRow>
                  );
                })}
              </AnimatedTableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalles de Cuenta por Pagar</DialogTitle>
            <DialogDescription>Información completa del registro</DialogDescription>
          </DialogHeader>
          {selectedPayable && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Información del Proveedor</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nombre:</span>
                    <p className="font-medium">{selectedPayable.payeeName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium capitalize">{selectedPayable.payeeType || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Detalles del Pago</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo de Gasto:</span>
                    <p className="font-medium capitalize">{selectedPayable.type?.replace(/_/g, ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado:</span>
                    <p className="font-medium capitalize">{selectedPayable.status || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de Emisión:</span>
                    <p className="font-medium">{new Date(selectedPayable.issueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de Vencimiento:</span>
                    <p className="font-medium">{selectedPayable.dueDate ? new Date(selectedPayable.dueDate).toLocaleDateString() : 'No definida'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Líneas del Gasto</h3>
                <div className="space-y-2">
                  {selectedPayable.lines?.map((line, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{line.description || 'Sin descripción'}</p>
                        {line.accountId && (
                          <p className="text-xs text-muted-foreground">
                            Cuenta: {accounts.find(a => a._id === line.accountId)?.name || line.accountId}
                          </p>
                        )}
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
                    <span className="font-semibold">${getTotalAmount(selectedPayable.lines).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto Pagado:</span>
                    <span className="font-semibold text-success">${(selectedPayable.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Saldo Pendiente:</span>
                    <span className="font-bold text-lg text-warning">
                      ${(getTotalAmount(selectedPayable.lines) - (selectedPayable.paidAmount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedPayable.notes && (
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-base">Notas</h3>
                  <p className="text-sm text-muted-foreground">{selectedPayable.notes}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
            {selectedPayable && selectedPayable.status !== 'paid' && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                handleOpenPaymentDialog(selectedPayable);
              }}>
                <CreditCard className="mr-2 h-4 w-4" />
                Registrar Pago
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreatePayableDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        suppliers={suppliers}
        accounts={accounts}
        fetchPayables={fetchPayables}
        fetchSuppliers={fetchSuppliers}
      />

      <PaymentDialog isOpen={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} payable={selectedPayable} onPaymentSuccess={handlePaymentSuccess} />
    </>
  );
}
