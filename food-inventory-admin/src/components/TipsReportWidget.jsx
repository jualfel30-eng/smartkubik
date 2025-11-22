import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getTipsReport } from '@/lib/api';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, Users, Calendar, Banknote, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TipsReportWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30d');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let params = {};

      // Calcular fechas según el rango seleccionado
      const today = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case '7d':
          startDate.setDate(today.getDate() - 7);
          break;
        case '14d':
          startDate.setDate(today.getDate() - 14);
          break;
        case '30d':
          startDate.setDate(today.getDate() - 30);
          break;
        case '60d':
          startDate.setDate(today.getDate() - 60);
          break;
        case '90d':
          startDate.setDate(today.getDate() - 90);
          break;
        default:
          startDate.setDate(today.getDate() - 30);
      }

      params.startDate = startDate.toISOString();
      params.endDate = today.toISOString();

      const response = await getTipsReport(params);
      if (response.success) {
        setData(response.data);
      } else {
        toast.error('Error al cargar reporte de propinas', { description: response.message });
      }
    } catch (error) {
      toast.error('Error de red', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getDateRangeLabel = () => {
    const labels = {
      '7d': 'Últimos 7 días',
      '14d': 'Últimos 14 días',
      '30d': 'Últimos 30 días',
      '60d': 'Últimos 60 días',
      '90d': 'Últimos 90 días',
    };
    return labels[dateRange] || 'Últimos 30 días';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Reporte de Propinas</CardTitle>
            <CardDescription className="mt-1">
              Distribución de propinas por empleado
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['7d', '14d', '30d', '60d', '90d'].map((range) => (
              <Button
                key={range}
                size="sm"
                variant={dateRange === range ? 'default' : 'outline'}
                onClick={() => setDateRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm font-medium">Total Propinas</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(data.summary.totalTips)}
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-sm font-medium">Promedio por Orden</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(data.summary.averageTipPerOrder)}
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <Users className="h-5 w-5" />
                  <span className="text-sm font-medium">Empleados</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {data.summary.employeesCount}
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="text-sm font-medium">Órdenes con Propina</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {data.summary.totalOrders}
                </div>
              </div>
            </div>

            {/* Period Info */}
            <div className="text-center text-sm text-gray-500 py-2 border-y">
              <span className="font-medium">{getDateRangeLabel()}</span>
              {' • '}
              {new Date(data.period.from).toLocaleDateString('es-VE')} -{' '}
              {new Date(data.period.to).toLocaleDateString('es-VE')}
            </div>

            {/* Employees Table */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Propinas por Empleado</h3>
              {data.employees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay datos de propinas para el período seleccionado</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Empleado</TableHead>
                        <TableHead className="text-right font-bold">Total Propinas</TableHead>
                        <TableHead className="text-right font-bold">Órdenes</TableHead>
                        <TableHead className="text-right font-bold">Promedio</TableHead>
                        <TableHead className="text-right font-bold">
                          <div className="flex items-center justify-end gap-1">
                            <Banknote className="h-4 w-4" />
                            <span>Efectivo</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-right font-bold">
                          <div className="flex items-center justify-end gap-1">
                            <CreditCard className="h-4 w-4" />
                            <span>Tarjeta</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.employees.map((employee, index) => (
                        <TableRow key={employee.employeeId} className={index === 0 ? 'bg-yellow-50' : ''}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {index === 0 && (
                                <Badge className="bg-yellow-500 text-white">
                                  Top 1
                                </Badge>
                              )}
                              <span>{employee.employeeName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-700">
                            {formatCurrency(employee.totalTips)}
                          </TableCell>
                          <TableCell className="text-right">
                            {employee.ordersServed}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(employee.averageTip)}
                          </TableCell>
                          <TableCell className="text-right text-gray-600">
                            {formatCurrency(employee.cashTips)}
                          </TableCell>
                          <TableCell className="text-right text-gray-600">
                            {formatCurrency(employee.cardTips)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Tips Distribution Chart (simple text-based for now) */}
            {data.employees.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold mb-3 text-gray-700">
                  Distribución de Propinas
                </h4>
                <div className="space-y-2">
                  {data.employees.slice(0, 5).map((employee) => {
                    const percentage = (employee.totalTips / data.summary.totalTips) * 100;
                    return (
                      <div key={employee.employeeId}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 font-medium">
                            {employee.employeeName}
                          </span>
                          <span className="text-gray-600">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay datos disponibles</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TipsReportWidget;
