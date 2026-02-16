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
import { Calculator, Printer, FileText, Download, Eye } from 'lucide-react';
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
    const [lastClosingId, setLastClosingId] = useState(null);

    const [openingData, setOpeningData] = useState({
        registerName: 'Caja Principal',
        openingAmountUsd: '',
        openingAmountVes: '',
        openingNotes: '',
        workShift: 'morning'
    });

    const [closingData, setClosingData] = useState({
        closingAmountUsd: '',
        closingAmountVes: '',
        closingNotes: ''
    });

    const [breakdownUsd, setBreakdownUsd] = useState({});
    const [breakdownVes, setBreakdownVes] = useState({});

    // Totales calculados
    const [expectedUsd, setExpectedUsd] = useState(0);
    const [expectedVes, setExpectedVes] = useState(0);

    // Helpers para formatear moneda
    const formatMoney = (amount, currency = 'USD') => {
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const calculateExpected = useCallback(() => {
        if (!currentSession) return;

        const salesCashUsd = currentSession.calculatedTotals?.cashUsd || 0;
        const salesCashVes = currentSession.calculatedTotals?.cashVes || 0;

        // Add change given logic if available in backend response, otherwise assume gross
        // For now, mirroring Dashboard logic if possible, or using simple totals
        // Assuming currentSession has updated totals from context refresh

        const openingUsd = currentSession.openingAmountUsd || 0;
        const openingVes = currentSession.openingAmountVes || 0;

        // Simple calculation for now: Opening + Sales (Cash)
        // In a real scenario, we should also include In/Out movements
        // Let's check if dashboard has more complex logic. 
        // Dashboard does: opening + sales + in - out.
        // We will assume context provides mostly ready values or do simple math.

        // Recalculate based on session data
        let totalUsd = openingUsd + salesCashUsd;
        let totalVes = openingVes + salesCashVes;

        if (currentSession.cashMovements) {
            const cashInUsd = currentSession.cashMovements
                .filter(m => m.type === 'in' && m.currency === 'USD')
                .reduce((acc, m) => acc + m.amount, 0);
            const cashOutUsd = currentSession.cashMovements
                .filter(m => m.type === 'out' && m.currency === 'USD')
                .reduce((acc, m) => acc + m.amount, 0);

            const cashInVes = currentSession.cashMovements
                .filter(m => m.type === 'in' && m.currency === 'VES')
                .reduce((acc, m) => acc + m.amount, 0);
            const cashOutVes = currentSession.cashMovements
                .filter(m => m.type === 'out' && m.currency === 'VES')
                .reduce((acc, m) => acc + m.amount, 0);

            totalUsd += (cashInUsd - cashOutUsd);
            totalVes += (cashInVes - cashOutVes);
        }

        setExpectedUsd(totalUsd);
        setExpectedVes(totalVes);

    }, [currentSession]);

    // Effect to refresh session ONCE when drawer opens
    useEffect(() => {
        if (open && hasActiveSession) {
            refreshSession();
        }
    }, [open]); // Only run when open state changes

    // Effect to recalculate totals when session data changes
    useEffect(() => {
        if (open && hasActiveSession && currentSession) {
            calculateExpected();
        }
    }, [currentSession, calculateExpected, open, hasActiveSession]);

    // Handle Closing Logic Inputs
    const diffUsd = (parseFloat(closingData.closingAmountUsd) || 0) - expectedUsd;
    const diffVes = (parseFloat(closingData.closingAmountVes) || 0) - expectedVes;

    const getDiffBadgeColor = (diff) => {
        if (Math.abs(diff) < 0.01) return 'text-green-600 bg-green-100';
        if (diff > 0) return 'text-blue-600 bg-blue-100';
        return 'text-red-600 bg-red-100';
    };

    const handleConfirmUsdCount = (total, counts) => {
        setClosingData(prev => ({ ...prev, closingAmountUsd: total.toString() }));
        setBreakdownUsd(counts);
    };

    const handleConfirmVesCount = (total, counts) => {
        setClosingData(prev => ({ ...prev, closingAmountVes: total.toString() }));
        setBreakdownVes(counts);
    };

    const handleOpenSession = async () => {
        try {
            setLoading(true);
            const payload = {
                registerName: openingData.registerName,
                openingAmountUsd: parseFloat(openingData.openingAmountUsd) || 0,
                openingAmountVes: parseFloat(openingData.openingAmountVes) || 0,
                openingNotes: openingData.openingNotes,
                workShift: openingData.workShift
            };

            await fetchApi('/cash-register/sessions/open', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            toast.success('Caja abierta exitosamente');
            setOpen(false);
            refreshSession();
            setOpeningData({
                registerName: 'Caja Principal',
                openingAmountUsd: '',
                openingAmountVes: '',
                openingNotes: '',
                workShift: 'morning'
            });

        } catch (error) {
            toast.error(error.message || 'Error al abrir caja');
        } finally {
            setLoading(false);
        }
    };

    // Enviar cierre
    const handleClose = async () => {
        // ... (validation)

        try {
            setLoading(true);

            // ... (mapping logic)

            const payload = {
                sessionId: currentSession._id,
                closingAmountUsd: parseFloat(closingData.closingAmountUsd) || 0,
                closingAmountVes: parseFloat(closingData.closingAmountVes) || 0,
                closingNotes: closingData.closingNotes,
                // Best effort to get exchange rate, or let backend handle/default it
                exchangeRate: 0
            };

            // Try to get exchange rate if possible, or use one from session
            try {
                const rateData = await fetchApi('/exchange-rate/bcv');
                if (rateData?.rate) payload.exchangeRate = rateData.rate;
            } catch (e) {
                console.warn('Could not fetch exchange rate for closing', e);
            }

            const response = await fetchApi(`/cash-register/sessions/${currentSession._id}/close`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            toast.success('Caja cerrada exitosamente');
            refreshSession();
            setLastClosingId(response?.closingId || response?._id); // Capture ID
            // setOpen(false); // REMOVED: Do not auto-close
            // navigate('/cash-register'); // REMOVED: Do not auto-navigate

        } catch (error) {
            // ... (error handling)
        } finally {
            setLoading(false);
        }
    };

    // Helper para descargar blob
    const downloadBlob = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handlePrintClosing = async () => {
        if (!lastClosingId) return;
        try {
            const token = localStorage.getItem('accessToken');
            const baseUrl = import.meta.env.VITE_API_URL || 'https://api.smartkubik.com/api/v1';

            const response = await fetch(`${baseUrl}/cash-register/closings/${lastClosingId}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ format: 'pdf' })
            });

            if (!response.ok) throw new Error('Error al generar PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);

        } catch (error) {
            toast.error('Error al imprimir ticket');
        }
    };

    const handleExportClosing = async (format) => {
        if (!lastClosingId) return;
        try {
            const token = localStorage.getItem('accessToken');
            const baseUrl = import.meta.env.VITE_API_URL || 'https://api.smartkubik.com/api/v1';

            const response = await fetch(`${baseUrl}/cash-register/closings/${lastClosingId}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ format })
            });

            if (!response.ok) throw new Error('Error al exportar');

            const blob = await response.blob();
            const extension = format === 'excel' ? 'xlsx' : 'pdf';
            const filename = `cierre-${lastClosingId}.${extension}`;

            if (format === 'pdf') {
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                downloadBlob(blob, filename);
            }

            toast.success(`Exportación generada en formato ${format.toUpperCase()}`);
        } catch (error) {
            toast.error('Error al exportar cierre');
        }
    };

    return (
        <Sheet open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setLastClosingId(null);
        }}>
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
                        {lastClosingId ? 'Cierre Exitoso' : (hasActiveSession ? 'Cierre de Caja Rápido' : 'Apertura de Caja')}
                    </SheetTitle>
                    <SheetDescription>
                        {lastClosingId
                            ? 'Operación completada correctamente'
                            : (hasActiveSession
                                ? `${currentSession?.registerName} - ${currentSession?.cashierName}`
                                : 'Ingresa los datos iniciales para abrir una nueva sesión de caja')
                        }
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 px-6 space-y-6">
                    {lastClosingId ? (
                        // ===== VISTA DE ÉXITO =====
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">✅</span>
                                </div>
                                <h3 className="text-lg font-bold text-green-700">¡Caja Cerrada Exitosamente!</h3>
                                <p className="text-sm text-muted-foreground">
                                    El cierre se ha registrado correctamente.
                                    <br />ID: #{lastClosingId?.slice(-6)}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Button variant="outline" className="w-full" onClick={handlePrintClosing}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Imprimir Ticket
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => handleExportClosing('pdf')}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Descargar PDF
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => handleExportClosing('excel')}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar Excel
                                </Button>
                                <Button variant="secondary" className="w-full" onClick={() => navigate(`/cash-register?tab=history&closingId=${lastClosingId}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver Detalle
                                </Button>
                            </div>

                            <Button className="w-full" onClick={() => {
                                setOpen(false);
                                setLastClosingId(null);
                            }}>
                                Finalizar
                            </Button>
                        </div>
                    ) : !hasActiveSession ? (
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
        </Sheet >
    );
}
