import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { ChevronDown, FileText, MessageSquare, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { getPayments } from '@/lib/api';
import { toast } from 'sonner';
import { AnimatedTableBody, AnimatedTableRow } from '../ui/animated-table-body';
import { EmptyState } from '../ui/empty-state';
import { formatCurrency } from '@/lib/currency-utils';
import { getPayableStatusInfo, getTotalAmount } from '@/lib/invoice-constants';
import { cn } from '@/lib/utils';
import { generateComprobanteHTML } from '@/lib/payable-comprobante';

const PAYMENT_METHOD_LABELS = {
  transferencia_usd: 'Transferencia USD',
  transferencia_ves: 'Transferencia VES',
  efectivo_usd: 'Efectivo USD',
  efectivo_ves: 'Efectivo VES',
  zelle: 'Zelle',
  pago_movil: 'Pago Móvil',
  pos: 'POS',
  tarjeta: 'Tarjeta',
};

function PayableDetailDialog({ isOpen, onOpenChange, payable, paymentsForPayable }) {
  if (!payable) return null;
  const total = getTotalAmount(payable.lines);
  const statusInfo = getPayableStatusInfo(payable.status);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle — {payable.payableNumber || 'Factura'}</DialogTitle>
          <DialogDescription>{payable.payeeName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Proveedor</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Nombre:</span><p className="font-medium">{payable.payeeName}</p></div>
              <div><span className="text-muted-foreground">Estado:</span>
                <Badge variant={statusInfo.variant} className={cn('mt-0.5', statusInfo.color)}>{statusInfo.label}</Badge>
              </div>
              <div><span className="text-muted-foreground">Emisión:</span><p className="font-medium">{new Date(payable.issueDate).toLocaleDateString()}</p></div>
              {payable.dueDate && <div><span className="text-muted-foreground">Vencimiento:</span><p className="font-medium">{new Date(payable.dueDate).toLocaleDateString()}</p></div>}
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Líneas del Gasto</h3>
            <div className="space-y-1">
              {(payable.lines || []).map((line, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-muted/40 rounded text-sm">
                  <span>{line.description || 'Sin descripción'}</span>
                  <span className="font-semibold">{formatCurrency(Number(line.amount || 0))}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-2 bg-muted/30">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Resumen</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total:</span><span className="font-semibold">{formatCurrency(total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pagado:</span><span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(payable.paidAmount || 0)}</span></div>
              <div className="flex justify-between pt-1 border-t"><span className="font-semibold">Saldo:</span><span className="font-bold">{formatCurrency(total - (payable.paidAmount || 0))}</span></div>
            </div>
          </div>

          {paymentsForPayable.length > 0 && (
            <div className="p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pagos realizados</h3>
              <div className="space-y-2">
                {paymentsForPayable.map((pmt, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-emerald-500/5 border border-emerald-500/20 rounded text-sm">
                    <div>
                      <p className="font-medium">{formatCurrency(Number(pmt.amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[pmt.method] || pmt.method} · {pmt.reference || 'Sin ref.'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(pmt.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payable.notes && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-1">Notas</h3>
              <p className="text-sm text-muted-foreground">{payable.notes}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CompletedPayables({ payables, fetchPayables, highlightId, onHighlightConsumed }) {
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const itemsPerPage = 15;

  const loadPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const response = await getPayments();
      setPayments(response.data || []);
    } catch {
      toast.error('Error al cargar historial de pagos');
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const completedPayables = useMemo(() =>
    payables.filter(p => ['paid', 'void'].includes(p.status)),
    [payables]
  );

  const filteredPayables = useMemo(() => {
    if (!searchTerm.trim()) return completedPayables;
    const q = searchTerm.toLowerCase();
    return completedPayables.filter(p =>
      p.payeeName?.toLowerCase().includes(q) ||
      p.payableNumber?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [completedPayables, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const totalPages = Math.ceil(filteredPayables.length / itemsPerPage);
  const paginatedPayables = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayables.slice(start, start + itemsPerPage);
  }, [filteredPayables, currentPage]);

  const paymentsByPayable = useMemo(() => {
    const map = {};
    payments.forEach(pmt => {
      const id = pmt.payableId?._id || pmt.payableId;
      if (!id) return;
      if (!map[id]) map[id] = [];
      map[id].push(pmt);
    });
    return map;
  }, [payments]);

  useEffect(() => {
    if (!highlightId) return;
    const match = completedPayables.find(p => p._id === highlightId);
    if (!match) return;
    setSelectedPayable(match);
    setIsDetailOpen(true);
    onHighlightConsumed?.();
  }, [highlightId, completedPayables, onHighlightConsumed]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExportComprobante = (payable) => {
    const paymentsForPayable = paymentsByPayable[payable._id] || [];
    const html = generateComprobanteHTML(payable, paymentsForPayable);
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Permite las ventanas emergentes para exportar el comprobante'); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleShareWhatsApp = (payable) => {
    const paymentsForPayable = paymentsByPayable[payable._id] || [];
    const lastPmt = paymentsForPayable[paymentsForPayable.length - 1];
    const msg =
      `*Comprobante de Pago*\n` +
      `Proveedor: ${payable.payeeName}\n` +
      `Factura: ${payable.payableNumber || 'N/A'}\n` +
      `Total: ${formatCurrency(payable.paidAmount || 0)}\n` +
      (lastPmt ? `Método: ${PAYMENT_METHOD_LABELS[lastPmt.method] || lastPmt.method}\n` : '') +
      (lastPmt?.reference ? `Referencia: ${lastPmt.reference}\n` : '') +
      `Estado: ✅ PAGADO`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleOpenDetail = (payable) => {
    setSelectedPayable(payable);
    setIsDetailOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle>Completados</CardTitle>
            <div className="w-full sm:w-1/3">
              <Input
                placeholder="Buscar por proveedor, número..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredPayables.length} {filteredPayables.length === 1 ? 'registro' : 'registros'}
            {searchTerm && ` para "${searchTerm}"`}
          </p>
        </CardHeader>
        <CardContent>
          {filteredPayables.length === 0 ? (
            <EmptyState
              title={searchTerm ? 'Sin resultados' : 'Sin registros completados'}
              description={searchTerm ? 'No hay facturas que coincidan con la búsqueda' : 'Las facturas pagadas o anuladas aparecerán aquí'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatedTableBody>
                {paginatedPayables.map((payable) => {
                  const isExpanded = expandedIds.has(payable._id);
                  const paymentsForPayable = paymentsByPayable[payable._id] || [];
                  const statusInfo = getPayableStatusInfo(payable.status);
                  const total = getTotalAmount(payable.lines);

                  return (
                    <React.Fragment key={payable._id}>
                      <AnimatedTableRow className="group cursor-pointer" onClick={() => toggleExpand(payable._id)}>
                        <TableCell className="w-8">
                          <ChevronDown
                            className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-180')}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{payable.payeeName || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {payable.issueDate ? new Date(payable.issueDate).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className={statusInfo.color}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDetail(payable)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalle completo</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40" onClick={() => handleExportComprobante(payable)}>
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Exportar comprobante PDF</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" onClick={() => handleShareWhatsApp(payable)}>
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Compartir por WhatsApp</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </AnimatedTableRow>

                      {isExpanded && (
                        <tr className="bg-muted/30 border-b">
                          <td colSpan={6} className="px-6 py-3">
                            {loadingPayments ? (
                              <p className="text-sm text-muted-foreground">Cargando pagos...</p>
                            ) : paymentsForPayable.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">Sin registros de pago individuales</p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  Pagos individuales — {paymentsForPayable.length} {paymentsForPayable.length === 1 ? 'transacción' : 'transacciones'}
                                </p>
                                {paymentsForPayable.map((pmt, i) => (
                                  <div key={i} className="flex items-center justify-between p-2.5 bg-card border rounded-lg text-sm">
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                      <div>
                                        <p className="font-semibold">{formatCurrency(Number(pmt.amount))}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {PAYMENT_METHOD_LABELS[pmt.method] || pmt.method}
                                          {pmt.reference && ` · Ref: ${pmt.reference}`}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{new Date(pmt.date).toLocaleDateString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PayableDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        payable={selectedPayable}
        paymentsForPayable={selectedPayable ? (paymentsByPayable[selectedPayable._id] || []) : []}
      />
    </>
  );
}
