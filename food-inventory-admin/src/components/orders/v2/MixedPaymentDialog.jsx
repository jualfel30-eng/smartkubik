import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmContext } from '@/context/CrmContext';
import { X, Plus, Calculator } from 'lucide-react';
import { useExchangeRate } from '@/hooks/useExchangeRate';

export function MixedPaymentDialog({ isOpen, onClose, totalAmount, onSave }) {
  const { paymentMethods, loading: contextLoading } = useCrmContext();
  const { rate: bcvRate } = useExchangeRate();
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

  /* 
     IGTF Calculation Logic:
     We need to calculate IGTF dynamically to know the REAL total required.
     IGTF = 3% of payments made in foreign currency (IGTF applicable methods).
  */
  const igtf = useMemo(() => {
    const foreignCurrencyAmount = payments
      .filter(p => {
        const methodDef = paymentMethods.find(m => m.id === p.method);
        return methodDef?.igtfApplicable;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return foreignCurrencyAmount * 0.03;
  }, [payments, paymentMethods]);

  // The total amount the customer ACTUALLY needs to pay is Original Total + IGTF
  const totalRequired = totalAmount + igtf;

  const totalPaid = useMemo(() =>
    payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments]);

  const remaining = totalRequired - totalPaid;

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

  /* igtf calculation moved up */

  const isSaveDisabled = useMemo(() => {
    if (payments.length === 0) return true;
    // Permitir una pequeña imprecisión para evitar problemas con decimales
    if (Math.abs(remaining) > 0.01) return true;
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
      <DialogContent className="sm:max-w-[700px] flex flex-col h-[85vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Registro de Pago Mixto</DialogTitle>
          <DialogDescription>
            Añada o ajuste las formas de pago. Tasa BCV: {bcvRate ? `Bs ${bcvRate}` : 'Cargando...'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3">
          {payments.map((line) => {
            // Calculate remaining specifically for this line's context
            // If I am editing this line, how much is left to reach the TotalRequired considering OTHER payments?
            const otherPaymentsTotal = payments
              .filter(p => p.id !== line.id)
              .reduce((sum, p) => sum + Number(p.amount || 0), 0);

            // Re-calculate IGTF based on current state (it's already done in the hook above, but we rely on general 'remaining')
            // Actually, 'remaining' var captures globally what is left.
            // If I want to fill THIS line to complete the order:
            // MyTarget = TotalRequired - OtherPayments. 
            // BUT TotalRequired changes if I change MY amount (because of IGTF).
            // This circular dependency is tricky. 
            // For simple UX, we show what is currently 'remaining' + currentAmount as the "Target" for this field to close the deal.
            // Or simpler: Just show the GLOBAL remaining current value as a hint of what's missing.

            const lineRemaining = remaining + (Number(line.amount) || 0); // Logic: if I clear this field, how much is pending?
            const lineRemainingBs = lineRemaining * (bcvRate || 0);

            return (
              <div key={line.id} className="p-3 border rounded-lg space-y-2 bg-card">
                <div className="flex items-center gap-2">
                  <Select value={line.method} onValueChange={(v) => handleUpdatePayment(line.id, 'method', v)} disabled={contextLoading}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Método" /></SelectTrigger>
                    <SelectContent>{paymentMethods.map(m => m.id !== 'pago_mixto' && <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex-1 space-y-1">
                    <Input
                      type="number"
                      placeholder="Monto ($)"
                      value={line.amount}
                      onChange={(e) => handleUpdatePayment(line.id, 'amount', e.target.value)}
                      className={remaining < -0.01 ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                  </div>
                  <Input className="w-[150px]" placeholder="Referencia" value={line.reference} onChange={(e) => handleUpdatePayment(line.id, 'reference', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => handleRemovePayment(line.id)}><X className="h-4 w-4 text-red-500" /></Button>
                </div>

                {/* Cash Tender Input - Only for cash payments */}
                {(line.method?.toLowerCase().includes('efectivo') || line.method?.toLowerCase().includes('cash')) && (
                  <div className="mt-2 pl-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium w-24">Monto Recibido:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={isVesMethod(line.method) ? "Ej: 100.00" : "Ej: 50.00"}
                        value={line.amountTendered || ''}
                        onChange={(e) => handleUpdatePayment(line.id, 'amountTendered', e.target.value)}
                        className="h-8 w-40"
                      />
                    </div>
                    {/* Show change calculation */}
                    {line.amountTendered && Number(line.amount) > 0 && (
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-xs">
                        <p className="font-bold text-green-700 dark:text-green-300 flex items-center gap-2">
                          Vuelto: {isVesMethod(line.method) ? 'Bs' : '$'} {
                            (parseFloat(line.amountTendered) - Number(line.amount)).toFixed(2)
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Helper Text for VES conversion */}
                {lineRemaining > 0.01 && (
                  <div
                    className="text-xs text-muted-foreground pl-1 flex items-center gap-1 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors group"
                    onClick={() => handleUpdatePayment(line.id, 'amount', lineRemaining.toFixed(2))}
                    title="Clic para completar el monto restante"
                  >
                    <Calculator className="w-3 h-3 group-hover:text-blue-600" />
                    <span>
                      Faltan: <span className="font-medium text-blue-600 group-hover:underline">${lineRemaining.toFixed(2)}</span>
                      {bcvRate > 0 && (
                        <>
                          {' '}≈{' '}
                          <span className="font-medium text-green-600">Bs {lineRemainingBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </>
                      )}
                    </span>
                    <span className="ml-auto text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 font-medium">
                      USAR TOTAL →
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={handleAddPayment} className="w-full border-dashed"><Plus className="h-4 w-4 mr-2" />Añadir línea de pago</Button>
        </div>

        <div className="p-6 bg-muted/30 border-t mt-auto space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Total Orden:</span><span>${totalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-orange-600"><span>+ IGTF (3%):</span><span>${igtf.toFixed(2)}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Total a Pagar:</span><span>${totalRequired.toFixed(2)}</span></div>

            <div className="flex justify-between font-medium"><span>Pagado:</span><span>${totalPaid.toFixed(2)}</span></div>

            <div className={`flex justify-between font-bold text-lg ${remaining < -0.01 ? 'text-red-500' : (remaining > 0.01 ? 'text-blue-600' : 'text-green-600')}`}>
              <span>Restante:</span>
              <div className="text-right">
                <div>${remaining.toFixed(2)}</div>
                {remaining !== 0 && bcvRate > 0 && (
                  <div className="text-sm font-normal text-muted-foreground">
                    ≈ Bs {(remaining * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isSaveDisabled && payments.length > 0 && Math.abs(remaining) > 0.01 && (
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded text-center">
              {remaining > 0 ? 'Falta cubrir el monto total.' : 'El monto pagado excede el total.'}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button></DialogClose>
            <Button type="button" onClick={handleSave} disabled={isSaveDisabled}>Guardar Pagos</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
