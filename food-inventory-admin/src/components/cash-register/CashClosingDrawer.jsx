import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Calculator } from 'lucide-react';
import { useCashRegister } from '@/contexts/CashRegisterContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { DenominationCounter } from './DenominationCounter';

/**
 * Drawer de doble función: Apertura y Cierre rápido de caja
 * - Si NO hay sesión activa: muestra formulario de apertura
 * - Si SÍ hay sesión activa: muestra formulario de cierre
 */
export function CashClosingDrawer({ trigger }) {
    const { currentSession, hasActiveSession, refreshSession } = useCashRegister();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [totals, setTotals] = useState(null);

    // Datos para cierre
    const [closingData, setClosingData] = useState({
        closingAmountUsd: '',
        closingAmountVes: '',
        closingNotes: '',
        exchangeRate: '',
    });

    // Desgloses de efectivo
    const [breakdownUsd, setBreakdownUsd] = useState({});
    const [breakdownVes, setBreakdownVes] = useState({});

    // Datos para apertura
    const [openingData, setOpeningData] = useState({
        registerName: 'Caja Principal',
        openingAmountUsd: '',
        openingAmountVes: '',
        openingNotes: '',
    });

    // Cargar totales cuando se abre el drawer (solo para cierre)
    const fetchTotals = useCallback(async () => {
        if (!currentSession?._id) return;

        try {
            const response = await fetchApi(`/cash-register/sessions/${currentSession._id}/totals`);
            setTotals(response);
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

    // Calcular esperados (solo para cierre)
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

        const expectedUsd = (currentSession.openingAmountUsd || 0) + (totals.cashUsd || 0) - (totals.changeGivenUsd || 0) + cashInUsd - cashOutUsd;
        const expectedVes = (currentSession.openingAmountVes || 0) + (totals.cashVes || 0) - (totals.changeGivenVes || 0) + cashInVes - cashOutVes;

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

    // Handlers para el contador
    const handleConfirmUsdCount = (total, counts) => {
        setClosingData(prev => ({ ...prev, closingAmountUsd: total.toFixed(2) }));
        setBreakdownUsd(counts);
    };

    const handleConfirmVesCount = (total, counts) => {
        setClosingData(prev => ({ ...prev, closingAmountVes: total.toFixed(2) }));
        setBreakdownVes(counts);
    };

    // Handler para abrir sesión
    const handleOpenSession = async () => {
        setLoading(true);
        try {
            const payload = {
                registerName: openingData.registerName,
                openingAmountUsd: parseFloat(openingData.openingAmountUsd) || 0,
                openingAmountVes: parseFloat(openingData.openingAmountVes) || 0,
                openingNotes: openingData.openingNotes,
            };

            await fetchApi('/cash-register/sessions/open', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            toast.success('Caja abierta exitosamente');
            setOpen(false);
            await refreshSession();

            // Resetear formulario de apertura
            setOpeningData({
                registerName: 'Caja Principal',
                openingAmountUsd: '',
                openingAmountVes: '',
                openingNotes: '',
            });
        } catch (error) {
            toast.error(error.message || 'Error al abrir la caja');
        } finally {
            setLoading(false);
        }
    };

    // Enviar cierre
    const handleClose = async () => {
        if (!closingData.closingAmountUsd && !closingData.closingAmountVes) {
            toast.error('Debe ingresar al menos un monto de cierre');
            return;
        }

        try {
            setLoading(true);

            // Helper para mapear a DTO (d_100, d_50, etc)
            const mapToDto = (counts) => {
                const mapped = {};
                Object.entries(counts).forEach(([k, v]) => {
                    if (k === 'coins') mapped.coins = v;
                    else mapped[`d_${k}`] = v;
                });
                return mapped;
            };

            // Construir closingFunds
            const closingFunds = [];
            // Siempre enviamos la estructura si hay monto, aunque no haya breakdown detallado (counts vacíos)
            if (closingData.closingAmountUsd) {
                closingFunds.push({
                    currency: 'USD',
                    amount: parseFloat(closingData.closingAmountUsd) || 0,
                    denominations: mapToDto(breakdownUsd)
                });
            }
            if (closingData.closingAmountVes) {
                closingFunds.push({
                    currency: 'VES',
                    amount: parseFloat(closingData.closingAmountVes) || 0,
                    denominations: mapToDto(breakdownVes)
                });
            }

            await fetchApi(`/cash-register/sessions/${currentSession._id}/close`, {
                method: 'POST',
                body: JSON.stringify({
                    closingAmountUsd: parseFloat(closingData.closingAmountUsd) || 0,
                    closingAmountVes: parseFloat(closingData.closingAmountVes) || 0,
                    closingNotes: closingData.closingNotes,
                    exchangeRate: parseFloat(closingData.exchangeRate) || undefined,
                    closingFunds,
                }),
            });

            toast.success('Caja cerrada exitosamente');
            refreshSession();
            setOpen(false);

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

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Calculator className="h-4 w-4" />
                        {hasActiveSession ? 'Cierre Rápido' : 'Abrir Caja'}
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>
                        {hasActiveSession ? 'Cierre de Caja Rápido' : 'Apertura de Caja'}
                    </SheetTitle>
                    <SheetDescription>
                        {hasActiveSession
                            ? `${currentSession?.registerName} - ${currentSession?.cashierName}`
                            : 'Ingresa los datos iniciales para abrir una nueva sesión de caja'
                        }
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 px-6 space-y-6">
                    {!hasActiveSession ? (
                        // ===== FORMULARIO DE APERTURA =====
                        <div className="space-y-4">
                            <div>
                                <Label>Nombre de Caja</Label>
                                <Input
                                    value={openingData.registerName}
                                    onChange={(e) => setOpeningData(prev => ({
                                        ...prev,
                                        registerName: e.target.value
                                    }))}
                                    placeholder="Ej: Caja Principal"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Monto Inicial USD ($)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="text-right font-mono"
                                        value={openingData.openingAmountUsd}
                                        onChange={(e) => setOpeningData(prev => ({
                                            ...prev,
                                            openingAmountUsd: e.target.value
                                        }))}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <Label>Monto Inicial Bs.</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="text-right font-mono"
                                        value={openingData.openingAmountVes}
                                        onChange={(e) => setOpeningData(prev => ({
                                            ...prev,
                                            openingAmountVes: e.target.value
                                        }))}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Notas de Apertura (Opcional)</Label>
                                <textarea
                                    className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none"
                                    value={openingData.openingNotes}
                                    onChange={(e) => setOpeningData(prev => ({
                                        ...prev,
                                        openingNotes: e.target.value
                                    }))}
                                    placeholder="Observaciones sobre la apertura..."
                                />
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleOpenSession}
                                disabled={loading || !openingData.registerName}
                            >
                                {loading ? 'Abriendo...' : 'Abrir Caja'}
                            </Button>
                        </div>
                    ) : (
                        // ===== FORMULARIO DE CIERRE =====
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
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                className="text-right font-mono"
                                                placeholder="0.00"
                                                value={closingData.closingAmountUsd}
                                                onChange={e => setClosingData({ ...closingData, closingAmountUsd: e.target.value })}
                                            />
                                            <DenominationCounter
                                                currency="USD"
                                                onConfirm={handleConfirmUsdCount}
                                                initialCounts={breakdownUsd}
                                            />
                                        </div>
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
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                className="text-right font-mono"
                                                placeholder="0.00"
                                                value={closingData.closingAmountVes}
                                                onChange={e => setClosingData({ ...closingData, closingAmountVes: e.target.value })}
                                            />
                                            <DenominationCounter
                                                currency="VES"
                                                onConfirm={handleConfirmVesCount}
                                                initialCounts={breakdownVes}
                                            />
                                        </div>
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

                            <Button className="w-full" onClick={handleClose} disabled={loading}>
                                {loading ? 'Cerrando...' : 'Confirmar Cierre'}
                            </Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
