import React from 'react';
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

const formatCurrency = (amount) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

export function OrderDetailsDialog({ isOpen, onClose, order }) {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalles de la Orden #{order.orderNumber}</DialogTitle>
          <DialogDescription>
            <span>Cliente: <strong>{order.customerName}</strong></span>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline">{order.status}</Badge>
              <Badge>{order.paymentStatus}</Badge>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Información del Cliente</h4>
              <p className="text-sm"><strong>Email:</strong> {order.customerEmail || 'N/A'}</p>
              <p className="text-sm"><strong>Teléfono:</strong> {order.customerPhone || 'N/A'}</p>
            </div>
            {order.shipping?.address && (
              <div>
                <h4 className="font-semibold mb-2">Dirección de Envío</h4>
                <p className="text-sm">{order.shipping.address.street}, {order.shipping.address.city}, {order.shipping.address.state}</p>
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
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
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

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}