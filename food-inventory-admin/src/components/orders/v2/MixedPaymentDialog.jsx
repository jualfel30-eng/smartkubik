import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmContext } from '@/context/CrmContext';
import { X, Plus } from 'lucide-react';

export function MixedPaymentDialog({ isOpen, onClose, totalAmount, onSave }) {
  const { paymentMethods, loading: contextLoading } = useCrmContext();
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    // Cuando se abre el modal, si no hay pagos, añadir la primera línea automáticamente
    if (isOpen) {
      if (payments.length === 0) {
        const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || '';
        setPayments([{ 
          id: Date.now(), 
          amount: totalAmount.toFixed(2), // Pre-llenar con el total
          method: defaultMethod, 
          reference: '' 
        }]);
      }
    } else {
      // Limpiar al cerrar
      setPayments([]);
    }
  }, [isOpen, totalAmount, paymentMethods, payments.length]);

  const totalPaid = useMemo(() => 
    payments.reduce((sum, p) => sum + Number(p.amount || 0), 0), 
  [payments]);

  const remaining = totalAmount - totalPaid;

  const handleAddPayment = () => {
    const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || '';
    // Pre-llenar el nuevo campo con lo que queda por pagar
    const amountToPreFill = remaining > 0 ? remaining.toFixed(2) : '';
    setPayments(prev => [...prev, { id: Date.now(), amount: amountToPreFill, method: defaultMethod, reference: '' }]);
  };

  const handleUpdatePayment = (id, field, value) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleRemovePayment = (id) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const igtf = useMemo(() => {
    const foreignCurrencyAmount = payments
      .filter(p => p.method.includes('_usd'))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return foreignCurrencyAmount * 0.03;
  }, [payments]);

  const isSaveDisabled = useMemo(() => {
    if (payments.length === 0) return true;
    // Permitir una pequeña imprecisión para evitar problemas con decimales
    if (Math.abs(totalPaid - totalAmount) > 0.01) return true;
    // Validar que cada línea tenga método y monto
    if (payments.some(p => !p.method || !p.amount || Number(p.amount) <= 0)) return true;
    return false;
  }, [payments, totalPaid, totalAmount]);

  const handleSave = () => {
    // La validación principal ahora está en isSaveDisabled, pero mantenemos una alerta por si acaso.
    if (isSaveDisabled) {
      alert('El monto pagado no coincide con el total de la orden o faltan datos en las líneas de pago.');
      return;
    }
    onSave({ payments, igtf });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Registro de Pago Mixto</DialogTitle>
          <DialogDescription>
            Añada o ajuste las formas de pago para cubrir el total de la orden: ${totalAmount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {payments.map((line) => (
            <div key={line.id} className="flex items-center gap-2 p-2 border rounded-lg">
              <Select value={line.method} onValueChange={(v) => handleUpdatePayment(line.id, 'method', v)} disabled={contextLoading}>
                <SelectTrigger><SelectValue placeholder="Método" /></SelectTrigger>
                <SelectContent>{paymentMethods.map(m => m.id !== 'pago_mixto' && <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Monto" value={line.amount} onChange={(e) => handleUpdatePayment(line.id, 'amount', e.target.value)} />
              <Input placeholder="Referencia" value={line.reference} onChange={(e) => handleUpdatePayment(line.id, 'reference', e.target.value)} />
              <Button variant="ghost" size="icon" onClick={() => handleRemovePayment(line.id)}><X className="h-4 w-4 text-red-500" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAddPayment}><Plus className="h-4 w-4 mr-2" />Añadir línea de pago</Button>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between font-semibold"><span>Total Pagado:</span><span>${totalPaid.toFixed(2)}</span></div>
          <div className={`flex justify-between font-semibold ${remaining < -0.01 ? 'text-orange-500' : (remaining > 0.01 ? 'text-blue-500' : 'text-green-600')}`}>
             <span>Restante:</span>
             <span>${remaining.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-orange-600"><span>IGTF (3% sobre monto en divisa):</span><span>${igtf.toFixed(2)}</span></div>
           {isSaveDisabled && payments.length > 0 && (
            <p className="text-xs text-red-600 text-center pt-2">
              El total pagado debe ser exactamente ${totalAmount.toFixed(2)}. Ajuste los montos para poder guardar.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button></DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaveDisabled}>Guardar Pagos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
