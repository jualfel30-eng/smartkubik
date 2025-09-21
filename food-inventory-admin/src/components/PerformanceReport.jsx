import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getPerformanceReport } from '@/lib/api';
import { toast } from 'sonner';

const PerformanceReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date());

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getPerformanceReport(date);
      if (response.success) {
        setData(response.data);
        if (response.data.length === 0) {
          toast.info('No se encontraron datos de rendimiento para la fecha seleccionada.');
        }
      } else {
        toast.error('Error al cargar el reporte', { description: response.message });
      }
    } catch (error) {
      toast.error('Error de red', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Reporte de Rendimiento por Empleado</CardTitle>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className="w-[280px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Cargando datos del reporte...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead className="text-right">Ventas Totales</TableHead>
                <TableHead className="text-right">N° de Órdenes</TableHead>
                <TableHead className="text-right">Horas Trabajadas</TableHead>
                <TableHead className="text-right">Ventas por Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.userName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalSales)}</TableCell>
                  <TableCell className="text-right">{row.numberOfOrders}</TableCell>
                  <TableCell className="text-right">{row.totalHoursWorked.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(row.salesPerHour)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-8">No hay datos para la fecha seleccionada.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceReport;
