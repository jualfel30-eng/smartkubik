import React, { useState } from 'react';
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
import { Printer, Download, Truck, Package, Ship } from 'lucide-react';

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

export function OrderDetailsDialog({ isOpen, onClose, order, tenantSettings }) {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!order) return null;

  const handlePdfAction = async (action) => {
    const quoteStatuses = ['draft', 'pending'];
    const docType = quoteStatuses.includes(order.status) ? 'quote' : 'invoice';
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
              <div className="flex justify-between text-base font-bold"><p>Monto Total:</p> <p>{formatCurrency(order.totalAmount)}</p></div>
              <div className="flex justify-between text-red-500"><p>Balance Pendiente:</p> <p>{formatCurrency((order.totalAmount || 0) - (order.paidAmount || 0))}</p></div>
            </div>
          </div>

        </div>

        <DialogFooter className="gap-2 sm:justify-between">
            <div>
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            </div>
            <div className="flex gap-2">
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
  );
}