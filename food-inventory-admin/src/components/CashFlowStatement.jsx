import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CashFlowStatement = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dates, setDates] = useState({
        from: new Date().toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    });

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await fetchApi(`/accounting/reports/cash-flow-statement?from=${dates.from}&to=${dates.to}`);
            setReportData(response);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const handleDateChange = (e) => {
        setDates({ ...dates, [e.target.name]: e.target.value });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cash Flow Statement</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex space-x-4 mb-4">
                    <input type="date" name="from" value={dates.from} onChange={handleDateChange} className="p-2 border rounded"/>
                    <input type="date" name="to" value={dates.to} onChange={handleDateChange} className="p-2 border rounded"/>
                    <button onClick={fetchReport} className="p-2 bg-blue-500 text-white rounded">Generate Report</button>
                </div>
                {loading && <div>Loading...</div>}
                {error && <div>Error: {error}</div>}
                {reportData && (
                    <div>
                        <h3 className="text-lg font-bold">Cash Inflows: {reportData.cashInflows.total}</h3>
                        <h3 className="text-lg font-bold">Cash Outflows: {reportData.cashOutflows.total}</h3>
                        <h3 className="text-xl font-bold">Net Cash Flow: {reportData.netCashFlow}</h3>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CashFlowStatement;
