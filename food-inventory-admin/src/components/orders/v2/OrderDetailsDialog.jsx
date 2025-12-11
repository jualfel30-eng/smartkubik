import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateDocumentPDF } from '@/lib/pdfGenerator.js';
import { toast } from 'sonner';
import { Printer, Download, Truck, Package, Ship, Users } from 'lucide-react';
import { fetchApi } from '@/lib/api.js';
import SplitBillModal from '@/components/restaurant/SplitBillModal.jsx';
import { useAuth } from '@/hooks/use-auth.jsx';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const getDeliveryMethodLabel = (method) => {
  const labels = {
    pickup: 'Retiro en Tienda',
    delivery: 'Delivery Local',
    envio_nacional: 'Envío Nacional',
  };
  return labels[method] || method;
};

const getDeliveryIcon = (method) => {
  const icons = {
    pickup: Package,
    delivery: Truck,
    envio_nacional: Ship,
  };
  const Icon = icons[method] || Package;
  return <Icon className="h-4 w-4" />;
};

export function OrderDetailsDialog({ isOpen, onClose, order, tenantSettings, onUpdate }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [billSplit, setBillSplit] = useState(null);
  const { tenant } = useAuth();
  const restaurantEnabled = Boolean(
    tenant?.enabledModules?.restaurant ||
    tenant?.enabledModules?.tables ||
    tenant?.enabledModules?.kitchenDisplay
  );

  const fetchBillSplit = useCallback(async (splitId) => {
    if (!splitId) return;
    try {
      const data = await fetchApi(`/bill-splits/${splitId}`);
      setBillSplit(data);
    } catch (error) {
      console.error('Error loading bill split:', error);
    }
  }, []);

  const activeSplitId = order?.activeSplitId;
  const isSplitOrder = order?.isSplit;
  const orderId = order?._id;
  const splitPeopleCount = billSplit?.numberOfPeople ?? billSplit?.parts?.length ?? 0;

  useEffect(() => {
    if (!restaurantEnabled) {
      setBillSplit(null);
      return;
    }
    if (isSplitOrder && activeSplitId) {
      fetchBillSplit(activeSplitId);
    } else {
      setBillSplit(null);
    }
  }, [restaurantEnabled, isSplitOrder, activeSplitId, fetchBillSplit]);

  useEffect(() => {
    setShowSplitModal(false);
  }, [orderId]);

  if (!order) return null;

  const handlePdfAction = async (action) => {
    const quoteStatuses = ['draft', 'pending'];
    // If already pagada, forzar factura aunque el estado sea de presupuesto
    const docType = order.paymentStatus === 'paid'
      ? 'invoice'
      : quoteStatuses.includes(order.status) ? 'quote' : 'invoice';
    const docTypeName = docType === 'quote' ? 'Presupuesto' : 'Factura';

    if (!order || !tenantSettings) {
      toast.error('Faltan datos para generar el PDF.');
      return;
    }
    setIsGenerating(true);
    try {
      await generateDocumentPDF({
        documentType: docType,
        orderData: order,
        tenantSettings: tenantSettings,
        action: action,
      });
    } catch (error) {
      console.error(`Error generating ${docType}:`, error);
      toast.error(`Error al generar la ${docTypeName}.`, { description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {restaurantEnabled && showSplitModal && order && (
        <SplitBillModal
          order={order}
          onClose={() => setShowSplitModal(false)}
          onSuccess={async (newSplit) => {
            setBillSplit(newSplit);
            setShowSplitModal(false);
            if (newSplit?._id) {
              await fetchBillSplit(newSplit._id);
            } else if (order?.activeSplitId) {
              await fetchBillSplit(order.activeSplitId);
            }
            if (onUpdate) onUpdate();
          }}
          />
      )}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalles de la Orden #{order.orderNumber}</DialogTitle>
          <DialogDescription>
            Cliente: <strong>{order.customerName}</strong>
          </DialogDescription>
          <div className="flex items-center gap-4 pt-2">
              <Badge variant="outline">{order.status}</Badge>
              <Badge>{order.paymentStatus}</Badge>
          </div>
        </DialogHeader>
        
        <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Información del Cliente</h4>
              <p className="text-sm"><strong>Email:</strong> {order.customerEmail || 'N/A'}</p>
              <p className="text-sm"><strong>Teléfono:</strong> {order.customerPhone || 'N/A'}</p>
            </div>

            {order.shipping && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  {getDeliveryIcon(order.shipping.method)}
                  Método de Entrega
                </h4>
                <p className="text-sm">
                  <strong>Método:</strong> {getDeliveryMethodLabel(order.shipping.method)}
                </p>
                {order.shipping.distance && (
                  <p className="text-sm">
                    <strong>Distancia:</strong> {order.shipping.distance.toFixed(2)} km
                  </p>
                )}
                {order.shipping.estimatedDuration && (
                  <p className="text-sm">
                    <strong>Duración estimada:</strong> {Math.round(order.shipping.estimatedDuration)} min
                  </p>
                )}
                {order.shipping.address && (
                  <p className="text-sm mt-2">
                    <strong>Dirección:</strong><br />
                    {order.shipping.address.street}, {order.shipping.address.city}, {order.shipping.address.state}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-2">Productos en la Orden</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-center">Unidad</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      {item.productName}
                      {item.selectedUnit && (
                        <div className="text-xs text-muted-foreground">
                          {item.quantityInBaseUnit && `(${item.quantityInBaseUnit} ${item.productSku?.includes('gramos') ? 'g' : 'unidades base'})`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">
                      {item.selectedUnit ? (
                        <Badge variant="outline" className="text-xs">{item.selectedUnit}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Resumen Financiero</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><p>Subtotal:</p> <p className="font-medium">{formatCurrency(order.subtotal)}</p></div>
              <div className="flex justify-between"><p>Costo de Envío:</p> <p className="font-medium">{formatCurrency(order.shippingCost)}</p></div>
              <div className="flex justify-between"><p>IVA (16%):</p> <p className="font-medium">{formatCurrency(order.ivaTotal)}</p></div>
              <div className="flex justify-between"><p>IGTF (3%):</p> <p className="font-medium">{formatCurrency(order.igtfTotal)}</p></div>
              <div className="flex justify-between text-base font-bold border-t pt-2"><p>Monto Total:</p> <p>{formatCurrency(order.totalAmount)}</p></div>
              {order.totalAmountVes > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <p>Total en Bolívares:</p>
                  <p>Bs {order.totalAmountVes.toFixed(2)}</p>
                </div>
              )}
              <div className="flex justify-between text-red-500 dark:text-red-400 border-t pt-2">
                <p>Balance Pendiente:</p>
                <p>{formatCurrency((order.totalAmount || 0) - (order.paidAmount || 0))}</p>
              </div>
            </div>
          </div>

          {order.paymentRecords && order.paymentRecords.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Historial de Pagos</h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto USD</TableHead>
                      <TableHead className="text-right">Monto VES</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.paymentRecords.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          {payment.date ? new Date(payment.date).toLocaleDateString('es-VE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{payment.method || 'N/A'}</Badge>
                          {payment.currency && (
                            <span className="ml-1 text-xs text-muted-foreground">({payment.currency})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount || 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {payment.amountVes > 0 ? `Bs ${payment.amountVes.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.reference || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={payment.isConfirmed ? 'success' : 'secondary'}>
                            {payment.isConfirmed ? 'Confirmado' : 'Pendiente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2} className="text-right">Total Pagado:</TableCell>
                      <TableCell className="text-right">{formatCurrency(order.paidAmount || 0)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {order.paidAmountVes > 0 ? `Bs ${order.paidAmountVes.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {restaurantEnabled && billSplit && (
            <div className="mt-4 p-4 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-900/30">
              <h4 className="font-semibold mb-2 flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Cuenta Dividida ({splitPeopleCount} personas)
              </h4>

              <div className="space-y-2">
                {billSplit.parts?.map((part, index) => {
                  const totalAmount = part.totalAmount ?? part.total ?? 0;
                  const isPaid = part.paymentStatus === 'paid';
                  return (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{part.personName || `Persona ${index + 1}`}</span>
                      <span className={isPaid ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
                        {formatCurrency(totalAmount)} - {isPaid ? '✓ Pagado' : 'Pendiente'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setShowSplitModal(true)}
              >
                Ver Detalles del Split
              </Button>
            </div>
          )}

        </div>

        <DialogFooter className="gap-2 sm:justify-between">
            <div>
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
                {restaurantEnabled && order.status === 'confirmed' && !isSplitOrder && !billSplit && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSplitModal(true)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Dividir Cuenta
                  </Button>
                )}
                <Button variant="outline" onClick={() => handlePdfAction('print')} disabled={isGenerating || !tenantSettings}>
                    <Printer className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Generando...' : 'Imprimir'}
                </Button>
                <Button onClick={() => handlePdfAction('download')} disabled={isGenerating || !tenantSettings}>
                    <Download className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Generando...' : 'Descargar'}
                </Button>
            </div>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
