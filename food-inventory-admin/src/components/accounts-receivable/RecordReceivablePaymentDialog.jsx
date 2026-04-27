import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { createPayment, fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { PAYMENT_METHODS, isVesMethod, mapPaymentMethodToName } from '@/lib/payment-methods';
import { formatCurrency } from '@/lib/currency-utils';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';

export default function RecordReceivablePaymentDialog({ isOpen, onClose, receivable, onPaymentSuccess }) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('transferencia_usd');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [error, setError] = useState('');

  const remainingAmount = useMemo(() => {
    if (!receivable) return 0;
    return Number(receivable.balance) || ((receivable.totalAmount || 0) - (receivable.paidAmount || 0));
  }, [receivable]);

  useEffect(() => {
    if (isOpen && receivable) {
      setAmount(remainingAmount);
      setError('');
      setReferenceNumber('');
      setBankAccountId('');
    }
  }, [isOpen, receivable, remainingAmount]);

  useEffect(() => {
    const loadExchangeRate = async () => {
      try {
        const data = await fetchApi('/exchange-rate/bcv');
        setExchangeRate(data.rate);
      } catch (error) {
        console.error('Error loading exchange rate:', error);
      }
    };
    if (isOpen) loadExchangeRate();
  }, [isOpen]);

  useEffect(() => {
    const loadBankAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const data = await fetchApi('/bank-accounts');
        setBankAccounts(data || []);
      } catch (error) {
        console.error('Error loading bank accounts:', error);
      } finally {
        setLoadingAccounts(false);
      }
    };
    if (isOpen) loadBankAccounts();
  }, [isOpen]);

  const filteredBankAccounts = useMemo(() => {
    if (!paymentMethod) return [];
    const methodName = mapPaymentMethodToName(paymentMethod);
    return bankAccounts.filter(account =>
      account.acceptedPaymentMethods?.includes(methodName)
    );
  }, [bankAccounts, paymentMethod]);

  if (!receivable) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (amount <= 0) {
      setError('El monto debe ser mayor a cero.');
      return;
    }

    const isVes = isVesMethod(paymentMethod);
    const rate = exchangeRate || 1;

    const payload = {
      paymentType: 'sale',
      orderId: receivable.orderId || receivable._id,
      amount: Number(amount),
      amountVes: isVes ? Number(amount) : Number(amount) * rate,
      exchangeRate: rate,
      currency: isVes ? 'VES' : 'USD',
      date,
      method: paymentMethod,
      reference: referenceNumber,
    };

    if (bankAccountId) {
      payload.bankAccountId = bankAccountId;
    }

    try {
      await createPayment(payload);
      toast.success(`Cobro registrado — ${formatCurrency(Number(amount))} recibido de ${receivable.customerName}`);
      onPaymentSuccess();
    } catch (err) {
      toast.error('Error al registrar el cobro', {
        description: err.message || 'Ocurrió un error inesperado.',
      });
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Cobro</DialogTitle>
          <DialogDescription>
            Orden #{receivable.orderNumber} | Cliente: {receivable.customerName} | Saldo:{' '}
            <AnimatedNumber value={remainingAmount} format={(n) => formatCurrency(n)} className="inline font-semibold" />
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">Método de Pago <span className="text-destructive">*</span></Label>
              <Select value={paymentMethod} onValueChange={(value) => { setPaymentMethod(value); setBankAccountId(''); }}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione método" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bankAccount" className="text-right">Cuenta Bancaria</Label>
              <Select
                value={bankAccountId}
                onValueChange={setBankAccountId}
                disabled={loadingAccounts || !paymentMethod || filteredBankAccounts.length === 0}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={
                    loadingAccounts ? "Cargando..." :
                    !paymentMethod ? "Seleccione método primero" :
                    filteredBankAccounts.length === 0 ? "No hay cuentas para este método" :
                    "Seleccione cuenta (opcional)"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredBankAccounts.map(account => (
                    <SelectItem key={account._id} value={account._id}>
                      {account.accountName} - {account.bankName} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Monto <span className="text-destructive">*</span></Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={remainingAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Saldo pendiente: {formatCurrency(remainingAmount)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reference" className="text-right">Referencia</Label>
              <Input
                id="reference"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="col-span-3"
                placeholder="Opcional"
              />
            </div>

            {error && <p className="text-destructive text-sm col-span-4 text-center">{error}</p>}
            <p className="text-xs text-muted-foreground"><span className="text-destructive">*</span> Campo obligatorio</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Registrar Cobro</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
