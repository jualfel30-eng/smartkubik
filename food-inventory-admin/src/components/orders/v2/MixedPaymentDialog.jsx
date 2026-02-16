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
    if (isOpen) {
      if (payments.length === 0) {
        const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || '';
        setPayments([{
          id: Date.now(),
          amount: totalAmount.toFixed(2),
          method: defaultMethod,
          reference: ''
        }]);
      }
    } else {
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

  const totalRequired = totalAmount + igtf;

  const totalPaid = useMemo(() =>
    payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments]);

  const remaining = totalRequired - totalPaid;

  const handleAddPayment = () => {
    const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || '';
    const amountToPreFill = remaining > 0 ? remaining.toFixed(2) : '';
    setPayments(prev => [...prev, { id: Date.now(), amount: amountToPreFill, method: defaultMethod, reference: '' }]);
  };

  const handleUpdatePayment = (id, field, value) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleRemovePayment = (id) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const isSaveDisabled = useMemo(() => {
    if (payments.length === 0) return true;
    if (Math.abs(remaining) > 0.01) return true;
    if (payments.some(p => !p.method || !p.amount || Number(p.amount) <= 0)) return true;
    return false;
  }, [payments, totalPaid, totalAmount]);

  const handleSave = () => {
    if (isSaveDisabled) {
      alert('El monto pagado no coincide con el total de la orden o faltan datos en las líneas de pago.');
      return;
    }
    onSave({ payments, igtf });
    onClose();
  };

  const exchangeRateConfig = plugin.currencyEngine.getExchangeRateConfig();
  const rateLabel = exchangeRateConfig?.source
    ? `Tasa ${exchangeRateConfig.source}: ${primaryCurrency.symbol} ${bcvRate ?? '...'}`
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] flex flex-col h-[85vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Registro de Pago Mixto</DialogTitle>
          <DialogDescription>
            Añada o ajuste las formas de pago.{rateLabel ? ` ${rateLabel}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3">
          {payments.map((line) => {
            const otherPaymentsTotal = payments
              .filter(p => p.id !== line.id)
              .reduce((sum, p) => sum + Number(p.amount || 0), 0);

            const lineRemaining = remaining + (Number(line.amount) || 0);
            const lineRemainingPrimary = lineRemaining * (bcvRate || 0);

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

                {lineRemaining > 0.01 && bcvRate > 0 && (
                  <div
                    className="text-xs text-muted-foreground pl-1 flex items-center gap-1 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors group"
                    onClick={() => handleUpdatePayment(line.id, 'amount', lineRemaining.toFixed(2))}
                    title="Clic para completar el monto restante"
                  >
                    <Calculator className="w-3 h-3 group-hover:text-blue-600" />
                    <span>
                      Faltan: <span className="font-medium text-blue-600 group-hover:underline">${lineRemaining.toFixed(2)}</span>
                      <>
                        {' '}≈{' '}
                        <span className="font-medium text-green-600">{primaryCurrency.symbol} {lineRemainingPrimary.toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
          <Button variant="outline" size="sm" onClick={handleAddPayment} className="w-full border-dashed"><Plus className="h-4 w-4 mr-2" />Añadir línea de pago</Button>
        </div>

        <div className="p-6 bg-muted/30 border-t mt-auto space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Total Orden:</span><span>${totalAmount.toFixed(2)}</span></div>
            {igtf > 0 && (
              <div className="flex justify-between text-orange-600"><span>+ {igtfMeta.label}:</span><span>${igtf.toFixed(2)}</span></div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Total a Pagar:</span><span>${totalRequired.toFixed(2)}</span></div>

            <div className="flex justify-between font-medium"><span>Pagado:</span><span>${totalPaid.toFixed(2)}</span></div>

            <div className={`flex justify-between font-bold text-lg ${remaining < -0.01 ? 'text-red-500' : (remaining > 0.01 ? 'text-blue-600' : 'text-green-600')}`}>
              <span>Restante:</span>
              <div className="text-right">
                <div>${remaining.toFixed(2)}</div>
                {remaining !== 0 && bcvRate > 0 && (
                  <div className="text-sm font-normal text-muted-foreground">
                    ≈ {primaryCurrency.symbol} {(remaining * bcvRate).toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
