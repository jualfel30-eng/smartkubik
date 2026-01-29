import React, { useState, useEffect, useCallback } from 'react';
import { useCashRegister } from '../../contexts/CashRegisterContext';
import { fetchApi } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

// UI Components
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Icons
import {
    Calculator,
} from 'lucide-react';

export function CashClosingDrawer({ trigger }) {
    const { currentSession, hasActiveSession, refreshSession } = useCashRegister();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [totals, setTotals] = useState(null);
    const [closingData, setClosingData] = useState({
        closingAmountUsd: '',
        closingAmountVes: '',
        closingNotes: '',
        exchangeRate: '',
    });

    // Cargar totales cuando se abre el drawer
    const fetchTotals = useCallback(async () => {
        if (!currentSession?._id) return;

        try {
            setLoading(true);
            const response = await fetchApi(`/cash-register/sessions/${currentSession._id}/totals`);
            console.log('[CashClosingDrawer] Totals received:', response.data || response);
            setTotals(response.data || response);
        } catch (error) {
            console.error('Error fetching totals:', error);
            // Non-blocking error
        } finally {
            setLoading(false);
        }
    }, [currentSession?._id]);

    useEffect(() => {
        if (open && hasActiveSession) {
            fetchTotals();
        }
    }, [open, hasActiveSession, fetchTotals]);

    // Calcular esperados
    const calculateExpected = () => {
        if (!currentSession || !totals) return { expectedUsd: 0, expectedVes: 0 };

        const cashInUsd = (currentSession.cashMovements || [])
            .filter(m => m.type === 'in' && m.currency === 'USD')
            .reduce((sum, m) => sum + m.amount, 0);

        const cashOutUsd = (currentSession.cashMovements || [])
            .filter(m => m.type === 'out' && m.currency === 'USD')
            .reduce((sum, m) => sum + m.amount, 0);

        const cashInVes = (currentSession.cashMovements || [])
            .filter(m => m.type === 'in' && m.currency === 'VES')
            .reduce((sum, m) => sum + m.amount, 0);

        const cashOutVes = (currentSession.cashMovements || [])
            .filter(m => m.type === 'out' && m.currency === 'VES')
            .reduce((sum, m) => sum + m.amount, 0);

        const expectedUsd = (currentSession.openingAmountUsd || 0) + (totals.cashUsd || 0) + cashInUsd - cashOutUsd;
        const expectedVes = (currentSession.openingAmountVes || 0) + (totals.cashVes || 0) + cashInVes - cashOutVes;

        return { expectedUsd, expectedVes };
    };

    const { expectedUsd, expectedVes } = calculateExpected();
    const diffUsd = (parseFloat(closingData.closingAmountUsd) || 0) - expectedUsd;
    const diffVes = (parseFloat(closingData.closingAmountVes) || 0) - expectedVes;

    const getDiffBadgeColor = (diff) => {
        if (Math.abs(diff) < 0.01) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
        if (diff > 0) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'; // Sobrante
        return 'text-red-600 bg-red-100 dark:bg-red-900/30'; // Faltante
    };

    const formatMoney = (amount, currency) => {
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency
        }).format(amount || 0);
    };



    // Enviar cierre
    const handleClose = async () => {
        if (!closingData.closingAmountUsd && !closingData.closingAmountVes) {
            toast.error('Debe ingresar al menos un monto de cierre');
            return;
        }

        try {
            setLoading(true);

            await fetchApi(`/cash-register/sessions/${currentSession._id}/close`, {
                method: 'POST',
                body: JSON.stringify({
                    closingAmountUsd: parseFloat(closingData.closingAmountUsd) || 0,
                    closingAmountVes: parseFloat(closingData.closingAmountVes) || 0,
                    closingNotes: closingData.closingNotes,
                    exchangeRate: parseFloat(closingData.exchangeRate) || undefined,
                }),
            });

            toast.success('Caja cerrada exitosamente');
            refreshSession();
            setOpen(false);

            // Preguntar si desea ver el reporte
            // (En React router v6 no hay confirm nativo bonito, usamos window.confirm o toast action)
            setTimeout(() => {
                navigate('/cash-register');
            }, 500);

        } catch (error) {
            console.error('Error closing session:', error);
            toast.error(error.message || 'Error al cerrar la caja');
        } finally {
            setLoading(false);
        }
    };

    // Si no hay sesión activa, mostrar mensaje
    if (!hasActiveSession) {
        return null; // O mostrar botón deshabilitado
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Calculator className="h-4 w-4" />
                        Cierre Rápido
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>Cierre de Caja Rápido</SheetTitle>
                    <SheetDescription>
                        {currentSession?.registerName} - {currentSession?.cashierName}
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 px-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Conteo de Efectivo (USD)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Sistema (Esperado)</Label>
                                    <div className="h-10 px-3 py-2 rounded-md border bg-muted text-muted-foreground font-mono text-right flex items-center justify-end">
                                        {formatMoney(expectedUsd, 'USD')}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Real (Contado)</Label>
                                    <Input
                                        type="number"
                                        className="text-right font-mono"
                                        placeholder="0.00"
                                        value={closingData.closingAmountUsd}
                                        onChange={e => setClosingData({ ...closingData, closingAmountUsd: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className={`text-xs text-right font-medium px-2 py-1 rounded ${getDiffBadgeColor(diffUsd)}`}>
                                Diferencia: {diffUsd > 0 ? '+' : ''}{formatMoney(diffUsd, 'USD')}
                            </div>
                        </div>

                        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Conteo de Efectivo (VES)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Sistema (Esperado)</Label>
                                    <div className="h-10 px-3 py-2 rounded-md border bg-muted text-muted-foreground font-mono text-right flex items-center justify-end">
                                        {formatMoney(expectedVes, 'VES')}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Real (Contado)</Label>
                                    <Input
                                        type="number"
                                        className="text-right font-mono"
                                        placeholder="0.00"
                                        value={closingData.closingAmountVes}
                                        onChange={e => setClosingData({ ...closingData, closingAmountVes: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className={`text-xs text-right font-medium px-2 py-1 rounded ${getDiffBadgeColor(diffVes)}`}>
                                Diferencia: {diffVes > 0 ? '+' : ''}{formatMoney(diffVes, 'VES')}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Input
                                placeholder="Observaciones..."
                                value={closingData.closingNotes}
                                onChange={e => setClosingData({ ...closingData, closingNotes: e.target.value })}
                            />
                        </div>
                    </div>

                    <Button className="w-full" onClick={handleClose} disabled={loading}>
                        {loading ? 'Cerrando...' : 'Confirmar Cierre'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
