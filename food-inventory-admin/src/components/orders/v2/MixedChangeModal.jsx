import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, DollarSign, Coins } from 'lucide-react';

/**
 * MixedChangeModal - Component for splitting change between USD and VES
 * Used when cashier needs to give change in mixed currencies (Venezuelan practice)
 */
export default function MixedChangeModal({
    isOpen,
    onClose,
    totalChange,
    exchangeRate,
    onConfirm
}) {
    const [usdAmount, setUsdAmount] = useState('');
    const [vesAmount, setVesAmount] = useState('');
    const [vesMethod, setVesMethod] = useState('efectivo_ves');
    const [error, setError] = useState('');

    // Auto-suggest: whole dollars in USD, cents in VES
    useEffect(() => {
        if (isOpen && totalChange > 0) {
            const wholeDollars = Math.floor(totalChange);
            const cents = totalChange - wholeDollars;

            setUsdAmount(wholeDollars.toString());
            setVesAmount((cents * exchangeRate).toFixed(2));
            setVesMethod('efectivo_ves');
            setError('');
        }
    }, [isOpen, totalChange, exchangeRate]);

    const handleUsdChange = (value) => {
        setUsdAmount(value);
        const usd = parseFloat(value) || 0;
        const remaining = totalChange - usd;

        if (remaining >= 0) {
            setVesAmount((remaining * exchangeRate).toFixed(2));
            setError('');
        } else {
            setError('El monto en USD no puede ser mayor que el vuelto total');
        }
    };

    const handleVesChange = (value) => {
        setVesAmount(value);
        const ves = parseFloat(value) || 0;
        const vesInUsd = ves / exchangeRate;
        const remaining = totalChange - vesInUsd;

        if (remaining >= 0) {
            setUsdAmount(remaining.toFixed(2));
            setError('');
        } else {
            setError('El monto en VES no puede ser mayor que el vuelto total');
        }
    };

    const handleConfirm = () => {
        const usd = parseFloat(usdAmount) || 0;
        const ves = parseFloat(vesAmount) || 0;
        const vesInUsd = ves / exchangeRate;
        const total = usd + vesInUsd;

        // Validate total matches (with small tolerance for rounding)
        if (Math.abs(total - totalChange) > 0.01) {
            setError(`La suma debe ser $${totalChange.toFixed(2)}`);
            return;
        }

        // Validate at least one currency has value
        if (usd === 0 && ves === 0) {
            setError('Debe especificar al menos un monto');
            return;
        }

        // Validate VES method if VES amount > 0
        if (ves > 0 && !vesMethod) {
            setError('Debe seleccionar el método para VES');
            return;
        }

        onConfirm({
            usd,
            ves,
            vesMethod: ves > 0 ? vesMethod : undefined
        });

        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Coins className="w-5 h-5" />
                        Dividir Vuelto (USD + VES)
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Total Change Display */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm font-medium text-blue-900">
                            Vuelto Total: <span className="text-lg">${totalChange.toFixed(2)}</span>
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                            ≈ Bs {(totalChange * exchangeRate).toFixed(2)} (Tasa: {exchangeRate})
                        </p>
                    </div>

                    {/* USD Input */}
                    <div className="space-y-2">
                        <Label htmlFor="usd-change" className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Vuelto en USD (Efectivo)
                        </Label>
                        <Input
                            id="usd-change"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={usdAmount}
                            onChange={(e) => handleUsdChange(e.target.value)}
                            className="text-lg"
                        />
                    </div>

                    {/* VES Input */}
                    <div className="space-y-2">
                        <Label htmlFor="ves-change" className="flex items-center gap-2">
                            <Coins className="w-4 h-4" />
                            Vuelto en VES (Bolívares)
                        </Label>
                        <Input
                            id="ves-change"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={vesAmount}
                            onChange={(e) => handleVesChange(e.target.value)}
                            className="text-lg"
                        />
                        {vesAmount && parseFloat(vesAmount) > 0 && (
                            <p className="text-xs text-muted-foreground">
                                ≈ ${(parseFloat(vesAmount) / exchangeRate).toFixed(2)} USD
                            </p>
                        )}
                    </div>

                    {/* VES Method Selection */}
                    {vesAmount && parseFloat(vesAmount) > 0 && (
                        <div className="space-y-2">
                            <Label>Método para VES</Label>
                            <RadioGroup value={vesMethod} onValueChange={setVesMethod}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="efectivo_ves" id="efectivo" />
                                    <Label htmlFor="efectivo" className="font-normal cursor-pointer">
                                        Efectivo VES
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="pago_movil_ves" id="pago-movil" />
                                    <Label htmlFor="pago-movil" className="font-normal cursor-pointer">
                                        PagoMóvil VES
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Summary */}
                    {!error && usdAmount && vesAmount && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm font-medium text-green-900">Resumen:</p>
                            <ul className="text-xs text-green-700 mt-1 space-y-1">
                                <li>• USD: ${parseFloat(usdAmount).toFixed(2)} (Efectivo)</li>
                                <li>• VES: Bs {parseFloat(vesAmount).toFixed(2)} ({vesMethod === 'efectivo_ves' ? 'Efectivo' : 'PagoMóvil'})</li>
                            </ul>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={!!error}>
                        Confirmar División
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
