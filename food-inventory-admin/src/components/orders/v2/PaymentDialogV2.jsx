import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmContext } from '@/context/CrmContext';
import { fetchApi } from '@/lib/api';
import { X, Plus } from 'lucide-react';

export function PaymentDialogV2({ isOpen, onClose, order, onPaymentSuccess }) {
  const { paymentMethods, loading: contextLoading } = useCrmContext();

  const [paymentMode, setPaymentMode] = useState('single');
  const [singlePayment, setSinglePayment] = useState({ amount: 0, method: '', reference: '' });
  const [mixedPayments, setMixedPayments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingAmount = useMemo(() => {
    if (!order) return 0;
    return (order.totalAmount || 0) - (order.paidAmount || 0);
  }, [order]);

  // Effect to reset state when a new order is passed in
  useEffect(() => {
    if (order && isOpen) {
      const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || '';
      setPaymentMode('single');
      setSinglePayment({ 
        amount: remainingAmount > 0 ? remainingAmount : 0,
        method: defaultMethod,
        reference: '' 
      });
      setMixedPayments([]);
    }
  }, [order, isOpen, paymentMethods, remainingAmount]);

  const handleAddPaymentLine = () => {
    const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || '';
    setMixedPayments(prev => [...prev, { id: Date.now(), amount: '', method: defaultMethod, reference: '' }]);
  };

  const handleUpdatePaymentLine = (id, field, value) => {
    setMixedPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleRemovePaymentLine = (id) => {
    setMixedPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!order) return;

    let paymentsPayload = [];
    const paymentDate = new Date().toISOString();

    if (paymentMode === 'single') {
      if (Number(singlePayment.amount) <= 0 || !singlePayment.method) {
        alert('El monto debe ser mayor a cero y debe seleccionar un método.');
        return;
      }
      paymentsPayload.push({ 
        amount: Number(singlePayment.amount), 
        method: singlePayment.method, 
        date: paymentDate, 
        reference: singlePayment.reference 
      });
    } else {
      if (mixedPayments.length === 0) {
        alert('Añada al menos una línea de pago.');
        return;
      }
      if (mixedPayments.some(p => Number(p.amount) <= 0 || !p.method)) {
        alert('Todos los montos deben ser mayores a cero y debe seleccionar un método.');
        return;
      }
      paymentsPayload = mixedPayments.map(p => ({ 
        amount: Number(p.amount), 
        method: p.method, 
        date: paymentDate, 
        reference: p.reference 
      }));
    }

    try {
      setIsSubmitting(true);
      // Corrected endpoint based on backend controller
      await fetchApi(`/orders/${order._id}/payments`, { 
        method: 'POST', 
        body: JSON.stringify({ payments: paymentsPayload }) 
      });
      alert('Pago registrado con éxito');
      onPaymentSuccess();
    } catch (error) {
      console.error("Error submitting payment:", error);
      alert(`Error al registrar el pago: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMixedPayment = useMemo(() => 
    mixedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0), 
  [mixedPayments]);

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Orden: {order.orderNumber} | Balance Pendiente: ${remainingAmount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <Select value={paymentMode} onValueChange={setPaymentMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Pago Único</SelectItem>
              <SelectItem value="mixed">Pago Mixto</SelectItem>
            </SelectContent>
          </Select>

          {paymentMode === 'single' ? (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="single-method" className="text-right">Método</Label>
                <Select value={singlePayment.method} onValueChange={(v) => setSinglePayment(p => ({...p, method: v}))} disabled={contextLoading}>
                    <SelectTrigger id="single-method" className="col-span-3"><SelectValue placeholder="Seleccione un método" /></SelectTrigger>
                    <SelectContent>{paymentMethods.map(m => m.id !== 'pago_mixto' && <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="single-amount" className="text-right">Monto</Label>
                <Input id="single-amount" type="number" value={singlePayment.amount} onChange={(e) => setSinglePayment(p => ({...p, amount: e.target.value}))} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="single-reference" className="text-right">Referencia</Label>
                <Input id="single-reference" value={singlePayment.reference} onChange={(e) => setSinglePayment(p => ({...p, reference: e.target.value}))} className="col-span-3" />
              </div>
            </div>
          ) : (
            <div className="p-4 border rounded-lg space-y-2">
              {mixedPayments.map((line, index) => (
                <div key={line.id} className="flex items-center gap-2">
                  <Select value={line.method} onValueChange={(v) => handleUpdatePaymentLine(line.id, 'method', v)} disabled={contextLoading}>
                    <SelectTrigger><SelectValue placeholder="Método" /></SelectTrigger>
                    <SelectContent>{paymentMethods.map(m => m.id !== 'pago_mixto' && <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="Monto" value={line.amount} onChange={(e) => handleUpdatePaymentLine(line.id, 'amount', e.target.value)} />
                  <Input placeholder="Referencia" value={line.reference} onChange={(e) => handleUpdatePaymentLine(line.id, 'reference', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => handleRemovePaymentLine(line.id)}><X className="h-4 w-4 text-red-500" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddPaymentLine}><Plus className="h-4 w-4 mr-2" />Añadir línea</Button>
              <div className="text-right font-semibold pt-2 border-t mt-2">Total Mixto: ${totalMixedPayment.toFixed(2)}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button></DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Registrando...' : 'Registrar Pago'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}