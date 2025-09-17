import React, { useState } from 'react';
import { fetchBalanceSheetReport } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);
};

const ReportSection = ({ title, data }) => (
  <Card className="flex-1">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Código</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.accounts.map((acc) => (
            <TableRow key={acc.code}>
              <TableCell className="font-mono">{acc.code}</TableCell>
              <TableCell>{acc.name}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(acc.balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="text-right font-bold">Total {title}</TableCell>
            <TableCell className="text-right font-bold font-mono">{formatCurrency(data.total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </CardContent>
  </Card>
);

const BalanceSheetView = () => {
  const [date, setDate] = useState(new Date());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);
    try {
      const asOfDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const data = await fetchBalanceSheetReport(asOfDate);
      setReportData(data);
    } catch (err) {
      setError(err.message || 'Ocurrió un error al generar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 p-4 border rounded-lg">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={es} />
          </PopoverContent>
        </Popover>
        <Button onClick={handleGenerateReport} disabled={loading}>
          {loading ? 'Generando...' : 'Generar Reporte'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="flex space-x-4">
            <Skeleton className="h-64 w-1/2" />
            <Skeleton className="h-64 w-1/2" />
          </div>
        </div>
      )}

      {reportData && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <ReportSection title="Activos" data={reportData.assets} />
            <div className="flex-1 space-y-4">
              <ReportSection title="Pasivos" data={reportData.liabilities} />
              <ReportSection title="Patrimonio" data={reportData.equity} />
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Verificación</CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-sm">
              <p>Total Pasivos + Patrimonio: {formatCurrency(reportData.verification.totalLiabilitiesAndEquity)}</p>
              <p>Total Activos: {formatCurrency(reportData.assets.total)}</p>
              <p className={cn(
                "font-bold", 
                Math.abs(reportData.verification.difference) > 0.01 ? 'text-destructive' : 'text-green-600'
              )}>
                Diferencia: {formatCurrency(reportData.verification.difference)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BalanceSheetView;