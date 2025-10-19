import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";

export function ConfirmPaymentDialog({ isOpen, onClose, order, payment, paymentIndex, onSuccess }) {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && payment) {
      setSelectedMethod(payment.method || '');
      setSelectedBankAccount('');
      fetchBankAccounts();
    }
  }, [isOpen, payment]);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/bank-accounts?limit=100');
      setBankAccounts(response.data || response || []);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      toast.error('Error al cargar cuentas bancarias');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar cuentas bancarias que aceptan el método de pago seleccionado
  const filteredBankAccounts = useMemo(() => {
    if (!selectedMethod) return [];
    return bankAccounts.filter(account =>
      account.acceptedPaymentMethods &&
      account.acceptedPaymentMethods.includes(selectedMethod) &&
      account.isActive
    );
  }, [bankAccounts, selectedMethod]);

  const handleSubmit = async () => {
    if (!selectedMethod) {
      toast.error('Seleccione un método de pago');
      return;
    }
    if (!selectedBankAccount) {
      toast.error('Seleccione una cuenta bancaria');
      return;
    }

    try {
      setIsSubmitting(true);
      await fetchApi(`/orders/${order._id}/confirm-payment`, {
        method: 'POST',
        body: JSON.stringify({
          paymentIndex: paymentIndex,
          bankAccountId: selectedBankAccount,
          confirmedMethod: selectedMethod
        })
      });
      toast.success('Pago confirmado exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Error al confirmar el pago', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirmar Pago</DialogTitle>
          <DialogDescription>
            Orden: {order.orderNumber} | Monto: ${payment.amount?.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Mostrar método inicial */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Método registrado inicialmente:</p>
            <Badge variant="outline" className="mt-1">{payment.method}</Badge>
            {payment.reference && (
              <p className="text-xs text-muted-foreground mt-1">Ref: {payment.reference}</p>
            )}
          </div>

          {/* Selector de método de pago (puede cambiar) */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Método de Pago Final *</Label>
            <Select value={selectedMethod} onValueChange={setSelectedMethod} disabled={loading}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Seleccione el método usado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Tarjeta de Débito">Tarjeta de Débito</SelectItem>
                <SelectItem value="Tarjeta de Crédito">Tarjeta de Crédito</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Pagomóvil">Pagomóvil</SelectItem>
                <SelectItem value="Zelle">Zelle</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Puedes cambiar el método si el cliente usó uno diferente
            </p>
          </div>

          {/* Selector de cuenta bancaria (filtrado por método) */}
          <div className="space-y-2">
            <Label htmlFor="bank-account">Cuenta Bancaria *</Label>
            {selectedMethod ? (
              <>
                <Select
                  value={selectedBankAccount}
                  onValueChange={setSelectedBankAccount}
                  disabled={loading || filteredBankAccounts.length === 0}
                >
                  <SelectTrigger id="bank-account">
                    <SelectValue placeholder={
                      filteredBankAccounts.length === 0
                        ? "No hay cuentas que acepten este método"
                        : "Seleccione la cuenta donde se depositó"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBankAccounts.map(account => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.bankName} - {account.accountNumber} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredBankAccounts.length === 0 && (
                  <p className="text-xs text-destructive">
                    No hay cuentas bancarias configuradas para aceptar "{selectedMethod}".
                    Configúrelas en el módulo de Cuentas Bancarias.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded">
                Primero seleccione un método de pago
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedMethod || !selectedBankAccount}
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar Pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
