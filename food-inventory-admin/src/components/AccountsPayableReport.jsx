import React, { useState, useEffect } from 'react';
import { getPayables } from '../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AccountsPayableReport = () => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await getPayables();
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
        return <div className="text-muted-foreground">Cargando...</div>;
    }

    if (error) {
        return <div className="text-destructive">Error: {error}</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reporte de Cuentas por Pagar</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead># de Cuenta por Pagar</TableHead>
                            <TableHead>Beneficiario</TableHead>
                            <TableHead>Fecha de Emisión</TableHead>
                            <TableHead>Fecha de Vencimiento</TableHead>
                            <TableHead>Monto Total</TableHead>
                            <TableHead>Monto Pagado</TableHead>
                            <TableHead>Saldo</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.map((row) => (
                            <TableRow key={row.payableNumber}>
                                <TableCell>{row.payableNumber}</TableCell>
                                <TableCell>{row.payeeName}</TableCell>
                                <TableCell>{new Date(row.issueDate).toLocaleDateString()}</TableCell>
                                <TableCell>{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
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

export default AccountsPayableReport;
