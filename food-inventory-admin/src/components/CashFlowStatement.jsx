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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Estado de Flujo de Caja</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex space-x-4 mb-4 items-center">
                    <label htmlFor="from">Desde:</label>
                    <input id="from" type="date" name="from" value={dates.from} onChange={handleDateChange} className="p-2 border rounded"/>
                    <label htmlFor="to">Hasta:</label>
                    <input id="to" type="date" name="to" value={dates.to} onChange={handleDateChange} className="p-2 border rounded"/>
                    <button onClick={fetchReport} className="p-2 bg-blue-500 text-white rounded" disabled={loading}>
                        {loading ? 'Generando...' : 'Generar Reporte'}
                    </button>
                </div>
                {loading && <div>Cargando...</div>}
                {error && <div className="text-red-500">Error: {error}</div>}
                {reportData && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/50">
                            <h3 className="text-lg font-bold text-green-500">Entradas de Efectivo</h3>
                            <span className="text-lg font-bold text-green-500">${reportData.cashInflows.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/50">
                            <h3 className="text-lg font-bold text-red-500">Salidas de Efectivo</h3>
                            <span className="text-lg font-bold text-red-500">${reportData.cashOutflows.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 border-2 rounded-lg">
                            <h3 className="text-xl font-bold text-foreground">Flujo de Caja Neto</h3>
                            <span className="text-xl font-bold text-foreground">${reportData.netCashFlow.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CashFlowStatement;