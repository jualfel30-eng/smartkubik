import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { createPayment } from '../lib/api'; // Assuming this function exists in your api lib
import { toast } from 'sonner';

export const PaymentDialog = ({ isOpen, onClose, payable, onPaymentSuccess }) => {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (payable) {
      const totalAmount = payable.lines.reduce((sum, line) => sum + line.amount, 0);
      const remainingBalance = totalAmount - (payable.paidAmount || 0);
      setAmount(remainingBalance);
    }
  }, [payable]);

  if (!payable) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (amount <= 0) {
      setError('El monto debe ser mayor a cero.');
      return;
    }

    const payload = {
      payableId: payable._id,
      amount: Number(amount),
      date,
      paymentMethod,
      referenceNumber,
    };

    try {
      await createPayment(payload);
      toast.success('Pago registrado con éxito.');
      onPaymentSuccess();
    } catch (err) {
      toast.error('Error al registrar el pago', {
        description: err.message || 'Ocurrió un error inesperado.',
      });
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Registra un pago para la cuenta "{payable.description || payable.payableNumber}".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Monto</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3"
              />
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
              <Label htmlFor="paymentMethod" className="text-right">Método</Label>
              <Input
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
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
            {error && <p className="text-red-500 text-sm col-span-4 text-center">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Registrar Pago</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
