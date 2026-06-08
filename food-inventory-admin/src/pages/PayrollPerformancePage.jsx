import React from 'react';
import PerformanceReport from '@/components/PerformanceReport';

/**
 * Página de Rendimiento por Empleado dentro del módulo de RRHH/Payroll.
 *
 * Muestra la tabla detallada con selector de fecha específica:
 * Ventas Totales, N° de Órdenes, Horas Trabajadas, Ventas por Hora.
 *
 * Complementa al EmployeePerformanceChart del Dashboard (vista gráfica
 * agregada por período) con detalle tabular filtrable por día.
 */
const PayrollPerformancePage = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <PerformanceReport />
    </div>
  );
};

export default PayrollPerformancePage;
