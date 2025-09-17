
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchApi } from '@/lib/api';

// Solución temporal mientras se resuelve el bug del backend
const hardcodedPaymentMethods = [
    { id: 'efectivo_ves', name: 'Efectivo (VES)' },
    { id: 'pago_movil_ves', name: 'Pago Móvil (VES)' },
    { id: 'transferencia_ves', name: 'Transferencia (VES)' },
    { id: 'tarjeta_ves', name: 'Tarjeta (VES)' },
    { id: 'efectivo_usd', name: 'Efectivo (USD)' },
    { id: 'zelle_usd', name: 'Zelle' },
    { id: 'transferencia_usd', name: 'Transferencia (USD)' },
];

export function PaymentDialog({ open, onOpenChange, order, onPaymentSuccess }) {
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
  });
  const [remainingAmount, setRemainingAmount] = useState(0);

  useEffect(() => {
    if (order) {
      const totalPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const remaining = order.totalAmount - totalPaid;
      setRemainingAmount(remaining);
      setPaymentData({
        amount: remaining > 0 ? remaining.toFixed(2) : 0,
        method: hardcodedPaymentMethods[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        reference: '',
      });
    }
  }, [order]);

  const handleSavePayment = async () => {
    if (!order || !paymentData.amount || !paymentData.method) {
      alert("Por favor, complete todos los campos requeridos.");
      return;
    }

    const payload = {
      amount: Number(paymentData.amount),
      method: paymentData.method,
      date: new Date(paymentData.date).toISOString(),
      reference: paymentData.reference,
    };

    try {
      await fetchApi(`/orders/${order._id}/payments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      let successMessage = "Pago registrado con éxito!";
      
      if (order.status === 'pending') {
          await fetchApi(`/orders/${order._id}`, { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) });
          successMessage = "¡Pago registrado y orden confirmada con éxito!";
      }

      alert(successMessage);
      onPaymentSuccess();
    } catch (error) {
      console.error("Failed to save payment:", error);
      alert(`Error al registrar el pago: ${error.message}`);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago para Orden #{order.orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <p className="font-medium">Monto Total: <span className="text-primary">${order.totalAmount.toFixed(2)}</span></p>
            <p className="font-medium">Monto Pendiente: <span className="text-red-500">${remainingAmount.toFixed(2)}</span></p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">Monto</Label>
            <Input
              id="amount"
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData(p => ({ ...p, amount: e.target.value }))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="method" className="text-right">Método</Label>
            <Select
              value={paymentData.method}
              onValueChange={(value) => setPaymentData(p => ({ ...p, method: value }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione un método" />
              </SelectTrigger>
              <SelectContent>
                {hardcodedPaymentMethods.map(method => (
                  <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={paymentData.date}
              onChange={(e) => setPaymentData(p => ({ ...p, date: e.target.value }))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reference" className="text-right">Referencia</Label>
            <Input
              id="reference"
              placeholder="Opcional"
              value={paymentData.reference}
              onChange={(e) => setPaymentData(p => ({ ...p, reference: e.target.value }))}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSavePayment}>Guardar Pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
