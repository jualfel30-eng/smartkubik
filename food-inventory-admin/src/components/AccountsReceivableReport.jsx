import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AccountsReceivableReport = () => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await fetchApi('/accounting/reports/accounts-receivable');
                setReportData(response.data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Accounts Receivable Report</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order Number</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Order Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Paid Amount</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.map((row) => (
                            <TableRow key={row.orderNumber}>
                                <TableCell>{row.orderNumber}</TableCell>
                                <TableCell>{row.customerName}</TableCell>
                                <TableCell>{new Date(row.orderDate).toLocaleDateString()}</TableCell>
                                <TableCell>{new Date(row.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell>{row.totalAmount}</TableCell>
                                <TableCell>{row.paidAmount}</TableCell>
                                <TableCell>{row.balance}</TableCell>
                                <TableCell>{row.status}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default AccountsReceivableReport;
