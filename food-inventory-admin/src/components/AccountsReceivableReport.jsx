
import React, { useState, useEffect } from 'react';
import { getAccountsReceivableReport } from '../lib/api'; // We will create this function
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { toast } from 'sonner';

const AccountsReceivableReport = () => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const response = await getAccountsReceivableReport();
        setReportData(response);
      } catch (error) {
        console.error("Error fetching A/R report:", error);
        toast.error('Error al cargar el informe de cuentas por cobrar.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (isLoading) {
    return <div>Cargando informe...</div>;
  }

  if (!reportData) {
    return <div>No se pudieron cargar los datos del informe.</div>;
  }

  const { data, totals, asOfDate } = reportData;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Informe de Antigüedad de Cuentas por Cobrar</CardTitle>
          <p className="text-sm text-muted-foreground">Mostrando saldos a fecha de {asOfDate}</p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalDue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corriente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.current)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">1-30 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals['1-30'])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">31-60 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals['31-60'])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">61-90 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals['61-90'])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">+90 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals['>90'])}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Corriente</TableHead>
                <TableHead className="text-right">1-30</TableHead>
                <TableHead className="text-right">31-60</TableHead>
                <TableHead className="text-right">61-90</TableHead>
                <TableHead className="text-right">+90</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.customerId}>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalDue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.current)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row['1-30'])}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row['31-60'])}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row['61-90'])}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row['>90'])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsReceivableReport;
