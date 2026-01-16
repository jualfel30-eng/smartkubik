import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmContext } from '@/context/CrmContext';
import { useAccountingContext } from '@/context/AccountingContext';
import { fetchApi } from '@/lib/api';
import { X, Plus, Calculator, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

export function PaymentDialogV2({ isOpen, onClose, order, onPaymentSuccess, exchangeRate }) {
  const { paymentMethods, paymentMethodsLoading } = useCrmContext();
  const { triggerRefresh } = useAccountingContext();

  const [paymentMode, setPaymentMode] = useState('single');
  const [singlePayment, setSinglePayment] = useState({ method: '', reference: '', bankAccountId: '' });
  const [mixedPayments, setMixedPayments] = useState([]);
  const buildIdempotencyKey = (ref) => {
    if (!order?._id) return undefined;
    return ref ? `${order._id}-${ref}` : `${order._id}-single`;
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const remainingAmount = useMemo(() => {
    if (!order) return 0;
    return (order.totalAmount || 0) - (order.paidAmount || 0);
  }, [order]);

  const remainingAmountVes = useMemo(() => {
    if (!order) return 0;


    // Si la orden tiene totalAmountVes definido y mayor que 0, usarlo directamente
    if (order.totalAmountVes && order.totalAmountVes > 0) {
      return order.totalAmountVes - (order.paidAmountVes || 0);
    }

    // Fallback: Si totalAmountVes es 0 o undefined, calcular usando la tasa de cambio
    // Primero intentar usar exchangeRate del BCV
    let rate = exchangeRate;

    // Si no hay exchangeRate del BCV, intentar derivarla de la orden (si tiene los valores)
    if (!rate && order.totalAmount > 0 && order.totalAmountVes > 0) {
      rate = order.totalAmountVes / order.totalAmount;
    }

    // Si no hay tasa disponible, retornar 0
    if (!rate || rate === 0) return 0;

    // Calcular el monto pendiente en VES
    const totalAmountVesCalculated = (order.totalAmount || 0) * rate;
    const paidAmountVesCalculated = (order.paidAmountVes || 0);

    return totalAmountVesCalculated - paidAmountVesCalculated;
  }, [order, exchangeRate]);

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

  // Fetch bank accounts when dialog opens
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

  // Check if payment method requires IGTF (3% for USD payments)
  const requiresIgtf = (methodId) => {
    const igtfMethods = ['efectivo_usd', 'transferencia_usd', 'zelle_usd'];
    return igtfMethods.includes(methodId);
  };

  // Calculate IGTF amount (3% of base amount)
  const calculateIgtf = (amount, methodId) => {
    if (!requiresIgtf(methodId)) return 0;
    return amount * 0.03;
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

    const rate = exchangeRate || (order?.totalAmountVes / order?.totalAmount) || 0;
    const safeRate = rate > 0 ? rate : null;
    const rateForCalc = safeRate || 1;

    mixedPayments.forEach(payment => {
      const rawAmount = Number(payment.amount) || 0;
      const isVes = isVesMethod(payment.method);

      if (isVes) {
        // Monto ingresado en VES, convertir a USD
        const amountUSD = rawAmount / rateForCalc;
        subtotalUSD += amountUSD;
        totalVES += rawAmount;
      } else {
        // Monto ingresado en USD
        const lineIgtf = rawAmount * 0.03;
        igtf += lineIgtf;
        subtotalUSD += rawAmount; // This is the amount paid. It already INCLUDES the IGTF coverage if the user intended it.
        totalVES += rawAmount * rateForCalc;
      }
    });

    const totalUSD = subtotalUSD; // Client pays what they entered. IGTF is just a tax liability check.

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
      const safeRate = rate > 0 ? rate : null;

      if (singlePayment.bankAccountId && !singlePayment.reference) {
        toast.error('La referencia es obligatoria para pagos con cuenta bancaria.');
        return;
      }

      const methodsRequiringReference = ["transferencia", "pago_movil", "pos", "zelle"];
      if (methodsRequiringReference.some(m => singlePayment.method?.includes(m)) && !singlePayment.reference) {
        toast.error('La referencia es obligatoria para este método de pago.');
        return;
      }

      if (isVes && !safeRate) {
        toast.error('No se pudo obtener la tasa BCV para calcular el monto en Bs.');
        return;
      }

      const rateForCalc = safeRate || 1;
      const baseUSD =
        remainingAmount && remainingAmount > 0
          ? remainingAmount
          : (remainingAmountVes && remainingAmountVes > 0
            ? remainingAmountVes / rateForCalc
            : 0);

      // Calculate IGTF for USD payments (3%) - ONLY FOR DISPLAY
      const igtfAmount = requiresIgtf(singlePayment.method) && !isVes ? calculateIgtf(baseUSD, singlePayment.method) : 0;
      const totalWithIgtf = baseUSD + igtfAmount;

      // Send BASE amount to backend (without IGTF) - backend will calculate IGTF
      const amountVes = isVes
        ? (remainingAmountVes && remainingAmountVes > 0
          ? remainingAmountVes
          : baseUSD * rateForCalc)
        : baseUSD * rateForCalc; // Use baseUSD, not totalWithIgtf
      const amountUSD = isVes ? amountVes / rateForCalc : baseUSD; // Use baseUSD, not totalWithIgtf

      const singlePaymentPayload = {
        amount: amountUSD,
        amountVes: amountVes,
        exchangeRate: rateForCalc,
        currency: isVes ? 'VES' : 'USD',
        method: singlePayment.method,
        date: paymentDate,
        reference: singlePayment.reference,
        isConfirmed: true,
      };

      if (singlePayment.bankAccountId) {
        singlePaymentPayload.bankAccountId = singlePayment.bankAccountId;
      }

      paymentsPayload.push({
        ...singlePaymentPayload,
        idempotencyKey: buildIdempotencyKey(singlePayment.reference),
      });
    } else {
      if (mixedPayments.length === 0) {
        toast.error('Añada al menos una línea de pago.');
        return;
      }
      if (mixedPayments.some(p => Number(p.amount) <= 0 || !p.method)) {
        toast.error('Todos los montos deben ser mayores a cero y debe seleccionar un método.');
        return;
      }

      const rate = exchangeRate || (order?.totalAmountVes / order?.totalAmount) || 0;
      const safeRate = rate > 0 ? rate : null;
      const rateForCalc = safeRate || 1;

      paymentsPayload = mixedPayments.map(p => {
        const isVes = isVesMethod(p.method);
        const rawAmount = Number(p.amount) || 0;

        const amountUSD = isVes ? rawAmount / rateForCalc : rawAmount;
        const amountVes = isVes ? rawAmount : rawAmount * rateForCalc;

        const payment = {
          amount: amountUSD,
          amountVes: amountVes,
          exchangeRate: rateForCalc,
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

        return {
          ...payment,
          idempotencyKey: buildIdempotencyKey(p.reference || `mixed-${p.id}`),
        };
      });
    }

    try {
      setIsSubmitting(true);
      const response = await fetchApi(`/orders/${order._id}/payments`, {
        method: 'POST',
        body: JSON.stringify({ payments: paymentsPayload })
      });
      toast.success('Pago registrado con éxito');
      onPaymentSuccess(response.data);
      triggerRefresh();

      // Auto-complete Pickup Orders
      const totalPaidUSD = paymentsPayload.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      // Use a small epsilon for float comparison tolerance
      const isFullPayment = Math.abs(remainingAmount - totalPaidUSD) < 0.1;

      if (order.deliveryMethod === 'pickup' && isFullPayment) {
        try {
          await fetchApi(`/orders/${order._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'delivered' })
          });
          toast.success('Orden completada y entregada automáticamente 🚀', {
            description: 'La orden ha sido marcada como Entregada porque se pagó en su totalidad.'
          });
          // Refresh again to reflect the status change
          triggerRefresh();
        } catch (autoCompError) {
          console.error("Auto-complete failed:", autoCompError);
          // We don't block the flow if this optional step fails, users can still manually process it
        }
      }
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
      <DialogContent className="sm:max-w-[700px] flex flex-col h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Orden: {order.orderNumber} | Balance Pendiente: ${remainingAmount.toFixed(2)} USD
            {remainingAmountVes > 0 && ` / Bs ${remainingAmountVes.toFixed(2)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
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
                <Select value={singlePayment.method} onValueChange={(v) => setSinglePayment(p => ({ ...p, method: v, bankAccountId: '' }))} disabled={paymentMethodsLoading}>
                  <SelectTrigger id="single-method" className="col-span-3"><SelectValue placeholder="Seleccione un método" /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(m => m.id !== 'pago_mixto' && <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {singleMethodHasBankAccounts ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="single-bank-account" className="text-right">Cuenta Bancaria</Label>
                  <Select
                    value={singlePayment.bankAccountId}
                    onValueChange={(v) => setSinglePayment(p => ({ ...p, bankAccountId: v }))}
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
                  <div className="p-3 bg-muted rounded-md space-y-2">
                    {requiresIgtf(singlePayment.method) && !isVesMethod(singlePayment.method) ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Monto orden:</span>
                          <span>${remainingAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>IGTF (3%):</span>
                          <span>${calculateIgtf(remainingAmount, singlePayment.method).toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between">
                            <span className="font-semibold">Total a cobrar:</span>
                            <span className="text-lg font-bold">
                              ${(remainingAmount + calculateIgtf(remainingAmount, singlePayment.method)).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            ≈ Bs {((remainingAmount + calculateIgtf(remainingAmount, singlePayment.method)) * (exchangeRate || 1)).toFixed(2)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="single-reference" className="text-right">Referencia</Label>
                <Input id="single-reference" value={singlePayment.reference} onChange={(e) => setSinglePayment(p => ({ ...p, reference: e.target.value }))} className="col-span-3" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {mixedPayments.map((line, index) => {
                const lineIsVes = isVesMethod(line.method);
                const lineAmount = Number(line.amount) || 0;
                const rate = exchangeRate || (order?.totalAmountVes / order?.totalAmount) || 1;
                // Si es VES, el monto ingresado ya está en Bs. Si es USD, convertir a Bs
                const lineAmountVes = lineIsVes ? lineAmount : lineAmount * rate;
                const lineAmountUsd = lineIsVes ? lineAmount / rate : lineAmount;
                const lineIgtf = lineIsVes ? 0 : lineAmount * 0.03;
                const filteredAccounts = bankAccounts.filter(account =>
                  account.acceptedPaymentMethods &&
                  account.acceptedPaymentMethods.includes(mapPaymentMethodToName(line.method))
                );

                // --- SMART FILL LOGIC START ---
                // 1. Estimate Total IGTF based on current entries
                const currentTotalIGTF = mixedPayments.reduce((sum, p) => {
                  const pIsVes = isVesMethod(p.method);
                  const pRaw = Number(p.amount) || 0;
                  return sum + (pIsVes ? 0 : pRaw * 0.03);
                }, 0);

                const dynamicTotalRequired = remainingAmount + currentTotalIGTF;

                // 2. Calculate what has been paid so far (in USD equivalent) by ALL other lines
                const otherLinesPaidUSD = mixedPayments
                  .filter(p => p.id !== line.id)
                  .reduce((sum, p) => {
                    const pIsVes = isVesMethod(p.method);
                    const pRaw = Number(p.amount) || 0;
                    return sum + (pIsVes ? pRaw / rate : pRaw);
                  }, 0);

                // 3. Global Deficit
                const currentLinePaidUSD = lineIsVes ? lineAmount / rate : lineAmount;
                const globalPaidUSD = otherLinesPaidUSD + currentLinePaidUSD;
                const globalDeficitUSD = Math.max(0, dynamicTotalRequired - globalPaidUSD);

                // 4. Missing Amount (Target to Fill)
                const missingUSD = globalDeficitUSD;
                const missingVES = missingUSD * rate;
                // --- SMART FILL LOGIC END ---

                return (
                  <div key={line.id} className="p-3 border rounded-lg space-y-3 bg-card shadow-sm">
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
                        <Select
                          value={line.method}
                          onValueChange={(v) => handleUpdatePaymentLine(line.id, 'method', v)}
                          disabled={paymentMethodsLoading}
                        >
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
                        <Label>{lineIsVes ? 'Monto en Bs' : 'Monto en $'}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={lineIsVes ? `Ej: ${remainingAmountVes.toFixed(2)}` : `Ej: ${remainingAmount.toFixed(2)}`}
                            value={line.amount}
                            onChange={(e) => handleUpdatePaymentLine(line.id, 'amount', e.target.value)}
                            className={missingUSD > 0.01 && lineAmount === 0 ? "border-blue-400 flex-1" : "flex-1"}
                          />
                          {missingUSD > 0.01 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="shrink-0 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-blue-200 border"
                              onClick={() => {
                                const currentVal = Number(line.amount) || 0;
                                const newVal = currentVal + (lineIsVes ? missingVES : missingUSD);
                                handleUpdatePaymentLine(line.id, 'amount', newVal.toFixed(2));
                              }}
                              title={`Autocompletar faltante: $${missingUSD.toFixed(2)}`}
                            >
                              <Wand2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Interactive Helper Text */}
                        {missingUSD > 0.01 && (
                          <div
                            className="text-xs text-muted-foreground pl-1 flex items-center gap-1 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors group"
                            onClick={() => {
                              const currentVal = Number(line.amount) || 0;
                              const newVal = currentVal + (lineIsVes ? missingVES : missingUSD);
                              handleUpdatePaymentLine(line.id, 'amount', newVal.toFixed(2));
                            }}
                          >
                            <Calculator className="w-3 h-3 group-hover:text-blue-600" />
                            <span>
                              Falta: <span className="font-medium text-blue-600 group-hover:underline">${missingUSD.toFixed(2)}</span>
                              {rate > 0 && (
                                <>
                                  {' '}≈{' '}
                                  <span className="font-medium text-green-600">Bs {missingVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </>
                              )}
                            </span>
                          </div>
                        )}

                        {lineIsVes && lineAmount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Equivalente: ${lineAmountUsd.toFixed(2)} USD
                          </p>
                        )}
                        {!lineIsVes && lineAmount > 0 && (
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

              <Button variant="outline" size="sm" onClick={handleAddPaymentLine} className="w-full border-dashed p-4">
                <Plus className="h-4 w-4 mr-2" />Añadir línea de pago
              </Button>
            </div>
          )
          }
        </div>

        {/* Fixed Footer Section */}
        <div className="p-6 bg-muted/30 border-t mt-auto space-y-4">
          {paymentMode === 'mixed' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal Orden:</span>
                <span>${remainingAmount.toFixed(2)}</span>
              </div>
              {mixedPaymentTotals.igtf > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>+ IGTF (3%):</span>
                  <span>${mixedPaymentTotals.igtf.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-medium border-t pt-1">
                <span>Total Requerido:</span>
                <span>${(remainingAmount + mixedPaymentTotals.igtf).toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-lg bg-muted/50 p-2 rounded">
                <span>Total Pagado:</span>
                <span>${mixedPaymentTotals.totalUSD.toFixed(2)}</span>
              </div>

              {Math.abs(mixedPaymentTotals.totalUSD - (remainingAmount + mixedPaymentTotals.igtf)) > 0.01 && (
                <div className={`flex justify-between text-sm p-2 rounded ${mixedPaymentTotals.totalUSD < (remainingAmount + mixedPaymentTotals.igtf) ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                  <span className="font-semibold">
                    {mixedPaymentTotals.totalUSD < (remainingAmount + mixedPaymentTotals.igtf) ? '⚠️ Falta por cubrir:' : '⚠️ Exceso de pago:'}
                  </span>
                  <span className="font-semibold">
                    ${Math.abs(mixedPaymentTotals.totalUSD - (remainingAmount + mixedPaymentTotals.igtf)).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-semibold text-sm text-green-600">
                <span>Equivalente total en Bolívares:</span>
                <span>Bs {mixedPaymentTotals.totalVES.toFixed(2)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button></DialogClose>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Registrando...' : 'Registrar Pago'}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
