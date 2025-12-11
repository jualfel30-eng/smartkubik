import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Receipt,
  Landmark,
  Sparkles,
  Info,
} from "lucide-react";
import { fetchJournalEntries, fetchSalesBook } from '../../lib/api';
import { format } from 'date-fns';

const BillingComplianceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAutomatic: 0,
    totalManual: 0,
    recentAutomatic: [],
    salesBookEntries: 0,
    validationIssues: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch automatic journal entries
      const automaticEntries = await fetchJournalEntries(1, 10, true);

      // Fetch manual journal entries (just for count)
      const manualEntries = await fetchJournalEntries(1, 1, false);

      // Fetch current month's sales book
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const salesBook = await fetchSalesBook({
        month: currentMonth,
        year: currentYear,
        limit: 100,
      });

      // Analyze sales book for validation issues
      const validationIssues = [];
      if (salesBook.data) {
        salesBook.data.forEach((entry) => {
          if (!entry.customerRif || entry.customerRif === 'J-00000000-0') {
            validationIssues.push({
              type: 'warning',
              message: `Factura ${entry.invoiceNumber}: RIF inválido o genérico`,
            });
          }
          if (!entry.invoiceControlNumber) {
            validationIssues.push({
              type: 'error',
              message: `Factura ${entry.invoiceNumber}: Falta número de control SENIAT`,
            });
          }
        });
      }

      setStats({
        totalAutomatic: automaticEntries.total || 0,
        totalManual: manualEntries.total || 0,
        recentAutomatic: automaticEntries.data || [],
        salesBookEntries: salesBook.total || 0,
        validationIssues: validationIssues.slice(0, 5), // Top 5 issues
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalEntries = stats.totalAutomatic + stats.totalManual;
  const automaticPercentage = totalEntries > 0 ? (stats.totalAutomatic / totalEntries) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Landmark className="h-8 w-8" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard de Integración Billing-Contabilidad</h2>
          <p className="text-muted-foreground">
            Monitoreo de asientos automáticos y cumplimiento SENIAT
          </p>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          <Progress value={66} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">Cargando datos...</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asientos Automáticos</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAutomatic}</div>
            <div className="mt-2 space-y-1">
              <Progress value={automaticPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {automaticPercentage.toFixed(1)}% del total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asientos Manuales</CardTitle>
            <Receipt className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalManual}</div>
            <p className="text-xs text-muted-foreground">
              Creados manualmente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Libro de Ventas (Mes)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.salesBookEntries}</div>
            <p className="text-xs text-muted-foreground">
              Facturas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Compliance</CardTitle>
            {stats.validationIssues.length === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.validationIssues.length === 0 ? (
                <span className="text-green-500">OK</span>
              ) : (
                <span className="text-yellow-500">{stats.validationIssues.length}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.validationIssues.length === 0
                ? 'Sin problemas detectados'
                : `${stats.validationIssues.length} alertas`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Validation Issues */}
      {stats.validationIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Alertas de Validación SENIAT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.validationIssues.map((issue, index) => (
              <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                {issue.type === 'error' ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>{issue.message}</AlertDescription>
              </Alert>
            ))}
            {stats.validationIssues.length >= 5 && (
              <p className="text-sm text-muted-foreground">
                Mostrando las primeras 5 alertas. Revise el Libro de Ventas para más detalles.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Automatic Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Asientos Automáticos Recientes
          </CardTitle>
          <CardDescription>
            Generados automáticamente por la integración Billing-Contabilidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentAutomatic.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No hay asientos automáticos registrados aún. Los asientos se crean automáticamente cuando se emite una factura.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Débitos</TableHead>
                    <TableHead className="text-right">Créditos</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentAutomatic.map((entry) => {
                    const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
                    const totalCredit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
                    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

                    return (
                      <TableRow key={entry._id}>
                        <TableCell>
                          {format(new Date(entry.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{entry.description}</p>
                            <Badge variant="secondary" className="text-xs">
                              Automático
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          Bs. {totalDebit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          Bs. {totalCredit.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {isBalanced ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Balanceado
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Desbalanceado
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>¿Cómo funciona la integración?</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-1 text-sm">
            Cuando se emite una factura en el módulo de Billing, automáticamente se:
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Crea un asiento contable (Débito: Cuentas por Cobrar, Crédito: Ingresos + IVA)</li>
              <li>Registra la factura en el Libro de Ventas IVA</li>
              <li>Valida el RIF del cliente y número de control SENIAT</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default BillingComplianceDashboard;
