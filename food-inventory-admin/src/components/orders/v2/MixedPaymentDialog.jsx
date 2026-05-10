import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmContext } from '@/context/CrmContext';
import { X, Plus, Calculator } from 'lucide-react';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCountryPlugin } from '@/country-plugins/CountryPluginContext';
import { isVesMethod } from '@/lib/currency-config';
import haptics from '@/lib/haptics';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';

export function MixedPaymentDialog({ isOpen, onClose, totalAmount, onSave }) {
  const { paymentMethods, loading: contextLoading } = useCrmContext();
  const { rate: bcvRate } = useExchangeRate();
  const plugin = useCountryPlugin();
  const primaryCurrency = plugin.currencyEngine.getPrimaryCurrency();
  const numberLocale = plugin.localeProvider.getNumberLocale();
  const [payments, setPayments] = useState([]);

  // Get IGTF label and rate from plugin
  const igtfMeta = (() => {
    const taxes = plugin.taxEngine.getTransactionTaxes({ paymentMethodId: 'efectivo_usd' });
    if (taxes[0]) return { label: `${taxes[0].type} (${taxes[0].rate}%)`, rate: taxes[0].rate / 100 };
    return { label: 'IGTF (3%)', rate: 0.03 };
  })();

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

  const igtf = useMemo(() => {
    const foreignCurrencyAmount = payments
      .filter(p => {
        const methodDef = paymentMethods.find(m => m.id === p.method);
        return methodDef?.igtfApplicable;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return foreignCurrencyAmount * igtfMeta.rate;
  }, [payments, paymentMethods, igtfMeta.rate]);

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
        <DialogHeader className="p-6 pb-3 border-b border-border/40">
          <DialogTitle className="text-[22px] font-extrabold tracking-tight leading-tight">Pago mixto</DialogTitle>
          <DialogDescription className="mt-1">
            <span className="block text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Total a cubrir</span>
            <span className="block text-[28px] sm:text-[32px] font-extrabold tabular-nums tracking-tight leading-none text-primary mt-1">
              <AnimatedNumber value={totalAmount} format={(n) => `$${n.toFixed(2)}`} duration={0.4} />
            </span>
            <span className="block text-[12px] text-muted-foreground/70 mt-1">
              Combina métodos de pago. Tasa BCV: {bcvRate ? `Bs ${bcvRate}` : 'Cargando…'}
            </span>
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
              <div
                key={line.id}
                className="p-3 space-y-2 bg-card"
                style={{
                  borderRadius: 'var(--mobile-radius-xl)',
                  boxShadow: 'var(--elevation-rest)',
                }}
              >
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
                  <Button variant="ghost" size="icon" onClick={() => { haptics.tap(); handleRemovePayment(line.id); }}><X className="h-4 w-4 text-destructive" /></Button>
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
                      <div className="p-2 bg-success/5 dark:bg-green-900/20 border border-success/30 rounded-md text-xs">
                        <p className="font-bold text-success dark:text-success flex items-center gap-2">
                          Vuelto: ${
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
                    <Calculator className="w-3 h-3 group-hover:text-info" />
                    <span>
                      Faltan: <span className="font-medium text-info group-hover:underline">${lineRemaining.toFixed(2)}</span>
                      <>
                        {' '}≈{' '}
                        <span className="font-medium text-success">{primaryCurrency.symbol} {lineRemainingBs.toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </>
                    </span>
                    <span className="ml-auto text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 font-medium">
                      USAR TOTAL →
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => { haptics.tap(); handleAddPayment(); }} className="w-full border-dashed"><Plus className="h-4 w-4 mr-2" />Añadir línea de pago</Button>
        </div>

        <div className="p-6 bg-muted/30 border-t mt-auto space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Total Orden:</span><span className="tabular-nums">${totalAmount.toFixed(2)}</span></div>
            {igtf > 0 && (
              <div className="flex justify-between text-warning"><span>+ {igtfMeta.label}:</span><span className="tabular-nums">${igtf.toFixed(2)}</span></div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Total a pagar:</span><span className="tabular-nums">${totalRequired.toFixed(2)}</span></div>

            <div className="flex justify-between font-medium"><span>Pagado:</span><span className="tabular-nums">${totalPaid.toFixed(2)}</span></div>

            <div
              className="flex items-end justify-between mt-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--glass-subtle)' }}
            >
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold leading-none mb-1">
                {Math.abs(remaining) <= 0.01 ? 'Listo para guardar' : 'Restante'}
              </span>
              <div className="text-right">
                <div className={`text-[28px] sm:text-[32px] font-extrabold tabular-nums tracking-tight leading-none ${remaining < -0.01 ? 'text-destructive' : (remaining > 0.01 ? 'text-info' : 'text-success')}`}>
                  ${remaining.toFixed(2)}
                </div>
                {remaining !== 0 && bcvRate > 0 && (
                  <div className="text-[11px] font-normal text-muted-foreground tabular-nums mt-1">
                    ≈ {primaryCurrency.symbol} {(remaining * bcvRate).toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isSaveDisabled && payments.length > 0 && Math.abs(remaining) > 0.01 && (
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded-xl text-center">
              {remaining > 0 ? 'Falta cubrir el monto total.' : 'El monto pagado excede el total.'}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button></DialogClose>
            <Button
              type="button"
              onClick={() => { haptics.select(); handleSave(); }}
              disabled={isSaveDisabled}
              className="text-primary-foreground border-0 disabled:opacity-50"
              style={{
                background: isSaveDisabled ? undefined : 'var(--gradient-primary)',
                boxShadow: isSaveDisabled ? undefined : '0 4px 14px oklch(0.62 0.22 268 / 0.3)',
              }}
            >
              Guardar pagos
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
