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
    if (isOpen) {
      setPayments([]);
    }
  }, [isOpen]);

  const handleAddPayment = () => {
    const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || '';
    setPayments(prev => [...prev, { id: Date.now(), amount: '', method: defaultMethod, reference: '' }]);
  };

  const handleUpdatePayment = (id, field, value) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleRemovePayment = (id) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const totalPaid = useMemo(() => 
    payments.reduce((sum, p) => sum + Number(p.amount || 0), 0), 
  [payments]);

  const remaining = totalAmount - totalPaid;

  const igtf = useMemo(() => {
    const foreignCurrencyAmount = payments
      .filter(p => p.method.includes('_usd'))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return foreignCurrencyAmount * 0.03;
  }, [payments]);

  const handleSave = () => {
    if (payments.some(p => !p.method || Number(p.amount) <= 0)) {
      alert('Todos los pagos deben tener un método y un monto mayor a cero.');
      return;
    }
    if (Math.abs(totalPaid - totalAmount) > 0.01) { // Allow for small float inaccuracies
      alert('El monto pagado no coincide con el total de la orden.');
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
            Añada las formas de pago para cubrir el total de la orden: ${totalAmount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {payments.map((line, index) => (
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
          <div className={`flex justify-between font-semibold ${remaining < 0 ? 'text-orange-500' : ''}`}><span>Restante:</span><span>${remaining.toFixed(2)}</span></div>
          <div className="flex justify-between text-orange-600"><span>IGTF (3% sobre monto en divisa):</span><span>${igtf.toFixed(2)}</span></div>
        </div>

        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button></DialogClose>
          <Button type="button" onClick={handleSave} disabled={payments.length === 0}>Guardar Pagos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
