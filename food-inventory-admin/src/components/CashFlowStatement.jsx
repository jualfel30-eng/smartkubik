import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccountingContext } from '@/context/AccountingContext';

const CashFlowStatement = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dates, setDates] = useState({
        from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    });

    const { refreshKey } = useAccountingContext();

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetchApi(`/accounting/reports/cash-flow-statement?from=${dates.from}&to=${dates.to}`);
            setReportData(response);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [dates]);

    useEffect(() => {
        fetchReport();
    }, [refreshKey, fetchReport]);

    const handleDateChange = (e) => {
        setDates({ ...dates, [e.target.name]: e.target.value });
    };

    const handleExport = () => {
        if (!reportData) return;

        const headers = ["Concepto", "Monto", "Detalle"];
        const rows = [];

        // Inflows
        rows.push(["Entradas de Efectivo", reportData.cashInflows.total.toFixed(2), "Total"]);
        if (reportData.inflowBreakdown) {
            reportData.inflowBreakdown.forEach(item => {
                rows.push(["", item.total.toFixed(2), `Método: ${item.method} (${item.percentage}%)`]);
            });
        }

        // Outflows
        rows.push(["Salidas de Efectivo", reportData.cashOutflows.total.toFixed(2), "Total"]);

        // Net
        rows.push(["Flujo de Caja Neto", reportData.netCashFlow.toFixed(2), ""]);

        // CSV Content
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        // Download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `flujo_caja_${dates.from}_${dates.to}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Estado de Flujo de Caja</CardTitle>
                    <button
                        onClick={handleExport}
                        disabled={!reportData}
                        className="p-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                        Exportar CSV
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-4 gap-4 sm:gap-0">
                    <div className="flex items-center w-full sm:w-auto">
                        <label htmlFor="from" className="mr-2 text-foreground">Desde:</label>
                        <input id="from" type="date" name="from" value={dates.from} onChange={handleDateChange} className="p-2 border dark:border-gray-600 rounded flex-grow bg-background text-foreground" />
                    </div>
                    <div className="flex items-center w-full sm:w-auto">
                        <label htmlFor="to" className="mr-2 text-foreground">Hasta:</label>
                        <input id="to" type="date" name="to" value={dates.to} onChange={handleDateChange} className="p-2 border dark:border-gray-600 rounded flex-grow bg-background text-foreground" />
                    </div>
                    <div className="w-full sm:w-auto">
                        <button onClick={fetchReport} className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded w-full" disabled={loading}>
                            {loading ? 'Generando...' : 'Generar Reporte'}
                        </button>
                    </div>
                </div>
                {loading && <div className="text-muted-foreground">Cargando...</div>}
                {error && <div className="text-destructive">Error: {error}</div>}
                {reportData && (
                    <div className="space-y-4">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 border-2 dark:border-gray-600 rounded-lg bg-card shadow-sm">
                                <h3 className="text-xl font-bold text-foreground">Flujo de Caja Neto</h3>
                                <span className={`text-2xl font-bold ${reportData.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    ${reportData.netCashFlow.toFixed(2)}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border dark:border-gray-700 rounded-lg bg-muted/30">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Entradas de Efectivo</h3>
                                        <span className="text-lg font-bold">${reportData.cashInflows.total.toFixed(2)}</span>
                                    </div>
                                    {reportData.inflowBreakdown && reportData.inflowBreakdown.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Desglose por método</h4>
                                            {reportData.inflowBreakdown.map((item, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="capitalize">{item.method}</span>
                                                        <span className="font-mono">${item.total.toFixed(2)}</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 rounded-full"
                                                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border dark:border-gray-700 rounded-lg bg-muted/30 h-fit">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Salidas de Efectivo</h3>
                                        <span className="text-lg font-bold">${reportData.cashOutflows.total.toFixed(2)}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">Pagos a proveedores y gastos registrados.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card >
    );
};

export default CashFlowStatement;
