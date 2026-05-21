import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { PlusCircle, Eye, CreditCard, CheckCircle, Plus } from 'lucide-react';
import { PaymentDialog } from '../PaymentDialog';
import { AnimatedTableBody, AnimatedTableRow } from '../ui/animated-table-body';
import { EmptyState } from '../ui/empty-state';
import { DataHighlight } from '../ui/data-highlight';
import { useBcvRates } from '@/hooks/use-bcv-rates';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { URGENCY_STYLES, getUrgency, getDaysLabel, getPayableStatusInfo, getTotalAmount } from '@/lib/invoice-constants';
import CreatePayableDialog from './CreatePayableDialog';

const URGENCY_BORDER = {
  overdue: 'border-l-4 border-l-red-500',
  'due-soon': 'border-l-4 border-l-amber-400',
  current: 'border-l-4 border-l-emerald-500',
};

function PayableMobileCard({ payable, onPay, onView, usdRate, eurRate }) {
  const isBcvUsd = payable.expectedCurrency === 'USD_BCV' || payable.expectedPaymentMethods?.includes('bolivares_bcv');
  const isBcvEur = payable.expectedCurrency === 'EUR_BCV' || payable.expectedPaymentMethods?.includes('euro_bcv');
  const totalAmount = getTotalAmount(payable.lines);
  const balance = totalAmount - (payable.paidAmount || 0);
  const urgency = getUrgency(payable.dueDate);
  const daysLabel = getDaysLabel(payable.dueDate);
  const statusInfo = getPayableStatusInfo(payable.status);
  const bsAmount = isBcvUsd && usdRate ? totalAmount * usdRate : isBcvEur && eurRate ? totalAmount * eurRate : null;

  return (
    <div className={cn('bg-card border rounded-xl p-4 space-y-3 shadow-sm', URGENCY_BORDER[urgency])}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base truncate">{payable.payeeName || 'Sin proveedor'}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusInfo.variant} className={cn('text-xs', statusInfo.color)}>{statusInfo.label}</Badge>
            {daysLabel && <span className={cn('text-xs', daysLabel.className)}>{daysLabel.text}</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold">{formatCurrency(balance)}</p>
          {bsAmount && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Bs {bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>

      {payable.dueDate && (
        <p className="text-xs text-muted-foreground">
          Vence: {new Date(payable.dueDate).toLocaleDateString()}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => onView(payable)}>
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Ver
        </Button>
        <Button
          variant={urgency === 'overdue' ? 'destructive' : 'default'}
          size="sm"
          className="flex-[2] h-9"
          onClick={() => onPay(payable)}
          disabled={payable.status === 'paid'}
        >
          <CreditCard className="h-3.5 w-3.5 mr-1.5" />
          Pagar
        </Button>
      </div>
    </div>
  );
}

export default function MonthlyPayables({ suppliers, accounts, fetchPayables, payables, fetchSuppliers, highlightId, onHighlightConsumed, urgencyFilter = 'all' }) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const { usdRate, eurRate } = useBcvRates();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const pendingPayables = useMemo(() => {
    const pending = payables.filter(payable => !['paid', 'void'].includes(payable.status));
    if (!urgencyFilter || urgencyFilter === 'all') return pending;
    return pending.filter(p => getUrgency(p.dueDate) === urgencyFilter);
  }, [payables, urgencyFilter]);

  useEffect(() => {
    if (!highlightId) return;
    const match = pendingPayables.find((p) => p._id === highlightId);
    if (!match) return;
    setSelectedPayable(match);
    setIsViewDialogOpen(true);
    onHighlightConsumed?.();
  }, [highlightId, pendingPayables, onHighlightConsumed]);

  const handleOpenPaymentDialog = (payable) => {
    setSelectedPayable(payable);
    setIsPaymentDialogOpen(true);
  };

  const handleOpenViewDialog = (payable) => {
    setSelectedPayable(payable);
    setIsViewDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    fetchPayables();
  };

  return (
    <>
      <Card>
        {!isMobile && (
          <CardHeader className="flex">
            <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white" onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-5 w-5" />Registrar Cuenta por Pagar
            </Button>
          </CardHeader>
        )}
        <CardContent className={isMobile ? 'pt-4' : undefined}>
          {pendingPayables.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="Cuentas al día"
              description="No hay facturas pendientes de pago"
              actionLabel="+ Nueva factura"
              onAction={() => setIsCreateDialogOpen(true)}
            />
          ) : isMobile ? (
            <div className="space-y-3 pb-20">
              {pendingPayables.map((payable) => (
                <PayableMobileCard
                  key={payable._id}
                  payable={payable}
                  onPay={handleOpenPaymentDialog}
                  onView={handleOpenViewDialog}
                  usdRate={usdRate}
                  eurRate={eurRate}
                />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha Venc.</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-center" />
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
                  const statusInfo = getPayableStatusInfo(payable.status);
                  const balance = totalAmount - (payable.paidAmount || 0);

                  return (
                    <AnimatedTableRow key={payable._id} className={cn(URGENCY_STYLES[urgency])}>
                      <TableCell className="font-medium">{payable.payeeName || 'Sin definir'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {payable.dueDate
                            ? new Date(payable.dueDate).toLocaleDateString()
                            : <span className="text-muted-foreground">Sin definir</span>}
                          {daysLabel && <span className={daysLabel.className}>{daysLabel.text}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span>{formatCurrency(totalAmount)}</span>
                          {shouldShowBs && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              Bs. {bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <DataHighlight value={balance}>
                          {formatCurrency(balance)}
                        </DataHighlight>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenViewDialog(payable)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalles</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={urgency === 'overdue' ? 'destructive' : 'outline'}
                                size="sm"
                                className="h-8 gap-1"
                                onClick={() => handleOpenPaymentDialog(payable)}
                                disabled={payable.status === 'paid'}
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Pagar</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Registrar pago</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </AnimatedTableRow>
                  );
                })}
              </AnimatedTableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* FAB para móvil */}
      {isMobile && (
        <button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg flex items-center justify-center z-50 transition-colors"
          onClick={() => setIsCreateDialogOpen(true)}
          aria-label="Registrar cuenta por pagar"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      )}

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
                    <p className="font-medium">{selectedPayable.payeeName || 'Sin definir'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium capitalize">{selectedPayable.payeeType || 'Sin definir'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Detalles del Pago</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo de Gasto:</span>
                    <p className="font-medium capitalize">{selectedPayable.type?.replace(/_/g, ' ') || 'Sin definir'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge variant={getPayableStatusInfo(selectedPayable.status).variant}>
                      {getPayableStatusInfo(selectedPayable.status).label}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de Emisión:</span>
                    <p className="font-medium">{new Date(selectedPayable.issueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de Vencimiento:</span>
                    <p className="font-medium">{selectedPayable.dueDate ? new Date(selectedPayable.dueDate).toLocaleDateString() : 'Sin definir'}</p>
                  </div>
                  {selectedPayable.expectedPaymentMethods?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Forma de Pago:</span>
                      <p className="font-medium">{selectedPayable.expectedPaymentMethods.join(', ')}</p>
                    </div>
                  )}
                  {selectedPayable.isCredit && (
                    <div>
                      <span className="text-muted-foreground">Crédito:</span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Sí</Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Líneas del Gasto</h3>
                <div className="space-y-2">
                  {selectedPayable.lines?.map((line, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{line.description || 'Sin descripción'}</p>
                        {line.accountId && (
                          <p className="text-xs text-muted-foreground">
                            Cuenta: {accounts.find(a => a._id === line.accountId)?.name || line.accountId}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold">{formatCurrency(Number(line.amount || 0))}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-2 bg-muted/30">
                <h3 className="font-semibold text-base">Resumen</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto Total:</span>
                    <span className="font-semibold">{formatCurrency(getTotalAmount(selectedPayable.lines))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto Pagado:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedPayable.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Saldo Pendiente:</span>
                    <span className="font-bold text-lg text-amber-600 dark:text-amber-400">
                      {formatCurrency(getTotalAmount(selectedPayable.lines) - (selectedPayable.paidAmount || 0))}
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
