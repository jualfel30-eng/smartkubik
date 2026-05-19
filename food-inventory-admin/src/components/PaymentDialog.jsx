import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, CreditCard } from 'lucide-react';
import { createPayment, fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { PAYMENT_METHODS, isVesMethod, mapPaymentMethodToName } from '../lib/payment-methods';
import { formatCurrency } from '@/lib/currency-utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

const LAST_METHOD_KEY = 'ap_last_payment_method';

export const PaymentDialog = ({ isOpen, onClose, payable, onPaymentSuccess }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(() => localStorage.getItem(LAST_METHOD_KEY) || 'transferencia_usd');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const remainingAmount = useMemo(() => {
    if (!payable) return 0;
    return (payable.totalAmount || 0) - (payable.paidAmount || 0);
  }, [payable]);

  const remainingAmountVes = useMemo(() => {
    if (!payable) return 0;
    return (payable.totalAmountVes || 0) - (payable.paidAmountVes || 0);
  }, [payable]);

  useEffect(() => {
    if (!isOpen) return;
    const loadExchangeRate = async () => {
      try {
        const data = await fetchApi('/exchange-rate/bcv');
        setExchangeRate(data.rate);
      } catch {
        console.error('No se pudo cargar la tasa BCV');
      }
    };
    const loadBankAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const data = await fetchApi('/bank-accounts');
        setBankAccounts(data || []);
      } catch {
        console.error('No se pudieron cargar las cuentas bancarias');
      } finally {
        setLoadingAccounts(false);
      }
    };
    loadExchangeRate();
    loadBankAccounts();
  }, [isOpen]);

  useEffect(() => {
    if (payable && isOpen) {
      setAmount(remainingAmount);
      setError('');
      setDetailsOpen(false);
      setReferenceNumber('');
      setBankAccountId('');
    }
  }, [payable, isOpen, remainingAmount]);

  const filteredBankAccounts = useMemo(() => {
    if (!paymentMethod) return [];
    const methodName = mapPaymentMethodToName(paymentMethod);
    return bankAccounts.filter(acc =>
      acc.acceptedPaymentMethods?.includes(methodName)
    );
  }, [bankAccounts, paymentMethod]);

  const handleMethodChange = (value) => {
    setPaymentMethod(value);
    setBankAccountId('');
    localStorage.setItem(LAST_METHOD_KEY, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (amount <= 0) { setError('El monto debe ser mayor a cero.'); return; }

    const isVes = isVesMethod(paymentMethod);
    const rate = exchangeRate || (payable.totalAmountVes / payable.totalAmount) || 0;

    const payload = {
      paymentType: 'payable',
      payableId: payable._id,
      amount: Number(amount),
      amountVes: Number(amount) * rate,
      exchangeRate: rate,
      currency: isVes ? 'VES' : 'USD',
      date,
      method: paymentMethod,
      reference: referenceNumber,
    };
    if (bankAccountId) payload.bankAccountId = bankAccountId;

    setSubmitting(true);
    try {
      await createPayment(payload);
      const remaining = remainingAmount - Number(amount);
      toast.success(`Pago de ${formatCurrency(Number(amount))} registrado`, {
        description: remaining > 0.01
          ? `${payable.payeeName} — Saldo restante: ${formatCurrency(remaining)}`
          : `${payable.payeeName} — Factura completamente pagada ✓`,
      });
      onPaymentSuccess();
    } catch (err) {
      toast.error('Error al registrar el pago', { description: err.message || 'Ocurrió un error inesperado.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!payable) return null;

  const isVes = isVesMethod(paymentMethod);
  const displayMax = isVes ? remainingAmountVes : remainingAmount;
  const ctaLabel = submitting
    ? 'Registrando...'
    : `Registrar pago · ${isVes ? `Bs ${Number(amount).toFixed(2)}` : formatCurrency(Number(amount))}`;

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5 pt-2">
      {/* MONTO */}
      <div className="space-y-1.5">
        <Label htmlFor="amount">Monto a pagar <span className="text-destructive">*</span></Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={displayMax}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="text-lg font-semibold"
        />
        <p className="text-xs text-muted-foreground">
          Saldo pendiente: {isVes ? `Bs ${remainingAmountVes.toFixed(2)}` : formatCurrency(remainingAmount)}
          {' · '}
          {isVes ? `≈ ${formatCurrency(remainingAmount)}` : `≈ Bs ${remainingAmountVes.toFixed(2)}`}
        </p>
      </div>

      {/* MÉTODO */}
      <div className="space-y-1.5">
        <Label>Método de pago <span className="text-destructive">*</span></Label>
        <Select value={paymentMethod} onValueChange={handleMethodChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar método" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* FECHA */}
      <div className="space-y-1.5">
        <Label htmlFor="pay-date">Fecha</Label>
        <Input id="pay-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {/* DETALLES OPCIONALES (colapsable) */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left">
            <ChevronDown className={cn('h-4 w-4 transition-transform', detailsOpen && 'rotate-180')} />
            {detailsOpen ? 'Ocultar detalles opcionales' : '+ Referencia · Cuenta bancaria'}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="reference">Referencia / N° transacción</Label>
            <Input
              id="reference"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              placeholder="Ej: 00123456"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cuenta bancaria</Label>
            <Select
              value={bankAccountId}
              onValueChange={setBankAccountId}
              disabled={loadingAccounts || filteredBankAccounts.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingAccounts ? 'Cargando...' :
                  filteredBankAccounts.length === 0 ? 'No hay cuentas para este método' :
                  'Seleccionar cuenta (opcional)'
                } />
              </SelectTrigger>
              <SelectContent>
                {filteredBankAccounts.map(acc => (
                  <SelectItem key={acc._id} value={acc._id}>
                    {acc.accountName} — {acc.bankName} ({acc.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-[2] gap-2" disabled={submitting}>
          <CreditCard className="h-4 w-4" />
          {ctaLabel}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-4 max-h-[92vh] overflow-y-auto">
          <SheetHeader className="mb-1">
            <SheetTitle>Pagar — {payable.payeeName}</SheetTitle>
            <SheetDescription>
              Saldo: {formatCurrency(remainingAmount)}
              {remainingAmountVes > 0 && ` / Bs ${remainingAmountVes.toFixed(2)}`}
            </SheetDescription>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            {payable.payeeName} · Saldo: {formatCurrency(remainingAmount)}
            {remainingAmountVes > 0 && ` / Bs ${remainingAmountVes.toFixed(2)}`}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
