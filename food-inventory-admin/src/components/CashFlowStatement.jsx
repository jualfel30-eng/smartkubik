import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useAccountingContext } from '@/context/AccountingContext';
import { Skeleton } from "@/components/ui/skeleton";

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
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Estado de Flujo de Caja</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={!reportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                </Button>
            </CardHeader>
            <CardContent>
                {/* Date range controls */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
                    <div className="flex-1 sm:max-w-[180px]">
                        <Label htmlFor="cf-from" className="text-xs">Desde</Label>
                        <Input id="cf-from" type="date" name="from" value={dates.from} onChange={handleDateChange} />
                    </div>
                    <div className="flex-1 sm:max-w-[180px]">
                        <Label htmlFor="cf-to" className="text-xs">Hasta</Label>
                        <Input id="cf-to" type="date" name="to" value={dates.to} onChange={handleDateChange} />
                    </div>
                    <Button onClick={fetchReport} disabled={loading} size="sm">
                        {loading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generando...</> : 'Generar Reporte'}
                    </Button>
                </div>

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-4">
                        <Skeleton className="h-20 w-full rounded-lg" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-40 w-full rounded-lg" />
                            <Skeleton className="h-40 w-full rounded-lg" />
                        </div>
                    </div>
                )}

                {error && <div className="text-destructive text-sm">Error: {error}</div>}

                {!loading && reportData && (
                    <div className="space-y-4">
                        {/* Net Cash Flow hero card */}
                        <Card className={`border-2 ${reportData.netCashFlow >= 0 ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30'}`}>
                            <CardContent className="flex justify-between items-center py-4">
                                <div className="flex items-center gap-2">
                                    {reportData.netCashFlow >= 0
                                        ? <TrendingUp className="h-5 w-5 text-emerald-600" />
                                        : <TrendingDown className="h-5 w-5 text-red-600" />
                                    }
                                    <span className="text-lg font-semibold">Flujo de Caja Neto</span>
                                </div>
                                <span className={`text-2xl font-bold ${reportData.netCashFlow >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                    ${reportData.netCashFlow.toFixed(2)}
                                </span>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Inflows */}
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Entradas de Efectivo</span>
                                        </div>
                                        <Badge variant="outline" className="font-mono">${reportData.cashInflows.total.toFixed(2)}</Badge>
                                    </div>
                                    {reportData.inflowBreakdown && reportData.inflowBreakdown.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Desglose por metodo</p>
                                            {reportData.inflowBreakdown.map((item, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="capitalize">{item.method}</span>
                                                        <span className="font-mono text-xs">${item.total.toFixed(2)}</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Outflows */}
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <TrendingDown className="h-4 w-4 text-red-600" />
                                            <span className="font-semibold text-red-700 dark:text-red-400">Salidas de Efectivo</span>
                                        </div>
                                        <Badge variant="outline" className="font-mono">${reportData.cashOutflows.total.toFixed(2)}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-3">Pagos a proveedores y gastos registrados.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CashFlowStatement;
