import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const AccountsReceivableReport = () => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await fetchApi('/accounting/reports/accounts-receivable');
                setReportData(response || []);
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
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/accounting-management')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle>Cuentas por Cobrar</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead># Orden</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha Orden</TableHead>
                            <TableHead>Fecha Vencimiento</TableHead>
                            <TableHead>Monto Total</TableHead>
                            <TableHead>Monto Pagado</TableHead>
                            <TableHead>Saldo</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.length > 0 ? (
                            reportData.map((row) => (
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
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan="8" className="text-center">No hay datos disponibles.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default AccountsReceivableReport;
