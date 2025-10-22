import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmContext } from '@/context/CrmContext';
import { useAccountingContext } from '@/context/AccountingContext';
import { fetchApi } from '@/lib/api';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

export function PaymentDialogV2({ isOpen, onClose, order, onPaymentSuccess }) {
  const { paymentMethods, loading: contextLoading } = useCrmContext();
  const { triggerRefresh } = useAccountingContext();

  const [paymentMode, setPaymentMode] = useState('single');
  const [singlePayment, setSinglePayment] = useState({ method: '', reference: '', bankAccountId: '' });
  const [mixedPayments, setMixedPayments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(false);

  const remainingAmount = useMemo(() => {
    if (!order) return 0;
    return (order.totalAmount || 0) - (order.paidAmount || 0);
  }, [order]);

  const remainingAmountVes = useMemo(() => {
    if (!order) return 0;
    return (order.totalAmountVes || 0) - (order.paidAmountVes || 0);
  }, [order]);

  // Effect to reset state when a new order is passed in
  useEffect(() => {
    if (order && isOpen) {
      const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || '';
      setPaymentMode('single');
      setSinglePayment({
        method: defaultMethod,
        reference: '',
        bankAccountId: ''
      });
      setMixedPayments([]);
    }
  }, [order, isOpen, paymentMethods]);

  // Initialize mixed payment lines when switching to mixed mode
  useEffect(() => {
    if (paymentMode === 'mixed' && mixedPayments.length === 0) {
      const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || '';
      // Inicializar con 2 líneas vacías
      setMixedPayments([
        { id: Date.now(), amount: '', method: defaultMethod, reference: '', bankAccountId: '' },
        { id: Date.now() + 1, amount: '', method: defaultMethod, reference: '', bankAccountId: '' }
      ]);
    }
  }, [paymentMode, mixedPayments.length, paymentMethods]);

  // Fetch bank accounts and exchange rate when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Fetch bank accounts
      setLoadingAccounts(true);
      fetchApi('/bank-accounts')
        .then(data => {
          setBankAccounts(data || []);
        })
        .catch(err => {
          console.error('Error loading bank accounts:', err);
          toast.error('Error al cargar las cuentas bancarias');
          setBankAccounts([]);
        })
        .finally(() => {
          setLoadingAccounts(false);
        });

      // Fetch exchange rate
      setLoadingRate(true);
      fetchApi('/exchange-rate/bcv')
        .then(data => {
          if (data && data.rate) {
            setExchangeRate(data.rate);
          }
        })
        .catch(err => {
          console.error('Error loading exchange rate:', err);
          // No mostramos error al usuario, solo usaremos el valor de la orden
        })
        .finally(() => {
          setLoadingRate(false);
        });
    }
  }, [isOpen]);

  // Map payment method IDs to the names stored in bank accounts
  const mapPaymentMethodToName = (methodId) => {
    const mapping = {
      'efectivo_usd': 'Efectivo',
      'efectivo_ves': 'Efectivo',
      'transferencia_usd': 'Transferencia',
      'transferencia_ves': 'Transferencia',
      'zelle_usd': 'Zelle',
      'pago_movil_ves': 'Pagomóvil',
      'pos_ves': 'POS',
      'tarjeta_ves': 'Tarjeta de Crédito',
    };
    return mapping[methodId] || methodId;
  };

  // Check if payment method is in VES
  const isVesMethod = (methodId) => {
    return methodId && methodId.includes('_ves');
  };

  // Filter bank accounts by selected payment method
  const filteredBankAccounts = useMemo(() => {
    if (!singlePayment.method) return [];
    const methodName = mapPaymentMethodToName(singlePayment.method);
    return bankAccounts.filter(account =>
      account.acceptedPaymentMethods &&
      account.acceptedPaymentMethods.some(pm =>
        pm === methodName || pm.toLowerCase().includes(methodName.toLowerCase())
      )
    );
  }, [bankAccounts, singlePayment.method]);

  const singleMethodHasBankAccounts = filteredBankAccounts.length > 0;

  const handleAddPaymentLine = () => {
    const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || '';
    setMixedPayments(prev => [...prev, {
      id: Date.now(),
      amount: '',
      method: defaultMethod,
      reference: '',
      bankAccountId: ''
    }]);
  };

  const handleUpdatePaymentLine = (id, field, value) => {
    setMixedPayments(prev => prev.map(p => {
      if (p.id === id) {
        // Si cambia el método, resetear la cuenta bancaria
        if (field === 'method') {
          return { ...p, [field]: value, bankAccountId: '' };
        }
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleRemovePaymentLine = (id) => {
    setMixedPayments(prev => prev.filter(p => p.id !== id));
  };

  // Calculate totals for mixed payments
  const mixedPaymentTotals = useMemo(() => {
    if (paymentMode !== 'mixed') return { subtotalUSD: 0, igtf: 0, totalUSD: 0, totalVES: 0 };

    let subtotalUSD = 0;
    let igtf = 0;
    let totalVES = 0;

    const rate = exchangeRate || (order?.totalAmountVes / order?.totalAmount) || 1;

    mixedPayments.forEach(payment => {
      const amount = Number(payment.amount) || 0;
      const isVes = isVesMethod(payment.method);

      subtotalUSD += amount;

      if (isVes) {
        // Método VES: calcular equivalente en VES
        totalVES += amount * rate;
      } else {
        // Método USD: aplicar IGTF
        const lineIgtf = amount * 0.03;
        igtf += lineIgtf;
        totalVES += (amount + lineIgtf) * rate;
      }
    });

    const totalUSD = subtotalUSD + igtf;

    return { subtotalUSD, igtf, totalUSD, totalVES };
  }, [mixedPayments, paymentMode, exchangeRate, order]);

  const handleSubmit = async () => {
    if (!order) return;

    let paymentsPayload = [];
    const paymentDate = new Date().toISOString();

    if (paymentMode === 'single') {
      if (!singlePayment.method) {
        toast.error('Debe seleccionar un método de pago.');
        return;
      }
      const isVes = isVesMethod(singlePayment.method);
      const rate = exchangeRate || (order?.totalAmountVes / order?.totalAmount) || 0;

      const singlePaymentPayload = {
        amount: remainingAmount,
        amountVes: remainingAmountVes,
        exchangeRate: rate,
        currency: isVes ? 'VES' : 'USD',
        method: singlePayment.method,
        date: paymentDate,
        reference: singlePayment.reference,
        isConfirmed: true,
      };

      if (singlePayment.bankAccountId) {
        singlePaymentPayload.bankAccountId = singlePayment.bankAccountId;
      }

      paymentsPayload.push(singlePaymentPayload);
    } else {
      if (mixedPayments.length === 0) {
        toast.error('Añada al menos una línea de pago.');
        return;
      }
      if (mixedPayments.some(p => Number(p.amount) <= 0 || !p.method)) {
        toast.error('Todos los montos deben ser mayores a cero y debe seleccionar un método.');
        return;
      }

      const rate = exchangeRate || (order?.totalAmountVes / order?.totalAmount) || 1;

      paymentsPayload = mixedPayments.map(p => {
        const amountUSD = Number(p.amount);
        const isVes = isVesMethod(p.method);
        const amountVes = amountUSD * rate;

        const payment = {
          amount: amountUSD,
          amountVes: amountVes,
          exchangeRate: rate,
          currency: isVes ? 'VES' : 'USD',
          method: p.method,
          date: paymentDate,
          reference: p.reference,
          isConfirmed: true,
        };

        // Solo agregar bankAccountId si existe
        if (p.bankAccountId) {
          payment.bankAccountId = p.bankAccountId;
        }

        return payment;
      });
    }

    try {
      setIsSubmitting(true);
      // Corrected endpoint based on backend controller
      await fetchApi(`/orders/${order._id}/payments`, {
        method: 'POST',
        body: JSON.stringify({ payments: paymentsPayload })
      });
      toast.success('Pago registrado con éxito');
      onPaymentSuccess();
      triggerRefresh();
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error(`Error al registrar el pago: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Orden: {order.orderNumber} | Balance Pendiente: ${remainingAmount.toFixed(2)} USD
            {remainingAmountVes > 0 && ` / Bs ${remainingAmountVes.toFixed(2)}`}
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
                <Select value={singlePayment.method} onValueChange={(v) => setSinglePayment(p => ({...p, method: v, bankAccountId: ''}))} disabled={contextLoading}>
                    <SelectTrigger id="single-method" className="col-span-3"><SelectValue placeholder="Seleccione un método" /></SelectTrigger>
                    <SelectContent>{paymentMethods.map(m => m.id !== 'pago_mixto' && <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {singleMethodHasBankAccounts ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="single-bank-account" className="text-right">Cuenta Bancaria</Label>
                  <Select
                    value={singlePayment.bankAccountId}
                    onValueChange={(v) => setSinglePayment(p => ({...p, bankAccountId: v}))}
                    disabled={loadingAccounts || !singlePayment.method}
                  >
                    <SelectTrigger id="single-bank-account" className="col-span-3">
                      <SelectValue placeholder={
                        loadingAccounts
                          ? "Cargando..."
                          : "Seleccione una cuenta (opcional)"
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
              ) : (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Cuenta Bancaria</Label>
                  <div className="col-span-3 text-sm text-muted-foreground">
                    No hay cuentas registradas para este método. El pago se registrará sin cuenta.
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Monto a Pagar
                </Label>
                <div className="col-span-3">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-lg font-semibold">
                      {isVesMethod(singlePayment.method)
                        ? `Bs ${remainingAmountVes.toFixed(2)}`
                        : `$${remainingAmount.toFixed(2)}`
                      }
                    </p>
                    {singlePayment.method && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {isVesMethod(singlePayment.method)
                          ? `≈ $${remainingAmount.toFixed(2)} USD`
                          : `≈ Bs ${remainingAmountVes.toFixed(2)}`
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="single-reference" className="text-right">Referencia</Label>
                <Input id="single-reference" value={singlePayment.reference} onChange={(e) => setSinglePayment(p => ({...p, reference: e.target.value}))} className="col-span-3" />
              </div>
            </div>
          ) : (
            <div className="p-4 border rounded-lg space-y-4">
              {mixedPayments.map((line, index) => {
                const lineIsVes = isVesMethod(line.method);
                const lineAmount = Number(line.amount) || 0;
                const rate = exchangeRate || (order?.totalAmountVes / order?.totalAmount) || 1;
                const lineAmountVes = lineAmount * rate;
                const lineIgtf = lineIsVes ? 0 : lineAmount * 0.03;
                const filteredAccounts = bankAccounts.filter(account =>
                  account.acceptedPaymentMethods &&
                  account.acceptedPaymentMethods.includes(mapPaymentMethodToName(line.method))
                );

                return (
                  <div key={line.id} className="p-3 border rounded-lg space-y-3 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Línea {index + 1}</span>
                      {mixedPayments.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemovePaymentLine(line.id)}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Forma de Pago</Label>
                        <Select value={line.method} onValueChange={(v) => handleUpdatePaymentLine(line.id, 'method', v)} disabled={contextLoading}>
                          <SelectTrigger><SelectValue placeholder="Seleccione método" /></SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map(m => m.id !== 'pago_mixto' && (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cuenta Bancaria (Opcional)</Label>
                        <Select
                          value={line.bankAccountId}
                          onValueChange={(v) => handleUpdatePaymentLine(line.id, 'bankAccountId', v)}
                          disabled={loadingAccounts || !line.method || filteredAccounts.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={
                              loadingAccounts ? "Cargando..." :
                              !line.method ? "Seleccione método primero" :
                              filteredAccounts.length === 0 ? "No hay cuentas" :
                              "Seleccione cuenta (opcional)"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredAccounts.map(account => (
                              <SelectItem key={account._id} value={account._id}>
                                {account.accountName} - {account.bankName} ({account.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Monto en $</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.amount}
                          onChange={(e) => handleUpdatePaymentLine(line.id, 'amount', e.target.value)}
                        />
                        {lineIsVes && lineAmount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Equivalente: Bs {lineAmountVes.toFixed(2)}
                          </p>
                        )}
                        {!lineIsVes && lineAmount > 0 && lineIgtf > 0 && (
                          <p className="text-xs text-orange-600">
                            IGTF (3%): +${lineIgtf.toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Referencia</Label>
                        <Input
                          placeholder="Referencia..."
                          value={line.reference}
                          onChange={(e) => handleUpdatePaymentLine(line.id, 'reference', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button variant="outline" size="sm" onClick={handleAddPaymentLine} className="w-full">
                <Plus className="h-4 w-4 mr-2" />Añadir línea de pago
              </Button>

              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Monto a abonar a la orden:</span>
                  <span className="font-semibold">${mixedPaymentTotals.subtotalUSD.toFixed(2)}</span>
                </div>
                {Math.abs(mixedPaymentTotals.subtotalUSD - remainingAmount) > 0.01 && (
                  <div className={`flex justify-between text-sm p-2 rounded ${mixedPaymentTotals.subtotalUSD < remainingAmount ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                    <span className="font-semibold">
                      {mixedPaymentTotals.subtotalUSD < remainingAmount ? '⚠️ Falta:' : '⚠️ Sobrepago:'}
                    </span>
                    <span className="font-semibold">
                      ${Math.abs(mixedPaymentTotals.subtotalUSD - remainingAmount).toFixed(2)}
                    </span>
                  </div>
                )}
                {mixedPaymentTotals.igtf > 0 && (
                  <div className="flex justify-between text-sm text-orange-600 border-t pt-2">
                    <span>IGTF (3% sobre métodos USD):</span>
                    <span>+${mixedPaymentTotals.igtf.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2 bg-muted/50 p-2 rounded">
                  <span>Total que el cliente desembolsa:</span>
                  <span>${mixedPaymentTotals.totalUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm text-green-600">
                  <span>Equivalente total en Bolívares:</span>
                  <span>Bs {mixedPaymentTotals.totalVES.toFixed(2)}</span>
                </div>
              </div>
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
